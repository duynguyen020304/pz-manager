import fs from 'fs/promises';
import { BackupConfig, Schedule, CompressionConfig, IntegrityConfig, AutoRollbackConfig } from '@/types';
import { BACKUP_CONFIG_PATH, SNAPSHOTS_PATH, BACKUP_SYSTEM_ROOT } from '@/lib/paths';
import { backupScheduler } from '@/lib/backup-scheduler';

const CONFIG_PATH = BACKUP_CONFIG_PATH;

let configCache: BackupConfig | null = null;
let configCacheTime: number = 0;
const CACHE_TTL = 5000; // 5 seconds

export async function loadConfig(): Promise<BackupConfig> {
  const now = Date.now();
  
  if (configCache && (now - configCacheTime) < CACHE_TTL) {
    return configCache;
  }
  
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(data) as BackupConfig;
    configCache = config;
    configCacheTime = now;
    return config;
  } catch (error) {
    console.error('Failed to load config:', error);
    throw new Error('Failed to load backup configuration');
  }
}

export async function saveConfig(config: BackupConfig): Promise<void> {
  try {
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
    configCache = config;
    configCacheTime = Date.now();
  } catch (error) {
    console.error('Failed to save config:', error);
    throw new Error('Failed to save backup configuration');
  }
}

export async function reloadConfig(): Promise<BackupConfig> {
  configCache = null;
  return loadConfig();
}

export async function getServers(): Promise<string[]> {
  const config = await loadConfig();
  return config.servers;
}

export async function getSchedules(): Promise<Schedule[]> {
  const config = await loadConfig();
  return config.schedules;
}

export async function getEnabledSchedules(): Promise<Schedule[]> {
  const schedules = await getSchedules();
  return schedules.filter(s => s.enabled);
}

export async function updateSchedule(
  name: string,
  updates: Partial<Schedule>
): Promise<void> {
  const config = await loadConfig();
  const scheduleIndex = config.schedules.findIndex(s => s.name === name);

  if (scheduleIndex === -1) {
    throw new Error(`Schedule '${name}' not found`);
  }

  const existingSchedule = config.schedules[scheduleIndex];
  const updatedSchedule = {
    ...existingSchedule,
    ...updates
  };

  config.schedules[scheduleIndex] = updatedSchedule;

  await saveConfig(config);

  if ('enabled' in updates) {
    try {
      await backupScheduler.setScheduleEnabled(name, updatedSchedule.enabled);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`[config-manager] Failed to sync systemd timer for schedule '${name}' (config saved, degraded mode):`, errorMsg);
    }
  }
}

export async function addServer(name: string): Promise<void> {
  const config = await loadConfig();
  
  if (config.servers.includes(name)) {
    throw new Error(`Server '${name}' already exists`);
  }
  
  config.servers.push(name);
  await saveConfig(config);
}

export async function removeServer(name: string): Promise<void> {
  const config = await loadConfig();
  
  const index = config.servers.indexOf(name);
  if (index === -1) {
    throw new Error(`Server '${name}' not found`);
  }
  
  config.servers.splice(index, 1);
  await saveConfig(config);
}

export async function updateCompression(updates: Partial<CompressionConfig>): Promise<void> {
  const config = await loadConfig();
  config.compression = { ...config.compression, ...updates };
  await saveConfig(config);
}

export async function updateIntegrity(updates: Partial<IntegrityConfig>): Promise<void> {
  const config = await loadConfig();
  config.integrity = { ...config.integrity, ...updates };
  await saveConfig(config);
}

export async function updateAutoRollback(updates: Partial<AutoRollbackConfig>): Promise<void> {
  const config = await loadConfig();
  const defaultConfig: AutoRollbackConfig = {
    enabled: false,
    schedule: '5min',
    cooldownMinutes: 5,
    notifyPlayers: true
  };
  config.autoRollback = { ...defaultConfig, ...config.autoRollback, ...updates };
  await saveConfig(config);
}

export function getSnapshotsPath(): string {
  return SNAPSHOTS_PATH;
}

export function getBackupSystemRoot(): string {
  return BACKUP_SYSTEM_ROOT;
}
