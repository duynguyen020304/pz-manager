import { EventEmitter } from 'events';
import type { UnifiedLogEntry } from '@/types';

export interface LogBatch {
  server: string;
  timestamp: Date;
  entries: UnifiedLogEntry[];
}

export interface StreamSubscription {
  serverName: string;
  types: string[];
  clientId: string;
}

class LogStreamManager extends EventEmitter {
  private batchBuffers = new Map<string, UnifiedLogEntry[]>();
  private batchTimers = new Map<string, NodeJS.Timeout>();
  private subscriptions = new Map<string, Set<string>>();
  private readonly BATCH_INTERVAL_MS = 200;
  private readonly MAX_BATCH_SIZE = 50;

  queueEntries(serverName: string, entries: UnifiedLogEntry[]): void {
    if (entries.length === 0) return;

    const key = serverName.toLowerCase();
    const buffer = this.batchBuffers.get(key) || [];
    buffer.push(...entries);
    this.batchBuffers.set(key, buffer);

    if (!this.batchTimers.has(key)) {
      const timer = setTimeout(() => {
        this.flushBatch(key);
      }, this.BATCH_INTERVAL_MS);
      this.batchTimers.set(key, timer);
    }

    if (buffer.length >= this.MAX_BATCH_SIZE) {
      this.flushBatch(key);
    }
  }

  private flushBatch(serverName: string): void {
    const key = serverName.toLowerCase();
    const buffer = this.batchBuffers.get(key) || [];
    if (buffer.length === 0) return;

    this.batchBuffers.set(key, []);
    const timer = this.batchTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(key);
    }

    buffer.sort((a, b) => {
      const timeA = a.time instanceof Date ? a.time.getTime() : new Date(a.time).getTime();
      const timeB = b.time instanceof Date ? b.time.getTime() : new Date(b.time).getTime();
      return timeA - timeB;
    });

    const batch: LogBatch = {
      server: serverName,
      timestamp: new Date(),
      entries: buffer,
    };

    this.emit(`server:${key}`, batch);
  }

  subscribe(serverName: string, clientId: string, _types: string[] = []): void {
    const key = serverName.toLowerCase();
    const subs = this.subscriptions.get(key) || new Set();
    subs.add(clientId);
    this.subscriptions.set(key, subs);
  }

  unsubscribe(serverName: string, clientId: string): void {
    const key = serverName.toLowerCase();
    const subs = this.subscriptions.get(key);
    if (subs) {
      subs.delete(clientId);
      if (subs.size === 0) {
        this.subscriptions.delete(key);
      }
    }
  }

  getSubscriberCount(serverName: string): number {
    const key = serverName.toLowerCase();
    return this.subscriptions.get(key)?.size || 0;
  }

  hasSubscribers(serverName: string): boolean {
    return this.getSubscriberCount(serverName) > 0;
  }
}

export const logStreamManager = new LogStreamManager();
