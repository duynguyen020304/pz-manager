import { ApiResponse, Server, Snapshot, ServerStats, BackupConfig, RestoreJob, ServerStatus, ServerJob, PZInstallation, ServerModsConfig, UserWithRole, Role } from '@/types';

const API_BASE = '/api';

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Ensure cookies are sent/received
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });
  
  const data: ApiResponse<T> = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Unknown error');
  }
  
  return data.data as T;
}

// Auth
export async function login(username: string, password: string): Promise<{ message: string }> {
  return fetchApi(`${API_BASE}/auth`, {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

export async function logout(): Promise<{ message: string }> {
  return fetchApi(`${API_BASE}/auth`, {
    method: 'DELETE'
  });
}

// Servers
export async function getServers(): Promise<Server[]> {
  return fetchApi(`${API_BASE}/servers`);
}

export async function addServer(name: string): Promise<{ message: string }> {
  return fetchApi(`${API_BASE}/servers`, {
    method: 'POST',
    body: JSON.stringify({ name })
  });
}

export async function removeServer(name: string): Promise<{ message: string }> {
  return fetchApi(`${API_BASE}/servers?name=${encodeURIComponent(name)}`, {
    method: 'DELETE'
  });
}

export async function detectServers(): Promise<Server[]> {
  return fetchApi(`${API_BASE}/servers/detect`);
}

// Snapshots
export async function getSnapshots(serverName: string, schedule?: string): Promise<Snapshot[]> {
  const url = schedule 
    ? `${API_BASE}/servers/${encodeURIComponent(serverName)}/snapshots?schedule=${schedule}`
    : `${API_BASE}/servers/${encodeURIComponent(serverName)}/snapshots`;
  return fetchApi(url);
}

export async function deleteSnapshot(path: string): Promise<{ message: string }> {
  return fetchApi(`${API_BASE}/servers/all/snapshots?path=${encodeURIComponent(path)}`, {
    method: 'DELETE'
  });
}

// Stats
export async function getServerStats(serverName: string): Promise<ServerStats> {
  return fetchApi(`${API_BASE}/servers/${encodeURIComponent(serverName)}/stats`);
}

// Restore
export async function restoreSnapshot(serverName: string, snapshotPath: string): Promise<{ jobId: string; message: string }> {
  return fetchApi(`${API_BASE}/servers/${encodeURIComponent(serverName)}/restore`, {
    method: 'POST',
    body: JSON.stringify({ snapshotPath })
  });
}

export async function getJobStatus(jobId: string): Promise<RestoreJob | ServerJob> {
  return fetchApi(`${API_BASE}/jobs/${jobId}`);
}

// Config
export async function getConfig(): Promise<BackupConfig> {
  return fetchApi(`${API_BASE}/config`);
}

export async function saveConfig(config: BackupConfig): Promise<{ message: string }> {
  return fetchApi(`${API_BASE}/config`, {
    method: 'POST',
    body: JSON.stringify(config)
  });
}

export async function updateSchedule(name: string, updates: Partial<{ enabled: boolean; retention: number }>): Promise<{ message: string }> {
  return fetchApi(`${API_BASE}/config`, {
    method: 'PATCH',
    body: JSON.stringify({
      type: 'schedule',
      data: { name, ...updates }
    })
  });
}

export async function updateCompression(settings: Partial<BackupConfig['compression']>): Promise<{ message: string }> {
  return fetchApi(`${API_BASE}/config`, {
    method: 'PATCH',
    body: JSON.stringify({
      type: 'compression',
      data: settings
    })
  });
}

export async function updateIntegrity(settings: Partial<BackupConfig['integrity']>): Promise<{ message: string }> {
  return fetchApi(`${API_BASE}/config`, {
    method: 'PATCH',
    body: JSON.stringify({
      type: 'integrity',
      data: settings
    })
  });
}

export async function updateAutoRollback(settings: Partial<BackupConfig['autoRollback']>): Promise<{ message: string }> {
  return fetchApi(`${API_BASE}/config`, {
    method: 'PATCH',
    body: JSON.stringify({
      type: 'autoRollback',
      data: settings
    })
  });
}

// Server Status
export async function getServerStatus(serverName: string): Promise<ServerStatus> {
  return fetchApi(`${API_BASE}/servers/${encodeURIComponent(serverName)}/status`);
}

export async function getAllServerStatus(): Promise<ServerStatus[]> {
  return fetchApi(`${API_BASE}/servers/status`);
}

export async function getRunningServers(): Promise<{ running: string[]; all: ServerStatus[] }> {
  return fetchApi(`${API_BASE}/servers/running`);
}

// Server Control
export async function startServer(
  serverName: string,
  options?: { debug?: boolean; installationId?: string }
): Promise<{ jobId: string; message: string }> {
  return fetchApi(`${API_BASE}/servers/${encodeURIComponent(serverName)}/start`, {
    method: 'POST',
    body: JSON.stringify(options || {})
  });
}

export async function stopServer(serverName: string): Promise<{ jobId: string; message: string }> {
  return fetchApi(`${API_BASE}/servers/${encodeURIComponent(serverName)}/stop`, {
    method: 'POST'
  });
}

export async function abortServerStart(serverName: string, jobId: string): Promise<{ message: string }> {
  return fetchApi(`${API_BASE}/servers/${encodeURIComponent(serverName)}/abort`, {
    method: 'POST',
    body: JSON.stringify({ jobId })
  });
}

// Installations
export async function getInstallations(): Promise<PZInstallation[]> {
  return fetchApi(`${API_BASE}/installations`);
}

// Mods
export async function getServerMods(serverName: string): Promise<ServerModsConfig> {
  return fetchApi(`${API_BASE}/servers/${encodeURIComponent(serverName)}/mods`);
}

// ============================================
// USER MANAGEMENT
// ============================================

export interface UsersResponse {
  users: UserWithRole[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  stats: {
    total: number;
    active: number;
    inactive: number;
  };
}

export async function getUsers(params?: {
  page?: number;
  limit?: number;
  roleId?: number;
  isActive?: boolean;
  search?: string;
}): Promise<UsersResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.roleId) searchParams.set('roleId', params.roleId.toString());
  if (params?.isActive !== undefined) searchParams.set('isActive', params.isActive.toString());
  if (params?.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  return fetchApi(`${API_BASE}/users${query ? `?${query}` : ''}`);
}

export async function getUser(id: number): Promise<{ user: UserWithRole }> {
  return fetchApi(`${API_BASE}/users/${id}`);
}

export async function createUser(data: {
  username: string;
  email?: string;
  password: string;
  roleId: number;
  isActive?: boolean;
}): Promise<{ user: UserWithRole }> {
  return fetchApi(`${API_BASE}/users`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateUser(
  id: number,
  data: Partial<{
    username: string;
    email: string;
    password: string;
    roleId: number;
    isActive: boolean;
  }>
): Promise<{ user: UserWithRole }> {
  return fetchApi(`${API_BASE}/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteUser(id: number): Promise<{ message: string }> {
  return fetchApi(`${API_BASE}/users/${id}`, {
    method: 'DELETE'
  });
}

// ============================================
// ROLE MANAGEMENT
// ============================================

export interface RolesResponse {
  roles: Role[];
}

export async function getRoles(): Promise<RolesResponse> {
  return fetchApi(`${API_BASE}/roles`);
}

export async function getRole(id: number): Promise<{ role: Role & { userCount?: number } }> {
  return fetchApi(`${API_BASE}/roles/${id}`);
}

export async function createRole(data: {
  name: string;
  description?: string;
  permissions: Record<string, string[]>;
}): Promise<{ role: Role }> {
  return fetchApi(`${API_BASE}/roles`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateRole(
  id: number,
  data: Partial<{
    name: string;
    description: string;
    permissions: Record<string, string[]>;
  }>
): Promise<{ role: Role }> {
  return fetchApi(`${API_BASE}/roles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteRole(id: number): Promise<{ message: string }> {
  return fetchApi(`${API_BASE}/roles/${id}`, {
    method: 'DELETE'
  });
}

// ============================================
// SESSION / CURRENT USER
// ============================================

export interface CurrentUserResponse {
  user: {
    id: number;
    username: string;
    email: string | null;
    role: Role;
  };
  session: {
    id: string;
    expiresAt: Date;
    createdAt: Date;
  };
}

export async function getCurrentUser(): Promise<CurrentUserResponse> {
  return fetchApi(`${API_BASE}/sessions`);
}

// ============================================
// LOGS
// ============================================

import type { BackupLogEntry, PZPlayerEvent, PZServerEvent, PZChatMessage, PZPVPEvent, UnifiedLogEntry, LogStats, LogFilters } from '@/types';

export interface LogsResponse<T> {
  logs: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Get unified logs (all log types)
export async function getLogs(filters?: LogFilters): Promise<LogsResponse<UnifiedLogEntry>> {
  const searchParams = new URLSearchParams();
  if (filters?.source) searchParams.set('source', filters.source);
  if (filters?.server) searchParams.set('server', filters.server);
  if (filters?.eventType) searchParams.set('eventType', filters.eventType);
  if (filters?.username) searchParams.set('username', filters.username);
  if (filters?.level) searchParams.set('level', filters.level);
  if (filters?.from) searchParams.set('from', filters.from.toISOString());
  if (filters?.to) searchParams.set('to', filters.to.toISOString());
  if (filters?.limit) searchParams.set('limit', filters.limit.toString());
  if (filters?.offset) searchParams.set('offset', filters.offset.toString());

  const query = searchParams.toString();
  return fetchApi(`${API_BASE}/logs${query ? `?${query}` : ''}`);
}

// Get backup logs
export async function getBackupLogs(filters?: LogFilters): Promise<LogsResponse<BackupLogEntry>> {
  const searchParams = new URLSearchParams();
  if (filters?.server) searchParams.set('server', filters.server);
  if (filters?.level) searchParams.set('level', filters.level);
  if (filters?.from) searchParams.set('from', filters.from.toISOString());
  if (filters?.to) searchParams.set('to', filters.to.toISOString());
  if (filters?.limit) searchParams.set('limit', filters.limit.toString());
  if (filters?.offset) searchParams.set('offset', filters.offset.toString());

  const query = searchParams.toString();
  return fetchApi(`${API_BASE}/logs/backup${query ? `?${query}` : ''}`);
}

// Get player events
export async function getPlayerEvents(filters?: LogFilters): Promise<LogsResponse<PZPlayerEvent>> {
  const searchParams = new URLSearchParams();
  if (filters?.server) searchParams.set('server', filters.server);
  if (filters?.eventType) searchParams.set('eventType', filters.eventType);
  if (filters?.username) searchParams.set('username', filters.username);
  if (filters?.from) searchParams.set('from', filters.from.toISOString());
  if (filters?.to) searchParams.set('to', filters.to.toISOString());
  if (filters?.limit) searchParams.set('limit', filters.limit.toString());
  if (filters?.offset) searchParams.set('offset', filters.offset.toString());

  const query = searchParams.toString();
  return fetchApi(`${API_BASE}/logs/player${query ? `?${query}` : ''}`);
}

// Get server events
export async function getServerEvents(filters?: LogFilters): Promise<LogsResponse<PZServerEvent>> {
  const searchParams = new URLSearchParams();
  if (filters?.server) searchParams.set('server', filters.server);
  if (filters?.eventType) searchParams.set('eventType', filters.eventType);
  if (filters?.level) searchParams.set('level', filters.level);
  if (filters?.from) searchParams.set('from', filters.from.toISOString());
  if (filters?.to) searchParams.set('to', filters.to.toISOString());
  if (filters?.limit) searchParams.set('limit', filters.limit.toString());
  if (filters?.offset) searchParams.set('offset', filters.offset.toString());

  const query = searchParams.toString();
  return fetchApi(`${API_BASE}/logs/server${query ? `?${query}` : ''}`);
}

// Get chat messages
export async function getChatMessages(filters?: LogFilters): Promise<LogsResponse<PZChatMessage>> {
  const searchParams = new URLSearchParams();
  if (filters?.server) searchParams.set('server', filters.server);
  if (filters?.username) searchParams.set('username', filters.username);
  if (filters?.from) searchParams.set('from', filters.from.toISOString());
  if (filters?.to) searchParams.set('to', filters.to.toISOString());
  if (filters?.limit) searchParams.set('limit', filters.limit.toString());
  if (filters?.offset) searchParams.set('offset', filters.offset.toString());

  const query = searchParams.toString();
  return fetchApi(`${API_BASE}/logs/chat${query ? `?${query}` : ''}`);
}

// Get PVP events
export async function getPVPEvents(filters?: LogFilters): Promise<LogsResponse<PZPVPEvent>> {
  const searchParams = new URLSearchParams();
  if (filters?.server) searchParams.set('server', filters.server);
  if (filters?.eventType) searchParams.set('eventType', filters.eventType);
  if (filters?.username) searchParams.set('username', filters.username);
  if (filters?.from) searchParams.set('from', filters.from.toISOString());
  if (filters?.to) searchParams.set('to', filters.to.toISOString());
  if (filters?.limit) searchParams.set('limit', filters.limit.toString());
  if (filters?.offset) searchParams.set('offset', filters.offset.toString());

  const query = searchParams.toString();
  return fetchApi(`${API_BASE}/logs/pvp${query ? `?${query}` : ''}`);
}

// Get log statistics
export async function getLogStats(server?: string): Promise<LogStats> {
  const query = server ? `?server=${encodeURIComponent(server)}` : '';
  return fetchApi(`${API_BASE}/logs/stats${query}`);
}

// Log ingestion actions
export interface IngestResponse {
  entriesIngested: number;
  errors: string[];
}

export interface WatcherStatus {
  filePath: string;
  parserType: string;
  serverName: string;
  isActive: boolean;
  lastIngestTime: number;
}

export interface WatchStatusResponse {
  watchers: WatcherStatus[];
  activeCount: number;
}

export async function getWatchStatus(): Promise<WatchStatusResponse> {
  return fetchApi(`${API_BASE}/logs/ingest`);
}

export async function ingestAllLogs(servers?: string[]): Promise<IngestResponse> {
  return fetchApi(`${API_BASE}/logs/ingest`, {
    method: 'POST',
    body: JSON.stringify({ action: 'ingest_all', servers })
  });
}

export async function startLogWatching(servers?: string[], watchRunning?: boolean): Promise<{ message: string; servers?: string[] }> {
  return fetchApi(`${API_BASE}/logs/ingest`, {
    method: 'POST',
    body: JSON.stringify({ action: 'start_watching', servers, watchRunning })
  });
}

export async function stopLogWatching(): Promise<{ message: string }> {
  return fetchApi(`${API_BASE}/logs/ingest`, {
    method: 'POST',
    body: JSON.stringify({ action: 'stop_watching' })
  });
}
