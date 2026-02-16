/**
 * Log Watcher
 * Real-time file watching for log ingestion using Node.js fs.watch API
 */

import fs from 'fs';
import path from 'path';
import { parseAndIngestFile, updateFilePosition } from './log-manager';
import { getLogPaths, getBackupSystemParserConfigs } from './parsers';
import { getRunningServers } from './server-manager';
import { logStreamManager } from './log-stream-manager';
import type { ParserType, UnifiedLogEntry } from '@/types';

function mapParserTypeToSource(parserType: ParserType): UnifiedLogEntry['source'] {
  switch (parserType) {
    case 'user':
      return 'player';
    case 'chat':
      return 'chat';
    case 'pvp':
      return 'pvp';
    case 'server':
      return 'server';
    case 'perk':
      return 'skill';
    case 'backup':
    case 'restore':
      return 'backup';
    default:
      return 'server';
  }
}

// Watch state for each monitored file
interface WatchState {
  filePath: string;
  parserType: ParserType;
  serverName: string;
  watcher: fs.FSWatcher | null;
  lastIngestTime: number;
  debounceTimer: NodeJS.Timeout | null;
  isProcessing: boolean;
}

// Global watch state
const watchStates = new Map<string, WatchState>();

// Configuration
const CONFIG = {
  // Debounce interval to avoid excessive processing
  debounceMs: 1000,
  // Minimum time between ingestions
  minIngestIntervalMs: 500,
  // Maximum batch size before forcing ingestion
  maxBatchSize: 1000,
  // Log rotation detection threshold (if file shrinks by this much)
  rotationThreshold: 1024,
};

/**
 * Start watching a log file for changes
 */
export function watchLogFile(
  filePath: string,
  parserType: ParserType,
  serverName: string = 'unknown'
): void {
  const key = `${parserType}:${filePath}`;

  // Don't duplicate watches
  if (watchStates.has(key)) {
    return;
  }

  const state: WatchState = {
    filePath,
    parserType,
    serverName,
    watcher: null,
    lastIngestTime: 0,
    debounceTimer: null,
    isProcessing: false,
  };

  watchStates.set(key, state);

  // Check if file exists before watching
  if (!fs.existsSync(filePath)) {
    console.log(`[LogWatcher] File not found, will watch directory: ${filePath}`);

    // Watch parent directory instead for file creation
    const parentDir = path.dirname(filePath);
    if (fs.existsSync(parentDir)) {
      state.watcher = fs.watch(parentDir, (eventType, filename) => {
        if (filename === path.basename(filePath)) {
          if (eventType === 'rename') {
            // File was created or renamed
            if (fs.existsSync(filePath)) {
              console.log(`[LogWatcher] File created: ${filePath}`);
              // Switch to file watching
              state.watcher?.close();
              startFileWatch(state);
            }
          }
        }
      });
    }
    return;
  }

  startFileWatch(state);
}

/**
 * Start watching an existing file
 */
function startFileWatch(state: WatchState): void {
  try {
    state.watcher = fs.watch(state.filePath, (eventType) => {
      if (eventType === 'change') {
        handleFileChange(state);
      } else if (eventType === 'rename') {
        // File was renamed/deleted - handle log rotation
        handleFileRotation(state);
      }
    });

    state.watcher.on('error', (error) => {
      console.error(`[LogWatcher] Error watching ${state.filePath}:`, error);
    });

    console.log(`[LogWatcher] Started watching: ${state.filePath}`);
  } catch (error) {
    console.error(`[LogWatcher] Failed to start watching ${state.filePath}:`, error);
  }
}

/**
 * Handle file change event with debouncing
 */
function handleFileChange(state: WatchState): void {
  // Clear existing debounce timer
  if (state.debounceTimer) {
    clearTimeout(state.debounceTimer);
  }

  // Set new debounce timer
  state.debounceTimer = setTimeout(() => {
    ingestNewContent(state);
  }, CONFIG.debounceMs);
}

/**
 * Handle file rotation (rename/delete)
 */
