/**
 * Centralized path configuration for Zomboid Web Manager
 * All file system paths should be sourced from this file
 */

import fs from 'fs/promises';
import path from 'path';

// Base Zomboid installation path (legacy reference)
const ZOMBOID_BASE = process.env.ZOMBOID_PATH || '/root/Zomboid';

// ============================================================================
// Server-Specific Cache Directories (CACHEDIR Support)
// ============================================================================

// Server cache base directory
export const SERVER_CACHE_BASE = process.env.SERVER_CACHE_BASE ||
  '/root/server-cache';

/**
 * Get the cache directory for a specific server
 * Each server gets its own isolated cache for logs, mods, workshop items
 * The -cachedir parameter uses this directory directly (no Zomboid subdirectory)
 */
export const SERVER_CACHE_DIR = (serverName: string): string =>
  `${SERVER_CACHE_BASE}/${serverName}`;

/**
 * Get the Logs directory for a specific server
 * Logs are stored in the server's cache directory
 */
export const SERVER_LOGS_PATH = (serverName: string): string =>
  `${SERVER_CACHE_DIR(serverName)}/Logs`;

// Server paths (CACHEDIR locations)
export const SERVERS_PATH = SERVER_CACHE_BASE;
export const SERVER_INI_PATH = (serverName: string) =>
  `${SERVER_CACHE_DIR(serverName)}/Server/${serverName}.ini`;
export const SERVER_DB_PATH = (serverName: string) =>
  `${SERVER_CACHE_DIR(serverName)}/db/${serverName}.db`;

// ============================================================================
// Backup System Paths
// ============================================================================

// Backup system data paths (independent location)
const BACKUP_SYSTEM_BASE = process.env.BACKUP_SYSTEM_ROOT || '/opt/zomboid-backups';

export const BACKUP_CONFIG_PATH = process.env.BACKUP_CONFIG_PATH ||
  `${BACKUP_SYSTEM_BASE}/config/backup-config.json`;

export const SNAPSHOTS_PATH = process.env.SNAPSHOTS_PATH ||
  `${BACKUP_SYSTEM_BASE}/snapshots`;

export const BACKUP_SYSTEM_ROOT = BACKUP_SYSTEM_BASE;

// Backup script paths (moved into web manager)
// Development: /root/Zomboid/backup-system/bin
// Production: /root/zomboid-web-manager/scripts/backup
export const BACKUP_SCRIPTS_PATH = process.env.BACKUP_SCRIPTS_PATH ||
  (process.env.NODE_ENV === 'production'
    ? '/root/zomboid-web-manager/scripts/backup'
    : `${ZOMBOID_BASE}/backup-system/bin`);

// Log paths (legacy - shared location, deprecated)
export const PZ_LOGS_PATH = `${ZOMBOID_BASE}/Logs`;
export const PZ_SERVER_LOG_PATH = (date: string) => `${ZOMBOID_BASE}/Logs/${date}/DebugLog-server.txt`;
export const BACKUP_LOGS_PATH = `${BACKUP_SYSTEM_BASE}/logs`;
export const BACKUP_LOG_PATH = `${BACKUP_SYSTEM_BASE}/logs/backup.log`;
export const RESTORE_LOG_PATH = `${BACKUP_SYSTEM_BASE}/logs/restore.log`;
export const ROLLBACK_LOG_PATH = `${BACKUP_SYSTEM_BASE}/logs/rollback-cli.log`;

// Steam/Mod paths (legacy - shared location, deprecated)
export const STEAM_CMD_PATH = process.env.STEAM_CMD_PATH || '/root/Steam/steamcmd.sh';
export const WORKSHOP_PATH = `${ZOMBOID_BASE}/steamapps/workshop/content/108600`;

/**
 * Get a specific log file path for a server
 * @param serverName - Server name
 * @param date - Date string in YYYY-MM-DD format (server logs use timestamps)
 * @param logType - Type of log (server, user, chat, perk, pvp, admin, cmd)
 *
 * Note: Server logs use format: YYYY-MM-DD_HH-MM_DebugLog-server.txt
 * Other logs use: filename.txt (e.g., user.txt, chat.txt)
 */
