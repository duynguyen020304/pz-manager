/**
 * Centralized path configuration for Zomboid Web Manager
 * All file system paths should be sourced from this file
 */

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
