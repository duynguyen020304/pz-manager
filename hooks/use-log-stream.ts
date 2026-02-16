import { useEffect, useRef, useState } from 'react';
import type { UnifiedLogEntry, LogStreamEvent } from '@/types';

export interface UseLogStreamOptions {
  serverName: string;
  types?: string[];
  since?: Date;
  onBatch?: (entries: UnifiedLogEntry[]) => void;
  onInitial?: (entries: UnifiedLogEntry[]) => void;
}

export interface UseLogStreamResult {
  isConnected: boolean;
  error: Error | null;
}

export function useLogStream(options: UseLogStreamOptions): UseLogStreamResult {
  const { serverName, types = [], since: initialSince, onBatch, onInitial } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | undefined>(undefined);
  const lastTimestampRef = useRef<Date | undefined>(initialSince);
  const retryCountRef = useRef(0);

  useEffect(() => {
    const connect = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const params = new URLSearchParams({
        server: serverName,
      });

      if (types.length > 0) {
        params.set('types', types.join(','));
      }

      const sinceTime = lastTimestampRef.current;
      if (sinceTime) {
        params.set('since', sinceTime.toISOString());
      }

      const url = `/api/logs/stream?${params.toString()}`;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
        setError(null);
        retryCountRef.current = 0;
      };

      es.addEventListener('initial', (event) => {
        try {
          const data: LogStreamEvent = JSON.parse(event.data);
          if (data.data && data.data.length > 0) {
            lastTimestampRef.current = new Date(data.data[data.data.length - 1].time);
            onInitial?.(data.data);
          }
        } catch (e) {
          console.error('Failed to parse initial event:', e);
        }
      });

      es.addEventListener('batch', (event) => {
        try {
          const data: LogStreamEvent = JSON.parse(event.data);
          if (data.data && data.data.length > 0) {
            lastTimestampRef.current = new Date(data.data[data.data.length - 1].time);
            onBatch?.(data.data);
          }
        } catch (e) {
          console.error('Failed to parse batch event:', e);
        }
      });

      es.addEventListener('heartbeat', () => {
        // Connection is alive
      });

      es.addEventListener('error', () => {
        console.error('EventSource error');
        setIsConnected(false);
        setError(new Error('Connection lost'));

        es.close();

        const backoffMs = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
        retryCountRef.current += 1;

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, backoffMs);
      });
    };

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [serverName, types, onBatch, onInitial]);

  return {
    isConnected,
    error,
  };
}