function handleFileRotation(state: WatchState): void {
  console.log(`[LogWatcher] File rotation detected: ${state.filePath}`);

  // Process any remaining content
  ingestNewContent(state);

  // Reset file position tracking
  updateFilePosition(state.filePath, 0, state.parserType);

  // Close current watcher
  state.watcher?.close();

  // Wait for new file to appear
  const checkInterval = setInterval(() => {
    if (fs.existsSync(state.filePath)) {
      clearInterval(checkInterval);
      // Reset state
      state.lastIngestTime = 0;
      state.isProcessing = false;
      // Start watching again
      startFileWatch(state);
    }
  }, 1000);

  // Timeout after 5 minutes
  setTimeout(() => {
    clearInterval(checkInterval);
  }, 5 * 60 * 1000);
}

/**
 * Ingest new content from the file
 */
async function ingestNewContent(state: WatchState): Promise<void> {
  // Prevent concurrent processing
  if (state.isProcessing) {
    return;
  }

  // Check minimum interval
  const now = Date.now();
  if (now - state.lastIngestTime < CONFIG.minIngestIntervalMs) {
    return;
  }

  state.isProcessing = true;
  state.lastIngestTime = now;

  try {
    const result = await parseAndIngestFile(
      state.filePath,
      state.parserType,
      state.serverName
    );

    if (result.entriesAdded > 0) {
      console.log(
        `[LogWatcher] Ingested ${result.entriesAdded} entries from ${state.filePath}`
      );

      if (state.serverName && state.serverName !== 'unknown' && result.entriesAdded > 0) {
        const unifiedEntries: UnifiedLogEntry[] = [];
        const source = mapParserTypeToSource(state.parserType);
        
        for (let i = 0; i < result.entriesAdded; i++) {
          unifiedEntries.push({
            id: `${source}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            time: new Date(),
            source,
            server: state.serverName,
            eventType: state.parserType,
            level: 'INFO',
            message: `Parsed from ${path.basename(state.filePath)}`,
          });
        }
        
        if (unifiedEntries.length > 0) {
          logStreamManager.queueEntries(state.serverName, unifiedEntries);
        }
      }
    }

    if (result.errors.length > 0) {
      console.warn(
        `[LogWatcher] Errors processing ${state.filePath}:`,
        result.errors
      );
    }
  } catch (error) {
    console.error(`[LogWatcher] Failed to ingest ${state.filePath}:`, error);
  } finally {
    state.isProcessing = false;
  }
}

/**
 * Stop watching a specific log file
 */
export function unwatchLogFile(filePath: string, parserType: ParserType): void {
  const key = `${parserType}:${filePath}`;
  const state = watchStates.get(key);

  if (state) {
    if (state.debounceTimer) {
      clearTimeout(state.debounceTimer);
    }
    if (state.watcher) {
      state.watcher.close();
    }
    watchStates.delete(key);
    console.log(`[LogWatcher] Stopped watching: ${filePath}`);
  }
}

/**
 * Stop all log file watchers
 */
export function stopAllWatchers(): void {
  for (const [, state] of watchStates) {
    if (state.debounceTimer) {
      clearTimeout(state.debounceTimer);
    }
    if (state.watcher) {
      state.watcher.close();
    }
  }
  watchStates.clear();
  console.log('[LogWatcher] All watchers stopped');
}

/**
 * Start watching log files for specific servers
 * If servers is empty or contains 'all', watches all configured servers
 * If servers contains 'running', automatically detects and watches running servers
 */
export async function startWatchingAll(servers: string[] = []): Promise<void> {
  console.log('[LogWatcher] Starting to watch log files...');

  let serversToWatch: string[] = [];

  // Determine which servers to watch
  if (servers.length === 0 || servers.includes('all')) {
    // Watch all servers - need to get from config
    const { loadConfig } = await import('./config-manager');
    const config = await loadConfig();
    serversToWatch = config.servers || [];
  } else if (servers.includes('running')) {
    // Auto-detect running servers
    serversToWatch = await getRunningServers();
    console.log('[LogWatcher] Auto-detected running servers:', serversToWatch);
  } else {
    // Watch specific servers
    serversToWatch = servers;
  }

  if (serversToWatch.length === 0) {
    console.log('[LogWatcher] No servers to watch');
    return;
  }

  // Watch backup system logs (not server-specific)
  const backupConfigs = getBackupSystemParserConfigs();
  for (const config of backupConfigs) {
    watchLogFile(config.filePath, config.type);
  }

  // Watch PZ game logs for each server
  for (const server of serversToWatch) {
    // Get server-specific log paths
    const logPaths = getLogPaths(server);

    // Watch all game logs for this server
    watchLogFile(logPaths.pzUserLog, 'user', server);
    watchLogFile(logPaths.pzChatLog, 'chat', server);
    watchLogFile(logPaths.pzPerkLog, 'perk', server);
    watchLogFile(logPaths.pzPvpLog, 'pvp', server);
    watchLogFile(logPaths.pzAdminLog, 'admin', server);
    watchLogFile(logPaths.pzCmdLog, 'cmd', server);
  }

  // Watch today's server log for each running server
  const today = new Date().toISOString().split('T')[0];
  for (const server of serversToWatch) {
    const logPaths = getLogPaths(server);
    const serverLogPath = logPaths.pzServerLog(today);
    if (fs.existsSync(path.dirname(serverLogPath))) {
      watchLogFile(serverLogPath, 'server', server);
    }
  }

  console.log(`[LogWatcher] Watching ${watchStates.size} log files for ${serversToWatch.length} server(s)`);
}

/**
 * Start watching log files for running servers only (auto-detection)
 */
export async function startWatchingRunning(): Promise<void> {
  console.log('[LogWatcher] Starting to watch log files for running servers...');
  await startWatchingAll(['running']);
}

/**
 * Get current watch status
 */
export function getWatchStatus(): Array<{
  filePath: string;
  parserType: ParserType;
  serverName: string;
  isActive: boolean;
  lastIngestTime: number;
}> {
  return Array.from(watchStates.values()).map((state) => ({
    filePath: state.filePath,
    parserType: state.parserType,
    serverName: state.serverName,
    isActive: state.watcher !== null,
    lastIngestTime: state.lastIngestTime,
  }));
}

/**
 * Force ingest all log files (useful for initial load)
 */
export async function ingestAllLogs(servers: string[] = []): Promise<{
  totalEntries: number;
  errors: string[];
}> {
  let totalEntries = 0;
  const errors: string[] = [];

  // Ingest backup system logs
  const backupConfigs = getBackupSystemParserConfigs();
  for (const config of backupConfigs) {
    try {
      const result = await parseAndIngestFile(config.filePath, config.type);
      totalEntries += result.entriesAdded;
      errors.push(...result.errors);
    } catch (error) {
      errors.push(`Failed to ingest ${config.filePath}: ${error}`);
    }
  }

  // Ingest PZ game logs
  for (const server of servers) {
    // Get server-specific log paths
    const logPaths = getLogPaths(server);

    const logFiles: Array<{ path: string; type: ParserType }> = [
      { path: logPaths.pzUserLog, type: 'user' },
      { path: logPaths.pzChatLog, type: 'chat' },
      { path: logPaths.pzPerkLog, type: 'perk' },
      { path: logPaths.pzPvpLog, type: 'pvp' },
      { path: logPaths.pzAdminLog, type: 'admin' },
      { path: logPaths.pzCmdLog, type: 'cmd' },
    ];

    for (const { path: filePath, type } of logFiles) {
      try {
        const result = await parseAndIngestFile(filePath, type, server);
        totalEntries += result.entriesAdded;
        errors.push(...result.errors);
      } catch (error) {
        errors.push(`Failed to ingest ${filePath}: ${error}`);
      }
    }
  }

  return { totalEntries, errors };
}

// Graceful shutdown handler
if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => {
    console.log('[LogWatcher] Received SIGTERM, stopping watchers...');
    stopAllWatchers();
  });

  process.on('SIGINT', () => {
    console.log('[LogWatcher] Received SIGINT, stopping watchers...');
    stopAllWatchers();
  });
}
