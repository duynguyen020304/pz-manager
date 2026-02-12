export interface Server {
  name: string;
  valid: boolean;
  hasIni: boolean;
  hasDb: boolean;
  path: string;
}

export interface Snapshot {
  schedule: string;
  timestamp: string;
  path: string;
  created: Date;
  size: number;
  fileCount: number;
  formattedSize: string;
  formattedTimestamp: string;
  server: string;
  manifest?: SnapshotManifest;
}

export interface SnapshotManifest {
  timestamp: string;
  source: string;
  schedule: string;
  fileCount: number;
  dirCount: number;
  sizeBytes: number;
  compression: {
    algorithm: string;
    level: number;
  };
  checksums?: Record<string, string>;
}

export interface ServerStats {
  totalSnapshots: number;
  totalSize: number;
  formattedTotalSize: string;
  bySchedule: ScheduleStats[];
}

export interface ScheduleStats {
  schedule: string;
  count: number;
  size: number;
  formattedSize: string;
}

export interface BackupConfig {
  version: string;
  savesPath: string;
  servers: string[];
  snapshotsPath: string;
  compression: CompressionConfig;
  integrity: IntegrityConfig;
  schedules: Schedule[];
  notifications: NotificationConfig;
  performance: PerformanceConfig;
  autoRollback?: AutoRollbackConfig;
}

export interface CompressionConfig {
  enabled: boolean;
  algorithm: string;
  level: number;
  extension: string;
}

export interface IntegrityConfig {
  enabled: boolean;
  algorithm: string;
  verifyAfterBackup: boolean;
  verifyAfterRestore: boolean;
}

export interface Schedule {
  name: string;
  interval: string;
  enabled: boolean;
  retention: number;
}

export interface NotificationConfig {
  enabled: boolean;
  onSuccess: boolean;
  onFailure: boolean;
  onLowDisk: boolean;
  diskThreshold: number;
}

export interface PerformanceConfig {
  parallelBackup: boolean;
  maxParallelJobs: number;
  nice: number;
  ionice: string;
}

export interface AutoRollbackConfig {
  enabled: boolean;
  schedule: string;
  cooldownMinutes: number;
  notifyPlayers: boolean;
}

export interface RestoreJob {
  id: string;
  serverName: string;
  snapshotPath: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  message: string;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Server runtime status
export interface ServerStatus {
  name: string;
  state: 'stopped' | 'starting' | 'running' | 'stopping';
  pid?: number;
  tmuxSession?: string;
  uptime?: string;
  ports?: {
    defaultPort: number;
    udpPort: number;
    rconPort: number;
  };
  actualPort?: number;  // Actual port the server is listening on
  startedAt?: Date;
}

// Start/stop job tracking
export interface ServerJob {
  id: string;
  serverName: string;
  operation: 'start' | 'stop';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  message: string;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  result?: {
    pid?: number;
    tmuxSession?: string;
  };
}

// PZ Installation for multi-version support
export interface PZInstallation {
  id: string;
  name: string;
  path: string;
  version: string;
}

// Extended Server config with port mappings
export interface ServerConfig {
  serverName: string;
  installationId: string;
  ports: {
    defaultPort: number;
    udpPort: number;
    rconPort: number;
  };
}

// Server mod configuration
export interface ServerMod {
  workshopId: string;
  name: string;
}

export interface ServerModsConfig {
  serverName: string;
  mods: string[];
  workshopItems: ServerMod[];
  maps: string[];
}
