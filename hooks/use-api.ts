import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { Server, Snapshot, ServerStats, BackupConfig, RestoreJob, ServerStatus, ServerJob, ServerModsConfig } from '@/types';
import * as api from '@/lib/api';

// Servers
export function useServers() {
  return useQuery({
    queryKey: ['servers'],
    queryFn: api.getServers
  });
}

export function useDetectServers() {
  return useQuery({
    queryKey: ['servers', 'detect'],
    queryFn: api.detectServers,
    enabled: false // Don't fetch automatically
  });
}

export function useAddServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.addServer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    }
  });
}

export function useRemoveServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.removeServer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    }
  });
}

// Snapshots
export function useSnapshots(serverName: string, schedule?: string) {
  return useQuery({
    queryKey: ['snapshots', serverName, schedule],
    queryFn: () => api.getSnapshots(serverName, schedule),
    enabled: !!serverName
  });
}

export function useDeleteSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteSnapshot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    }
  });
}

// Stats
export function useServerStats(serverName: string) {
  return useQuery({
    queryKey: ['stats', serverName],
    queryFn: () => api.getServerStats(serverName),
    enabled: !!serverName
  });
}

// Restore
export function useRestore() {
  return useMutation({
    mutationFn: ({ serverName, snapshotPath }: { serverName: string; snapshotPath: string }) =>
      api.restoreSnapshot(serverName, snapshotPath)
  });
}

export function useRestoreJob(jobId: string | null) {
  return useQuery<RestoreJob | ServerJob>({
    queryKey: ['job', jobId],
    queryFn: () => api.getJobStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === 'running' ? 3000 : false;
    }
  });
}

// Server Status
export function useServerStatus(serverName: string) {
  return useQuery({
    queryKey: ['server-status', serverName],
    queryFn: () => api.getServerStatus(serverName),
    enabled: !!serverName,
    refetchInterval: 10000 // 10 seconds
  });
}

export function useAllServerStatus() {
  return useQuery({
    queryKey: ['server-status', 'all'],
    queryFn: api.getAllServerStatus,
    refetchInterval: 10000
  });
}

// Server Control
export function useStartServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ serverName, options }: {
      serverName: string;
      options?: { debug?: boolean; installationId?: string };
    }) => api.startServer(serverName, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server-status'] });
    }
  });
}

export function useAbortStart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ serverName, jobId }: { serverName: string; jobId: string }) =>
      api.abortServerStart(serverName, jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server-status'] });
    }
  });
}

export function useStopServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (serverName: string) => api.stopServer(serverName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server-status'] });
    }
  });
}

// Installations
export function useInstallations() {
  return useQuery({
    queryKey: ['installations'],
    queryFn: api.getInstallations
  });
}

// Mods
export function useServerMods(serverName: string) {
  return useQuery<ServerModsConfig>({
    queryKey: ['mods', serverName],
    queryFn: () => api.getServerMods(serverName),
    enabled: !!serverName
  });
}

// Config
export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: api.getConfig
  });
}

export function useSaveConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.saveConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
    }
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, updates }: { name: string; updates: Partial<{ enabled: boolean; retention: number }> }) =>
      api.updateSchedule(name, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
    }
  });
}

export function useUpdateCompression() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.updateCompression,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
    }
  });
}

export function useUpdateIntegrity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.updateIntegrity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
    }
  });
}

export function useUpdateAutoRollback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.updateAutoRollback,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
    }
  });
}

// Console Streaming - Uses native EventSource for SSE
export interface ConsoleStreamState {
  logs: string[];
  isConnected: boolean;
  error: string | null;
}

export function useConsoleStream(serverName: string, enabled: boolean): ConsoleStreamState {
  const [logs, setLogs] = React.useState<string[]>([]);
  const [isConnected, setIsConnected] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!enabled || !serverName) {
      setLogs([]);
      setError(null);
      setIsConnected(false);
      return;
    }

    let eventSource: EventSource | null = null;
    let isMounted = true;

    const connect = () => {
      try {
        eventSource = new EventSource(`/api/servers/${encodeURIComponent(serverName)}/console`);

        eventSource.onopen = () => {
          if (!isMounted) return;
          setIsConnected(true);
          setError(null);
        };

        eventSource.onmessage = (event) => {
          if (!isMounted) return;

          try {
            const parsed = JSON.parse(event.data);

            if (parsed.type === 'connected') {
              // Initial connection confirmation
            } else if (parsed.type === 'init') {
              // Initial console buffer
              const lines = parsed.data.content.split('\n').filter((line: string) => line.length > 0);
              setLogs(lines);
            } else if (parsed.type === 'log') {
              // New log line
              setLogs((prev) => {
                const newLogs = [...prev, parsed.data.content];
                // Keep max 1000 lines in memory
                if (newLogs.length > 1000) {
                  return newLogs.slice(-1000);
                }
                return newLogs;
              });
            } else if (parsed.type === 'error') {
              setError(parsed.data.message || 'Unknown error');
            }
          } catch (e) {
            console.error('Failed to parse SSE message:', e);
          }
        };

        eventSource.onerror = (e) => {
          if (!isMounted) return;
          console.error('EventSource error:', e);
          setIsConnected(false);
          setError('Connection lost');

          // Auto-reconnect after delay
          if (eventSource) {
            eventSource.close();
          }
          setTimeout(() => {
            if (isMounted && enabled) {
              connect();
            }
          }, 3000);
        };
      } catch (e) {
        console.error('Failed to create EventSource:', e);
        setError('Failed to connect to console');
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [serverName, enabled]);

  return { logs, isConnected, error };
}
