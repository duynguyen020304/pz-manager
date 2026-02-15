import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Snapshot, SnapshotManifest, ServerStats, ScheduleStats, RestoreJob } from '@/types';
import { loadConfig } from './config-manager';
import { BACKUP_SCRIPTS_PATH } from './paths';
import {
  directoryExists,
  readJson,
  formatSize,
  formatTimestamp,
  listDirectories
} from './file-utils';

const execAsync = promisify(exec);

// In-memory job store (replace with Redis/DB for production)
const jobs = new Map<string, RestoreJob>();

export async function listSnapshots(
  serverName: string, 
  scheduleFilter?: string
): Promise<Snapshot[]> {
  const config = await loadConfig();
  const snapshotsPath = config.snapshotsPath;
  const snapshots: Snapshot[] = [];
  
  const schedules = scheduleFilter 
    ? [scheduleFilter]
    : config.schedules.map(s => s.name);
  
  for (const schedule of schedules) {
    const serverPath = path.join(snapshotsPath, schedule, serverName);
    
    if (!await directoryExists(serverPath)) {
      continue;
    }
    
    const entries = await listDirectories(serverPath);
    
    for (const timestamp of entries) {
      const snapshotPath = path.join(serverPath, timestamp);
      const manifestPath = path.join(snapshotPath, 'manifest.json');
      
      const manifest = await readJson<SnapshotManifest>(manifestPath);
      const created = parseTimestamp(timestamp);
      
      snapshots.push({
        schedule,
        timestamp,
        path: snapshotPath,
        created,
        size: manifest?.sizeBytes || 0,
        fileCount: manifest?.fileCount || 0,
        formattedSize: formatSize(manifest?.sizeBytes || 0),
        formattedTimestamp: formatTimestamp(timestamp),
        server: serverName,
        manifest: manifest || undefined
      });
    }
  }
  
  // Sort by date, newest first
  return snapshots.sort((a, b) => b.created.getTime() - a.created.getTime());
}

export async function getSnapshotInfo(snapshotPath: string): Promise<Snapshot | null> {
  try {
    const manifestPath = path.join(snapshotPath, 'manifest.json');
    const manifest = await readJson<SnapshotManifest>(manifestPath);
    
    if (!manifest) {
      return null;
    }
    
    const parts = snapshotPath.split(path.sep);
    const timestamp = parts[parts.length - 1];
    const server = parts[parts.length - 2];
    const schedule = parts[parts.length - 3];
    
    return {
      schedule,
      timestamp,
      path: snapshotPath,
      created: parseTimestamp(timestamp),
      size: manifest.sizeBytes,
      fileCount: manifest.fileCount,
      formattedSize: formatSize(manifest.sizeBytes),
      formattedTimestamp: formatTimestamp(timestamp),
      server,
      manifest
    };
  } catch {
    return null;
  }
}

export async function getServerStats(serverName: string): Promise<ServerStats> {
  const snapshots = await listSnapshots(serverName);
  
  const bySchedule = new Map<string, { count: number; size: number }>();
  
  for (const snapshot of snapshots) {
    const current = bySchedule.get(snapshot.schedule) || { count: 0, size: 0 };
    current.count++;
    current.size += snapshot.size;
    bySchedule.set(snapshot.schedule, current);
  }
  
  const totalSize = snapshots.reduce((sum, s) => sum + s.size, 0);
  
  const scheduleStats: ScheduleStats[] = Array.from(bySchedule.entries()).map(
    ([schedule, stats]) => ({
      schedule,
      count: stats.count,
      size: stats.size,
      formattedSize: formatSize(stats.size)
    })
  );
  
  return {
    totalSnapshots: snapshots.length,
    totalSize,
    formattedTotalSize: formatSize(totalSize),
    bySchedule: scheduleStats
  };
}

export async function restoreSnapshot(
  serverName: string, 
  snapshotPath: string
): Promise<string> {
  const jobId = `restore-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const job: RestoreJob = {
    id: jobId,
    serverName,
    snapshotPath,
    status: 'pending',
    progress: 0,
    message: 'Initializing restore...',
    startedAt: new Date()
  };
  
  jobs.set(jobId, job);
  
  // Start restore process asynchronously
  executeRestore(jobId, serverName, snapshotPath);
  
  return jobId;
}

async function executeRestore(
  jobId: string, 
  serverName: string, 
  snapshotPath: string
): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) return;
  
  job.status = 'running';
  job.message = 'Starting restore operation...';
  job.progress = 10;

  try {
    const restoreScript = path.join(BACKUP_SCRIPTS_PATH, 'restore.sh');
    
    // Check if script exists
    try {
      await fs.access(restoreScript, fs.constants.X_OK);
    } catch {
      throw new Error('Restore script not found or not executable');
    }
    
    job.progress = 20;
    job.message = 'Executing restore script...';

    // Execute restore script with auto-confirmation (pipes "yes" to stdin)
    const { stderr } = await execAsync(
      `echo "yes" | "${restoreScript}" "${serverName}" "${snapshotPath}"`,
      { timeout: 300000 } // 5 minute timeout
    );
    
    if (stderr && !stderr.includes('warning')) {
      console.error('Restore stderr:', stderr);
    }
    
    job.progress = 100;
    job.status = 'completed';
    job.message = 'Restore completed successfully';
    job.completedAt = new Date();
    
  } catch (error) {
    job.status = 'failed';
    job.message = 'Restore failed';
    job.error = error instanceof Error ? error.message : 'Unknown error';
    job.completedAt = new Date();
    console.error('Restore error:', error);
  }
}

export function getJobStatus(jobId: string): RestoreJob | null {
  return jobs.get(jobId) || null;
}

export async function deleteSnapshot(snapshotPath: string): Promise<void> {
  try {
    await fs.rm(snapshotPath, { recursive: true, force: true });
  } catch (error) {
    console.error('Failed to delete snapshot:', error);
    throw new Error('Failed to delete snapshot');
  }
}

export async function createBackup(serverName: string, schedule: string): Promise<void> {
  try {
    const backupScript = path.join(BACKUP_SCRIPTS_PATH, 'backup.sh');
    
    await fs.access(backupScript, fs.constants.X_OK);
    
    const { stderr } = await execAsync(
      `"${backupScript}" "${serverName}" "${schedule}"`,
      { timeout: 300000 }
    );
    
    if (stderr && !stderr.includes('warning')) {
      console.error('Backup stderr:', stderr);
    }
  } catch (error) {
    console.error('Backup error:', error);
    throw new Error('Failed to create backup');
  }
}

function parseTimestamp(timestamp: string): Date {
  // Parse YYYYMMDD_HHMMSS format
  if (timestamp.length === 15 && timestamp[8] === '_') {
    const year = parseInt(timestamp.substring(0, 4), 10);
    const month = parseInt(timestamp.substring(4, 6), 10) - 1;
    const day = parseInt(timestamp.substring(6, 8), 10);
    const hour = parseInt(timestamp.substring(9, 11), 10);
    const minute = parseInt(timestamp.substring(11, 13), 10);
    const second = parseInt(timestamp.substring(13, 15), 10);
    
    return new Date(year, month, day, hour, minute, second);
  }
  
  return new Date();
}