export const SERVER_LOG_PATH = (
  serverName: string,
  date: string,
  logType: string
): string => {
  const logsDir = SERVER_LOGS_PATH(serverName);

  // Server logs use timestamp format: YYYY-MM-DD_HH-MM_DebugLog-server.txt
  if (logType === 'server') {
    return `${logsDir}/${date}_DebugLog-server.txt`;
  }

  // Other logs are in the main Logs directory
  const logFileMap: Record<string, string> = {
    user: 'user.txt',
    chat: 'chat.txt',
    perk: 'PerkLog.txt',
    pvp: 'pvp.txt',
    admin: 'admin.txt',
    cmd: 'cmd.txt',
    item: 'item.txt',
    clientAction: 'ClientActionLog.txt',
  };

  const filename = logFileMap[logType] || `${logType}.txt`;
  return `${logsDir}/${filename}`;
};

/**
 * Get the Steam Workshop path for a specific server
 */
export const SERVER_WORKSHOP_PATH = (serverName: string): string =>
  `${SERVER_CACHE_DIR(serverName)}/steamapps/workshop/content/108600`;

/**
 * Get the Mods directory for a specific server
 */
export const SERVER_MODS_PATH = (serverName: string): string =>
  `${SERVER_CACHE_DIR(serverName)}/Mods`;

/**
 * Get saves directory for a server
 * All servers use CACHEDIR isolation for independent data management
 */
export const getServerSavesPath = (serverName: string): string =>
  `${SERVER_CACHE_DIR(serverName)}/Saves/Multiplayer/${serverName}`;

/**
 * Get server INI file path for a server
 * All servers use CACHEDIR isolation
 */
export const getServerIniPath = (serverName: string): string =>
  `${SERVER_CACHE_DIR(serverName)}/Server/${serverName}.ini`;

/**
 * Get SandboxVars.lua file path for a server
 * Contains game difficulty settings (zombie behavior, loot, etc.)
 */
export const getSandboxVarsPath = (serverName: string): string =>
  `${SERVER_CACHE_DIR(serverName)}/Server/${serverName}_SandboxVars.lua`;

/**
 * Get player database path for a server
 * All servers use CACHEDIR isolation
 */
export const getServerDbPath = (serverName: string): string =>
  `${SERVER_CACHE_DIR(serverName)}/db/${serverName}.db`;

// Export base path for any legacy code
export const ZOMBOID_PATH = ZOMBOID_BASE;

// ============================================================================
// Log File Discovery (Timestamp-based filenames)
// ============================================================================

const LOG_FILE_PATTERNS: Record<string, string> = {
  server: 'DebugLog-server.txt',
  user: 'user.txt',
  chat: 'chat.txt',
  perk: 'PerkLog.txt',
  pvp: 'pvp.txt',
  admin: 'admin.txt',
  cmd: 'cmd.txt',
  item: 'item.txt',
  clientAction: 'ClientActionLog.txt',
};

/**
 * Find the latest log file matching the pattern for a given log type
 * Zomboid creates timestamped files like: 2026-02-16_18-20_chat.txt
 * @param serverName - Server name
 * @param logType - Type of log (server, user, chat, perk, pvp, etc.)
 * @returns Full path to the latest log file, or null if not found
 */
export async function findLatestLogFile(
  serverName: string,
  logType: string
): Promise<string | null> {
  const logsDir = SERVER_LOGS_PATH(serverName);
  const pattern = LOG_FILE_PATTERNS[logType];

  if (!pattern) {
    console.warn(`[Paths] Unknown log type: ${logType}`);
    return null;
  }

  try {
    // Check if logs directory exists
    await fs.access(logsDir);
  } catch {
    console.warn(`[Paths] Log directory not found: ${logsDir}`);
    return null;
  }

  try {
    const entries = await fs.readdir(logsDir, { withFileTypes: true });
    const matchingFiles: Array<{ name: string; path: string; mtime: Date }> = [];

    // Scan main Logs directory for timestamped files
    for (const entry of entries) {
      if (!entry.isFile()) continue;

      // Match timestamped files: YYYY-MM-DD_HH-MM_filename.txt
      const timestampMatch = entry.name.match(
        /^(\d{4}-\d{2}-\d{2}_\d{2}-\d{2})_(.+)$/
      );

      if (timestampMatch && timestampMatch[2] === pattern) {
        const fullPath = path.join(logsDir, entry.name);
        const stats = await fs.stat(fullPath);
        matchingFiles.push({
          name: entry.name,
          path: fullPath,
          mtime: stats.mtime,
        });
      }
    }

    // Also scan historical subdirectories (logs_YYYY-MM-DD/)
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const dirMatch = entry.name.match(/^logs_(\d{4}-\d{2}-\d{2})$/);
      if (!dirMatch) continue;

      const subDirPath = path.join(logsDir, entry.name);
      try {
        const subEntries = await fs.readdir(subDirPath, { withFileTypes: true });

        for (const subEntry of subEntries) {
          if (!subEntry.isFile()) continue;

          const subMatch = subEntry.name.match(
            /^(\d{4}-\d{2}-\d{2})_\d{2}-\d{2}_(.+)$/
          );

          if (subMatch && subMatch[2] === pattern) {
            const fullPath = path.join(subDirPath, subEntry.name);
            const stats = await fs.stat(fullPath);
            matchingFiles.push({
              name: subEntry.name,
              path: fullPath,
              mtime: stats.mtime,
            });
          }
        }
      } catch {
        // Subdirectory access error, skip
      }
    }

    // Sort by modification time, newest first
    matchingFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    if (matchingFiles.length > 0) {
      return matchingFiles[0].path;
    }

    // Fallback: try legacy flat filename (e.g., user.txt, chat.txt)
    const legacyPath = path.join(logsDir, pattern);
    try {
      await fs.access(legacyPath);
      return legacyPath;
    } catch {
      // Legacy file doesn't exist
    }

    return null;
  } catch (error) {
    console.error(`[Paths] Error finding latest log file for ${logType}:`, error);
    return null;
  }
}

