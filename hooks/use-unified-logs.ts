import { useQuery } from '@tanstack/react-query';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useLogStream } from './use-log-stream';
import type { UnifiedLogEntry, LogsResponse } from '@/types';

export interface UseUnifiedLogsOptions {
  serverName: string;
  types?: string[];
  initialLimit?: number;
}

export interface UseUnifiedLogsResult {
  logs: UnifiedLogEntry[];
  isLoading: boolean;
  isStreaming: boolean;
  error: Error | null;
  clearLogs: () => void;
}

async function fetchInitialLogs(
  serverName: string,
  types?: string[],
  limit: number = 100
): Promise<UnifiedLogEntry[]> {
  const params = new URLSearchParams({
    server: serverName,
    limit: limit.toString(),
  });

  if (types && types.length > 0) {
    params.set('types', types.join(','));
  }

  const response = await fetch(`/api/logs?${params}`, {
    credentials: 'include',
  });

  const json = await response.json() as { success: boolean; data?: LogsResponse<UnifiedLogEntry>; error?: string };

  if (!json.success || !json.data) {
    throw new Error(json.error || 'Failed to fetch logs');
  }

  return json.data.logs;
}

export function useUnifiedLogs(options: UseUnifiedLogsOptions): UseUnifiedLogsResult {
  const { serverName, types = [], initialLimit = 100 } = options;
  const [logs, setLogs] = useState<UnifiedLogEntry[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const logsRef = useRef<UnifiedLogEntry[]>([]);
  const isInitialLoadRef = useRef(true);

  const { isLoading } = useQuery({
    queryKey: ['logs', 'initial', serverName, types],
    queryFn: async () => {
      const data = await fetchInitialLogs(serverName, types, initialLimit);
      logsRef.current = data;
      setLogs(data);
      isInitialLoadRef.current = false;
      return data;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const handleInitial = useCallback((entries: UnifiedLogEntry[]) => {
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }
    logsRef.current = entries;
    setLogs(entries);
  }, []);

  const handleBatch = useCallback((entries: UnifiedLogEntry[]) => {
    const newLogs = [...logsRef.current, ...entries];
    newLogs.sort((a, b) => {
      const timeA = a.time instanceof Date ? a.time.getTime() : new Date(a.time).getTime();
      const timeB = b.time instanceof Date ? b.time.getTime() : new Date(b.time).getTime();
      return timeB - timeA;
    });
    const limited = newLogs.slice(0, 1000);
    logsRef.current = limited;
    setLogs(limited);
  }, []);

  const { isConnected, error: streamError } = useLogStream({
    serverName,
    types,
    onBatch: handleBatch,
    onInitial: handleInitial,
  });

  useEffect(() => {
    setIsStreaming(isConnected);
  }, [isConnected]);

  useEffect(() => {
    if (streamError) {
      setError(streamError);
    }
  }, [streamError]);

  const clearLogs = useCallback(() => {
    logsRef.current = [];
    setLogs([]);
    isInitialLoadRef.current = true;
  }, []);

  return {
    logs,
    isLoading,
    isStreaming,
    error,
    clearLogs,
  };
}
