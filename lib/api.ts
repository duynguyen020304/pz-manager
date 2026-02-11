import { ApiResponse, Server, Snapshot, ServerStats, BackupConfig, RestoreJob, ServerStatus, ServerJob, PZInstallation, ServerModsConfig } from '@/types';

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
export async function login(password: string): Promise<{ message: string }> {
  return fetchApi(`${API_BASE}/auth`, {
    method: 'POST',
    body: JSON.stringify({ password })
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

// Installations
export async function getInstallations(): Promise<PZInstallation[]> {
  return fetchApi(`${API_BASE}/installations`);
}

// Mods
export async function getServerMods(serverName: string): Promise<ServerModsConfig> {
  return fetchApi(`${API_BASE}/servers/${encodeURIComponent(serverName)}/mods`);
}
