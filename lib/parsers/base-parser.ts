/**
 * Base parser interface and utilities for log parsing
 */

import type { ParserType, ParsedLogResult, UnifiedLogEntry } from '@/types';
import {
  PZ_LOGS_PATH,
  PZ_SERVER_LOG_PATH,
  BACKUP_LOGS_PATH,
  BACKUP_LOG_PATH,
  RESTORE_LOG_PATH,
  ROLLBACK_LOG_PATH,
  SERVER_LOG_PATH,
  SERVER_LOGS_PATH,
  findLatestLogFile,
  findAllLogFiles,
  getTodaysServerLogPath,
} from '@/lib/paths';

// Log file paths configuration (legacy - shared location, deprecated)
export const LOG_PATHS = {
  // Project Zomboid game logs (shared location)
  pzLogs: PZ_LOGS_PATH,
  pzServerLog: (date: string) => PZ_SERVER_LOG_PATH(date),
  pzUserLog: `${PZ_LOGS_PATH}/user.txt`,
  pzChatLog: `${PZ_LOGS_PATH}/chat.txt`,
  pzPerkLog: `${PZ_LOGS_PATH}/PerkLog.txt`,
  pzPvpLog: `${PZ_LOGS_PATH}/pvp.txt`,
  pzItemLog: `${PZ_LOGS_PATH}/item.txt`,
  pzAdminLog: `${PZ_LOGS_PATH}/admin.txt`,
  pzCmdLog: `${PZ_LOGS_PATH}/cmd.txt`,
  pzClientActionLog: `${PZ_LOGS_PATH}/ClientActionLog.txt`,

  // Backup system logs (not server-specific)
  backupLogs: BACKUP_LOGS_PATH,
  backupLog: BACKUP_LOG_PATH,
  restoreLog: RESTORE_LOG_PATH,
  rollbackLog: ROLLBACK_LOG_PATH,
} as const;

/**
 * Get server-specific log paths
 * Returns an object with all log file paths for a specific server
 */
export function getLogPaths(serverName: string) {
  const base = SERVER_LOGS_PATH(serverName);

  return {
    // Project Zomboid game logs (server-specific)
    pzLogs: base,
    pzServerLog: (date: string) => SERVER_LOG_PATH(serverName, date, 'server'),
    pzUserLog: SERVER_LOG_PATH(serverName, '', 'user'),
    pzChatLog: SERVER_LOG_PATH(serverName, '', 'chat'),
    pzPerkLog: SERVER_LOG_PATH(serverName, '', 'perk'),
    pzPvpLog: SERVER_LOG_PATH(serverName, '', 'pvp'),
    pzItemLog: SERVER_LOG_PATH(serverName, '', 'item'),
    pzAdminLog: SERVER_LOG_PATH(serverName, '', 'admin'),
    pzCmdLog: SERVER_LOG_PATH(serverName, '', 'cmd'),
    pzClientActionLog: SERVER_LOG_PATH(serverName, '', 'clientAction'),

    // Backup system logs (not server-specific, kept for compatibility)
    backupLogs: BACKUP_LOGS_PATH,
    backupLog: BACKUP_LOG_PATH,
    restoreLog: RESTORE_LOG_PATH,
    rollbackLog: ROLLBACK_LOG_PATH,
  };
}

// Parser configuration for each log type
export interface ParserConfig {
  type: ParserType;
  filePath: string;
  enabled: boolean;
  description: string;
}

/**
 * Get parser configurations for a specific server (synchronous - returns static paths)
 * @param serverName - Server name for server-specific log paths (required)
 * @returns Array of parser configurations with server-specific file paths
 */
export function getParserConfigs(serverName: string): ParserConfig[] {
  const logPaths = getLogPaths(serverName);

  return [
    // Project Zomboid game logs (server-specific)
    { type: 'user', filePath: logPaths.pzUserLog, enabled: true, description: 'Player events (login, logout, death)' },
    { type: 'chat', filePath: logPaths.pzChatLog, enabled: true, description: 'Chat messages' },
    { type: 'server', filePath: logPaths.pzServerLog(''), enabled: true, description: 'Server events (startup, shutdown, errors)' },
    { type: 'perk', filePath: logPaths.pzPerkLog, enabled: true, description: 'Player skill progression' },
    { type: 'pvp', filePath: logPaths.pzPvpLog, enabled: true, description: 'Combat and PvP events' },
    { type: 'item', filePath: logPaths.pzItemLog, enabled: false, description: 'Item placement (disabled - high volume)' },
    { type: 'admin', filePath: logPaths.pzAdminLog, enabled: true, description: 'Admin commands' },
    { type: 'cmd', filePath: logPaths.pzCmdLog, enabled: true, description: 'Server commands' },
    { type: 'vehicle', filePath: logPaths.pzClientActionLog, enabled: true, description: 'Vehicle events' },
  ];
}