/**
 * Find all log files for a specific type (for historical ingestion)
 * @param serverName - Server name
 * @param logType - Type of log
 * @returns Array of file paths sorted by date (oldest first)
 */
export async function findAllLogFiles(
  serverName: string,
  logType: string
): Promise<string[]> {
  const logsDir = SERVER_LOGS_PATH(serverName);
  const pattern = LOG_FILE_PATTERNS[logType];

  if (!pattern) {
    return [];
  }

  const allFiles: Array<{ path: string; timestamp: Date | null }> = [];

  try {
    await fs.access(logsDir);
  } catch {
    return [];
  }

  try {
    // Scan main Logs directory
    const entries = await fs.readdir(logsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile()) continue;

      const timestampMatch = entry.name.match(
        /^(\d{4}-\d{2}-\d{2})_\d{2}-\d{2}_(.+)$/
      );

      if (timestampMatch && timestampMatch[2] === pattern) {
        const fullPath = path.join(logsDir, entry.name);
        const dateStr = timestampMatch[1];
        allFiles.push({
          path: fullPath,
          timestamp: new Date(dateStr),
        });
      }
    }

    // Also scan historical subdirectories (logs_YYYY-MM-DD/)
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const dirMatch = entry.name.match(/^logs_(\d{4}-\d{2}-\d{2})$/);
      if (!dirMatch) continue;

      const subDirPath = path.join(logsDir, entry.name);
      try {
        const subEntries = await fs.readdir(subDirPath, { withFileTypes: true });

        for (const subEntry of subEntries) {
          if (!subEntry.isFile()) continue;

          const subMatch = subEntry.name.match(
            /^(\d{4}-\d{2}-\d{2})_\d{2}-\d{2}_(.+)$/
          );

          if (subMatch && subMatch[2] === pattern) {
            const fullPath = path.join(subDirPath, subEntry.name);
            allFiles.push({
              path: fullPath,
              timestamp: new Date(subMatch[1]),
            });
          }
        }
      } catch {
        // Subdirectory access error, skip
      }
    }

    // Sort by timestamp (oldest first) for chronological ingestion
    allFiles.sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return a.timestamp.getTime() - b.timestamp.getTime();
    });

    return allFiles.map((f) => f.path);
  } catch (error) {
    console.error(`[Paths] Error finding all log files for ${logType}:`, error);
    return [];
  }
}

/**
 * Get today's server log file path (for watching)
 * @param serverName - Server name
 * @returns Full path to today's server log file
 */
export async function getTodaysServerLogPath(serverName: string): Promise<string | null> {
  const logsDir = SERVER_LOGS_PATH(serverName);
  const today = new Date().toISOString().split('T')[0];

  try {
    const entries = await fs.readdir(logsDir);

    for (const entry of entries) {
      // Match: 2026-02-17_XX-XX_DebugLog-server.txt
      if (entry.startsWith(today) && entry.endsWith('_DebugLog-server.txt')) {
        return path.join(logsDir, entry);
      }
    }

    return null;
  } catch {
    return null;
  }
}
