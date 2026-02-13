import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { Snapshot, SnapshotManifest, ApiResponse } from '@/types';
import { loadConfig } from '@/lib/config-manager';
import { requireAuth } from '@/lib/auth';
import { 
  directoryExists, 
  readJson, 
  listDirectories,
  formatSize,
  formatTimestamp 
} from '@/lib/file-utils';

interface SnapshotWithMetadata extends Snapshot {
  status: 'valid' | 'corrupt' | 'incomplete';
  integrity: {
    verified: boolean;
    checksumCount: number;
    hasAllChecksums: boolean;
  };
  compressionStats: {
    algorithm: string;
    level: number;
    compressionRatio?: number;
    originalSize?: number;
    compressedSize: number;
  };
  restoreOptions: {
    canRestore: boolean;
    serverExists: boolean;
    compatible: boolean;
    warnings: string[];
  };
  age: number;
  ageInDays: number;
}

interface PaginatedSnapshotsResponse {
  snapshots: SnapshotWithMetadata[];
  pagination: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
  summary: {
    totalSize: number;
    formattedTotalSize: string;
    averageSize: number;
    formattedAverageSize: string;
    compressionRatio: number;
    totalOriginalSize: number;
    formattedTotalOriginalSize: string;
  };
  filters: {
    server?: string;
    schedule?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

function parseTimestamp(timestamp: string): Date {
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

async function getOriginalSize(snapshotPath: string): Promise<number | null> {
  try {
    const entries = await fs.readdir(snapshotPath);
    const zstFiles = entries.filter(e => e.endsWith('.zst'));
    
    if (zstFiles.length === 0) return null;
    
    const stats = await Promise.all(
      zstFiles.map(async (file) => {
        try {
          const filePath = path.join(snapshotPath, file);
          const stat = await fs.stat(filePath);
          return stat.size;
        } catch {
          return 0;
        }
      })
    );
    
    return stats.reduce((sum, size) => sum + size, 0);
  } catch {
    return null;
  }
}

async function checkSnapshotIntegrity(
  snapshotPath: string, 
  manifest: SnapshotManifest
): Promise<{ verified: boolean; checksumCount: number; hasAllChecksums: boolean }> {
  try {
    const entries = await fs.readdir(snapshotPath);
    const dataFiles = entries.filter(e => 
      !e.endsWith('.zst') && 
      e !== 'manifest.json' && 
      !e.startsWith('.')
    );
    
    const checksumCount = manifest.checksums ? Object.keys(manifest.checksums).length : 0;
    const hasAllChecksums = manifest.checksums ? dataFiles.every(f => f in manifest.checksums!) : false;
    
    return {
      verified: checksumCount > 0,
      checksumCount,
      hasAllChecksums
    };
  } catch {
    return {
      verified: false,
      checksumCount: 0,
      hasAllChecksums: false
    };
  }
}

async function checkRestoreOptions(
  snapshotPath: string,
  serverName: string,
  manifest: SnapshotManifest
): Promise<{ canRestore: boolean; serverExists: boolean; compatible: boolean; warnings: string[] }> {
  const warnings: string[] = [];
  
  const savesPath = '/root/Zomboid/Saves/Multiplayer';
  const serverPath = path.join(savesPath, serverName);
  const serverExists = await directoryExists(serverPath);
  
  const iniPath = `/root/Zomboid/Server/${serverName}.ini`;
  const iniExists = await fs.access(iniPath).then(() => true).catch(() => false);
  
  if (!iniExists) {
    warnings.push(`Server configuration file not found: ${serverName}.ini`);
  }
  
  if (serverExists) {
    const dbPath = `/root/Zomboid/db/${serverName}.db`;
    const dbExists = await fs.access(dbPath).then(() => true).catch(() => false);
    if (dbExists) {
      warnings.push('Existing database will be overwritten');
    }
  }
  
  const compatible = manifest.source && manifest.source.includes(serverName);
  if (!compatible) {
    warnings.push('Snapshot may not be compatible with this server');
  }
  
  return {
    canRestore: iniExists,
    serverExists,
    compatible: compatible || false,
    warnings
  };
}

async function getSnapshotStatus(
  snapshotPath: string,
  manifest: SnapshotManifest | null
): Promise<'valid' | 'corrupt' | 'incomplete'> {
  if (!manifest) return 'corrupt';
  
  try {
    const entries = await fs.readdir(snapshotPath);
    const hasManifest = entries.includes('manifest.json');
    const hasData = entries.some(e => !e.startsWith('.') && e !== 'manifest.json');
    
    if (!hasManifest) return 'corrupt';
    if (!hasData) return 'incomplete';
    
    return 'valid';
  } catch {
    return 'corrupt';
  }
}

async function collectAllSnapshots(
  serverFilter?: string,
  scheduleFilter?: string,
  dateFrom?: Date,
  dateTo?: Date
): Promise<SnapshotWithMetadata[]> {
  const config = await loadConfig();
  const snapshotsPath = config.snapshotsPath;
  const snapshots: SnapshotWithMetadata[] = [];
  
  const servers = serverFilter 
    ? [serverFilter]
    : config.servers;
  
  const schedules = scheduleFilter
    ? [scheduleFilter]
    : config.schedules.map(s => s.name);
  
  for (const schedule of schedules) {
    for (const server of servers) {
      const serverPath = path.join(snapshotsPath, schedule, server);
      
      if (!await directoryExists(serverPath)) {
        continue;
      }
      
      const entries = await listDirectories(serverPath);
      
      for (const timestamp of entries) {
        const created = parseTimestamp(timestamp);
        
        if (dateFrom && created < dateFrom) continue;
        if (dateTo && created > dateTo) continue;
        
        const snapshotPath = path.join(serverPath, timestamp);
        const manifestPath = path.join(snapshotPath, 'manifest.json');
        const manifest = await readJson<SnapshotManifest>(manifestPath);
        
        const status = await getSnapshotStatus(snapshotPath, manifest);
        const integrity = await checkSnapshotIntegrity(snapshotPath, manifest || { 
          timestamp, 
          source: '', 
          schedule, 
          fileCount: 0, 
          dirCount: 0, 
          sizeBytes: 0,
          compression: { algorithm: 'zstd', level: 3 }
        });
        
        const originalSize = await getOriginalSize(snapshotPath);
        const compressedSize = manifest?.sizeBytes || 0;
        const compressionRatio = originalSize && originalSize > 0 
          ? compressedSize / originalSize 
          : undefined;
        
        const restoreOptions = await checkRestoreOptions(snapshotPath, server, manifest || {
          timestamp,
          source: '',
          schedule,
          fileCount: 0,
          dirCount: 0,
          sizeBytes: 0,
          compression: { algorithm: 'zstd', level: 3 }
        });
        
        const now = new Date();
        const age = now.getTime() - created.getTime();
        const ageInDays = Math.floor(age / (1000 * 60 * 60 * 24));
        
        snapshots.push({
          schedule,
          timestamp,
          path: snapshotPath,
          created,
          size: compressedSize,
          fileCount: manifest?.fileCount || 0,
          formattedSize: formatSize(compressedSize),
          formattedTimestamp: formatTimestamp(timestamp),
          server,
          manifest: manifest || undefined,
          status,
          integrity,
          compressionStats: {
            algorithm: manifest?.compression?.algorithm || 'zstd',
            level: manifest?.compression?.level || 3,
            compressionRatio,
            originalSize: originalSize || undefined,
            compressedSize
          },
          restoreOptions,
          age,
          ageInDays
        });
      }
    }
  }
  
  return snapshots.sort((a, b) => b.created.getTime() - a.created.getTime());
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<PaginatedSnapshotsResponse>>> {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);
    
    const server = searchParams.get('server') || undefined;
    const schedule = searchParams.get('schedule') || undefined;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    
    const dateFromObj = dateFrom ? new Date(dateFrom) : undefined;
    const dateToObj = dateTo ? new Date(dateTo) : undefined;
    
    if (dateFrom && isNaN(dateFromObj?.getTime() || 0)) {
      return NextResponse.json(
        { success: false, error: 'Invalid dateFrom format. Use ISO 8601 format.' },
        { status: 400 }
      );
    }
    
    if (dateTo && isNaN(dateToObj?.getTime() || 0)) {
      return NextResponse.json(
        { success: false, error: 'Invalid dateTo format. Use ISO 8601 format.' },
        { status: 400 }
      );
    }
    
    const allSnapshots = await collectAllSnapshots(server, schedule, dateFromObj, dateToObj);
    
    const total = allSnapshots.length;
    const paginatedSnapshots = allSnapshots.slice(offset, offset + limit);
    const hasMore = offset + limit < total;
    
    const totalSize = allSnapshots.reduce((sum, s) => sum + s.size, 0);
    const totalOriginalSize = allSnapshots.reduce((sum, s) => 
      sum + (s.compressionStats.originalSize || s.size), 0
    );
    
    const compressionRatio = totalOriginalSize > 0 ? totalSize / totalOriginalSize : 1;
    
    const response: PaginatedSnapshotsResponse = {
      snapshots: paginatedSnapshots,
      pagination: {
        total,
        offset,
        limit,
        hasMore
      },
      summary: {
        totalSize,
        formattedTotalSize: formatSize(totalSize),
        averageSize: total > 0 ? Math.round(totalSize / total) : 0,
        formattedAverageSize: formatSize(total > 0 ? Math.round(totalSize / total) : 0),
        compressionRatio: Math.round(compressionRatio * 100) / 100,
        totalOriginalSize,
        formattedTotalOriginalSize: formatSize(totalOriginalSize)
      },
      filters: {
        ...(server && { server }),
        ...(schedule && { schedule }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo })
      }
    };
    
    return NextResponse.json({
      success: true,
      data: response
    });
    
  } catch (error) {
    console.error('Failed to get snapshots:', error);
    const message = error instanceof Error ? error.message : 'Failed to load snapshots';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