/**
 * Get parser configurations with dynamic log file discovery (async)
 * Finds the latest timestamped log files for each type
 * @param serverName - Server name for server-specific log paths (required)
 * @returns Array of parser configurations with discovered file paths
 */
export async function getParserConfigsDynamic(serverName: string): Promise<ParserConfig[]> {
  const configs: ParserConfig[] = [];
  const logTypes = ['user', 'chat', 'server', 'perk', 'pvp', 'admin', 'cmd'] as const;

  for (const logType of logTypes) {
    let filePath: string | null = null;

    if (logType === 'server') {
      filePath = await getTodaysServerLogPath(serverName);
    } else {
      filePath = await findLatestLogFile(serverName, logType);
    }

    if (filePath) {
      configs.push({
        type: logType,
        filePath,
        enabled: true,
        description: getLogTypeDescription(logType),
      });
    }
  }

  return configs;
}

/**
 * Get all log files for a server (for historical ingestion)
 * @param serverName - Server name
 * @returns Object with arrays of file paths for each log type
 */
export async function getAllLogFilesForServer(serverName: string): Promise<Record<string, string[]>> {
  const logTypes = ['user', 'chat', 'server', 'perk', 'pvp', 'admin', 'cmd'] as const;
  const result: Record<string, string[]> = {};

  for (const logType of logTypes) {
    result[logType] = await findAllLogFiles(serverName, logType);
  }

  return result;
}

function getLogTypeDescription(logType: string): string {
  const descriptions: Record<string, string> = {
    user: 'Player events (login, logout, death)',
    chat: 'Chat messages',
    server: 'Server events (startup, shutdown, errors)',
    perk: 'Player skill progression',
    pvp: 'Combat and PvP events',
    admin: 'Admin commands',
    cmd: 'Server commands',
    vehicle: 'Vehicle events',
  };
  return descriptions[logType] || logType;
}

/**
 * Get backup system parser configurations (global logs, not server-specific)
 * @returns Array of parser configurations for global backup system logs
 */
export function getBackupSystemParserConfigs(): ParserConfig[] {
  return [
    { type: 'backup', filePath: LOG_PATHS.backupLog, enabled: true, description: 'Backup operations' },
    { type: 'restore', filePath: LOG_PATHS.restoreLog, enabled: true, description: 'Restore operations' },
  ];
}

// Abstract base class for log parsers
export abstract class BaseParser {
  abstract readonly type: ParserType;

  /**
   * Parse a single log line
   * @param line The log line to parse
   * @param lineNumber The line number for error reporting
   * @returns Parsed entry or null if line doesn't match
   */
  abstract parseLine(line: string, lineNumber: number): UnifiedLogEntry | UnifiedLogEntry[] | null;

  /**
   * Parse multiple log lines
   * @param lines Array of log lines
   * @param startPosition Starting byte position for tracking
   * @returns Parsed result with entries and metadata
   */
  parseLines(lines: string[], startPosition: number = 0): ParsedLogResult {
    const entries: UnifiedLogEntry[] = [];
    const errors: string[] = [];
    let bytesProcessed = 0;
    let linesProcessed = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) {
        bytesProcessed += line.length + 1; // +1 for newline
        continue;
      }

