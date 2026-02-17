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

// Mod management types
export interface ModEntry {
  workshopId: string;
  modId: string;
  name: string;
  order: number;
  isValid: boolean;
  validationMessage?: string;
}

export interface ValidationResult {
  isValid: boolean;
  message: string;
  hasServerCode: boolean;
  hasClientCode: boolean;
  hasSharedCode: boolean;
}

export interface AddModRequest {
  workshopUrl: string;
}

export interface UpdateModsRequest {
  mods: ModEntry[];
}

// ============================================
// USER MANAGEMENT TYPES
// ============================================

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: Record<string, string[]>;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  userCount?: number;
}

export interface User {
  id: number;
  username: string;
  email: string | null;
  roleId: number;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithRole extends User {
  role: Role;
  password_hash?: string;
}

export interface Session {
  id: string;
  userId: number;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface SessionWithUser extends Session {
  user: UserWithRole;
}

export interface AuditLog {
  time: Date;
  userId: number | null;
  username: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
}

// Permission types
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'start' | 'stop' | 'configure' | 'restore' | '*';

export type PermissionResource =
  | 'servers'
  | 'backups'
  | 'schedules'
  | 'settings'
  | 'logs'
  | 'users'
  | 'roles'
  | '*';

// User creation/update types
export interface CreateUserInput {
  username: string;
  email?: string;
  password: string;
  roleId: number;
  isActive?: boolean;
}

export interface UpdateUserInput {
  username?: string;
  email?: string;
  password?: string;
  roleId?: number;
  isActive?: boolean;
}

// Role creation/update types
export interface CreateRoleInput {
  name: string;
  description?: string;
  permissions: Record<string, string[]>;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  permissions?: Record<string, string[]>;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================
// LOG TYPES
// ============================================

// Backup system log entry
export interface BackupLogEntry {
  time: Date;
  logType: 'backup' | 'restore' | 'rollback-cli';
  level: 'INFO' | 'ERROR' | 'WARN';
  server?: string;
  message: string;
  details?: Record<string, unknown>;
}

// PZ Player event
export interface PZPlayerEvent {
  time: Date;
  server: string;
  eventType: 'login_success' | 'logout' | 'chat' | 'death' | 'combat' | 'vehicle_enter' | 'vehicle_exit' | 'admin_command';
  username?: string;
  ipAddress?: string;
  details?: Record<string, unknown>;
}

// PZ Server event
export interface PZServerEvent {
  time: Date;
  server: string;
  eventType: 'startup' | 'shutdown' | 'error' | 'warning' | 'info';
  category?: string;
  level?: 'LOG' | 'ERROR' | 'WARN' | 'INFO';
  message?: string;
  details?: Record<string, unknown>;
}

// PZ Skill snapshot
export interface PZSkillSnapshot {
  time: Date;
  server: string;
  username: string;
  playerId?: number;
  hoursSurvived: number;
  skills: Record<string, number>;
}

// PZ Chat message
export interface PZChatMessage {
  time: Date;
  server: string;
  username: string;
  chatType: string;
  message: string;
  coordinates?: { x: number; y: number; z: number };
}

// PZ PVP event
export interface PZPVPEvent {
  time: Date;
  server: string;
  eventType: 'damage' | 'kill' | 'death';
  attacker?: string;
  victim?: string;
  weapon?: string;
  damage?: number;
  details?: Record<string, unknown>;
}

// Log file position tracking
export interface LogFilePosition {
  filePath: string;
  lastPosition: number;
  lastModified: Date;
  lastIngested: Date;
  fileSize?: number;
  checksum?: string;
  parserType: string;
}

// Unified log entry for display
export interface UnifiedLogEntry {
  id: string;
  time: Date;
  source: 'backup' | 'restore' | 'player' | 'server' | 'chat' | 'pvp' | 'skill';
  server?: string;
  username?: string;
  eventType: string;
  level: 'INFO' | 'ERROR' | 'WARN' | 'DEBUG';
  message: string;
  details?: Record<string, unknown>;
}

// Log filters
export interface LogFilters {
  server?: string;
  eventType?: string;
  username?: string;
  search?: string;
  source?: string;
  level?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

// Log pagination response
export interface LogsResponse<T> {
  logs: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Log statistics
export interface LogStats {
  totalEvents: number;
  uniquePlayers: number;
  errorCount: number;
  warningCount: number;
  loginCount: number;
  deathCount: number;
  chatCount: number;
  avgSessionDuration?: number;
}

// Player activity summary
export interface PlayerActivitySummary {
  username: string;
  server: string;
  lastActivity: Date;
  lastLogin?: Date;
  loginCount: number;
  deathCount: number;
  chatCount: number;
}

// Parser types
export type ParserType = 'backup' | 'restore' | 'user' | 'chat' | 'server' | 'perk' | 'pvp' | 'item' | 'admin' | 'cmd' | 'vehicle';

// Parsed log result
export interface ParsedLogResult {
  entries: UnifiedLogEntry[];
  bytesProcessed: number;
  linesProcessed: number;
  errors: string[];
}

// ============================================
// SYSTEM MONITORING TYPES
// ============================================

export interface SystemMetric {
  time: Date;
  cpuPercent: number | null;
  cpuCores: Array<{ core: number; load: number }> | null;
  memoryUsedBytes: number | null;
  memoryTotalBytes: number | null;
  memoryPercent: number | null;
  swapUsedBytes: number | null;
  swapTotalBytes: number | null;
  swapPercent: number | null;
  networkInterface: string | null;
  networkRxBytes: number | null;
  networkTxBytes: number | null;
  networkRxSec: number | null;
  networkTxSec: number | null;
}

export interface SystemSpike {
  time: Date;
  metricType: 'cpu' | 'memory' | 'swap' | 'network_rx' | 'network_tx';
  severity: 'warning' | 'critical';
  previousValue: number;
  currentValue: number;
  changePercent: number;
  sustainedForSeconds: number;
  details: Record<string, unknown> | null;
}

export interface MonitorConfig {
  id: number;
  enabled: boolean;
  pollingIntervalSeconds: number;
  dataRetentionDays: number;
  cpuSpikeThresholdPercent: number;
  cpuSpikeSustainedSeconds: number;
  cpuCriticalThreshold: number;
  memorySpikeThresholdPercent: number;
  memorySpikeSustainedSeconds: number;
  memoryCriticalThreshold: number;
  swapSpikeThresholdPercent: number;
  swapSpikeSustainedSeconds: number;
  swapCriticalThreshold: number;
  networkSpikeThresholdPercent: number;
  networkSpikeSustainedSeconds: number;
  updatedAt: Date;
}

export interface MonitorConfigInput {
  enabled?: boolean;
  pollingIntervalSeconds?: number;
  dataRetentionDays?: number;
  cpuSpikeThresholdPercent?: number;
  cpuSpikeSustainedSeconds?: number;
  cpuCriticalThreshold?: number;
  memorySpikeThresholdPercent?: number;
  memorySpikeSustainedSeconds?: number;
  memoryCriticalThreshold?: number;
  swapSpikeThresholdPercent?: number;
  swapSpikeSustainedSeconds?: number;
  swapCriticalThreshold?: number;
  networkSpikeThresholdPercent?: number;
  networkSpikeSustainedSeconds?: number;
}

export interface MetricsSummary {
  current: SystemMetric | null;
  history: SystemMetric[];
  spikes: SystemSpike[];
}

export interface TimeSeriesData {
  bucket: Date;
  avgCpu: number;
  maxCpu: number;
  avgMemory: number;
  maxMemory: number;
  avgSwap: number;
  avgNetworkRx: number;
  avgNetworkTx: number;
}

export interface SpikeDetectionState {
  consecutiveHighCpu: number;
  consecutiveHighMemory: number;
  consecutiveHighSwap: number;
  consecutiveHighNetworkRx: number;
  consecutiveHighNetworkTx: number;
  lastCpuValues: number[];
  lastMemoryValues: number[];
  lastNetworkRxValues: number[];
  lastNetworkTxValues: number[];
}

// ============================================
// LOG STREAMING TYPES
// ============================================

export interface LogStreamEvent {
  type: 'initial' | 'batch' | 'heartbeat' | 'error';
  server: string;
  timestamp: string;
  data?: UnifiedLogEntry[];
  error?: string;
}

export interface LogStreamOptions {
  server: string;
  types?: string[];
  since?: string;
}

export interface LogStreamSubscription {
  clientId: string;
  serverName: string;
  types: string[];
  connectedAt: Date;
}