      try {
        const result = this.parseLine(line, i);
        if (result) {
          if (Array.isArray(result)) {
            entries.push(...result);
          } else {
            entries.push(result);
          }
          linesProcessed++;
        }
      } catch (error) {
        errors.push(`Line ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      bytesProcessed += line.length + 1; // +1 for newline
    }

    return {
      entries,
      bytesProcessed: startPosition + bytesProcessed,
      linesProcessed,
      errors,
    };
  }

  /**
   * Generate a unique ID for a log entry
   */
  protected generateId(time: Date, type: string, index: number = 0): string {
    return `${type}-${time.getTime()}-${index}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Utility function to parse PZ timestamp format
// Format: DD-MM-YY HH:MM:SS.mmm (user/chat/pvp logs) or [DD-MM-YY HH:MM:SS.mmm]
export function parsePZTimestamp(timestamp: string, currentYear?: number): Date | null {
  // Normalize: add brackets if not present
  const normalized = timestamp.startsWith('[') ? timestamp : `[${timestamp}]`;

  // Try DD-MM-YY format with milliseconds: [DD-MM-YY HH:MM:SS.mmm]
  // This is the format used by user.txt, chat.txt, pvp.txt logs
  const ddMmYyFormat = /^\[(\d{2})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d+)\]$/;
  const ddMmYyMatch = normalized.match(ddMmYyFormat);

  if (ddMmYyMatch) {
    const [, dd, mm, yy, hh, mi, ss, ms] = ddMmYyMatch;
    // Handle 2-digit year - PZ uses DD-MM-YY, so year 26 = 2026
    const year = parseInt(yy) + 2000;
    return new Date(
      year,
      parseInt(mm) - 1,
      parseInt(dd),
      parseInt(hh),
      parseInt(mi),
      parseInt(ss),
      parseInt(ms.padEnd(3, '0').slice(0, 3))
    );
  }

  // Try full format without milliseconds: [YYYY-MM-DD HH:MM:SS]
  const fullFormat = /^\[(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\]$/;
  const fullMatch = normalized.match(fullFormat);

  if (fullMatch) {
    const [, yyyy, mm, dd, hh, mi, ss] = fullMatch;
    return new Date(
      parseInt(yyyy),
      parseInt(mm) - 1,
      parseInt(dd),
      parseInt(hh),
      parseInt(mi),
      parseInt(ss)
    );
  }

  // Try old YY-MM-DD format with milliseconds (legacy)
  const yyMmDdFormat = /^\[(\d{2})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d+)\]$/;
  const yyMmDdMatch = normalized.match(yyMmDdFormat);

  if (yyMmDdMatch) {
    const [, yy, mm, dd, hh, mi, ss, ms] = yyMmDdMatch;
    // Handle year - PZ uses 2-digit year, assume 2000s
    const fullYear = parseInt(yy) + 2000;
    return new Date(
      fullYear,
      parseInt(mm) - 1,
      parseInt(dd),
      parseInt(hh),
      parseInt(mi),
      parseInt(ss),
      parseInt(ms.padEnd(3, '0').slice(0, 3))
    );
  }

  return null;
}

// Utility function to parse backup system timestamp format
// Format: [YYYY-MM-DD HH:MM:SS]
export function parseBackupTimestamp(timestamp: string): Date | null {
  const format = /^\[(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\]$/;
  const match = timestamp.match(format);

  if (match) {
    const [, yyyy, mm, dd, hh, mi, ss] = match;
    return new Date(
      parseInt(yyyy),
      parseInt(mm) - 1,
      parseInt(dd),
      parseInt(hh),
      parseInt(mi),
      parseInt(ss)
    );
  }

  return null;
}

// Utility function to safely parse JSON
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

// Utility function to extract coordinates from PZ log format
// Format: [x,y,z] or (x,y,z) or x,y,z
export function parseCoordinates(coordStr: string): { x: number; y: number; z: number } | null {
  const match = coordStr.match(/[\[\(]?(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)[\]\)]?/);
  if (match) {
    return {
      x: parseFloat(match[1]),
      y: parseFloat(match[2]),
      z: parseFloat(match[3]),
    };
  }
  return null;
}

// Utility function to detect server name from log file path
export function detectServerFromPath(filePath: string): string | null {
  // Try to extract server name from backup log pattern
  const backupMatch = filePath.match(/backup-system/);
  if (backupMatch) {
    return null; // Backup logs have server in the message, not path
  }

  // Try to extract from PZ log path pattern
  const pzMatch = filePath.match(/Logs\/(\d{4}-\d{2}-\d{2})\//);
  if (pzMatch) {
    return 'server'; // PZ logs are typically for a single server per day
  }

  return null;
}

// Common regex patterns
export const PATTERNS = {
  // Backup log: [2026-02-10 03:05:06] [INFO] message
  backupLog: /^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] \[(\w+)\] (.+)$/,

  // User log: [12-02-26 16:17:54.957] 14.191.221.162 "username" message
  userLog: /^\[(\d{2}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+)\] ([\d.]+) "([^"]+)" (.+)$/,

  // Chat log: [12-02-26 16:21:22.677][info] Got message:ChatMessage{chat=Local, author='X', text='Y'}
  chatLog: /^\[(\d{2}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+)\]\[(\w+)\] (.+)$/,

  // Perk log line 1: [12-02-26 16:18:24.420] [username][coords][Login][Hours Survived: 87]
  perkLogLine1: /^\[(\d{2}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+)\] \[([^\]]+)\]\[([^\]]+)\]\[([^\]]+)\]\[Hours Survived: (\d+)\]/,

  // Perk log line 2 (skills): [12-02-26 16:18:24.420] [username][coords][Cooking=0, Fitness=9, ...][Hours Survived: 87]
  perkLogLine2: /^\[(\d{2}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+)\] \[([^\]]+)\]\[([^\]]+)\]\[([^\]]+)\]\[Hours Survived: (\d+)\]/,

  // Server log: [DD-MM-YY HH:MM:SS.mmm] LOG  : <category> <message>
  // Also handles: [DD-MM-YY HH:MM:SS.mmm] ERROR: <category> <message>
  serverLog: /^\[(\d{2}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+)\] (\w+)\s+: (.+)$/,

  // PVP log: [DD-MM-YY HH:MM:SS.mmm][LOG] <message>
  // Also: [DD-MM-YY HH:MM:SS.mmm][INFO] <message>
  pvpLog: /^\[(\d{2}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+)\]\[(\w+)\] (.+)$/,

  // IP address pattern
  ipAddress: /^(\d{1,3}\.){3}\d{1,3}$/,

  // Username pattern (alphanumeric, underscore, hyphen)
  username: /^[a-zA-Z0-9_-]+$/,
};
