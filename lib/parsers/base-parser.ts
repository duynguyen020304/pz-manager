/**
 * Base parser interface and utilities for log parsing
 */

import type { ParserType, ParsedLogResult, UnifiedLogEntry } from '@/types';

// Log file paths configuration
export const LOG_PATHS = {
  // Project Zomboid game logs
  pzLogs: '/root/Zomboid/Logs',
  pzServerLog: (date: string) => `/root/Zomboid/Logs/${date}/DebugLog-server.txt`,
  pzUserLog: '/root/Zomboid/Logs/user.txt',
  pzChatLog: '/root/Zomboid/Logs/chat.txt',
  pzPerkLog: '/root/Zomboid/Logs/PerkLog.txt',
  pzPvpLog: '/root/Zomboid/Logs/pvp.txt',
  pzItemLog: '/root/Zomboid/Logs/item.txt',
  pzAdminLog: '/root/Zomboid/Logs/admin.txt',
  pzCmdLog: '/root/Zomboid/Logs/cmd.txt',
  pzClientActionLog: '/root/Zomboid/Logs/ClientActionLog.txt',

  // Backup system logs
  backupLogs: '/root/Zomboid/backup-system/logs',
  backupLog: '/root/Zomboid/backup-system/logs/backup.log',
  restoreLog: '/root/Zomboid/backup-system/logs/restore.log',
  rollbackLog: '/root/Zomboid/backup-system/logs/rollback-cli.log',
} as const;

// Parser configuration for each log type
export interface ParserConfig {
  type: ParserType;
  filePath: string;
  enabled: boolean;
  description: string;
}

// Available parsers configuration
export const PARSER_CONFIGS: ParserConfig[] = [
  { type: 'backup', filePath: LOG_PATHS.backupLog, enabled: true, description: 'Backup operations' },
  { type: 'restore', filePath: LOG_PATHS.restoreLog, enabled: true, description: 'Restore operations' },
  { type: 'user', filePath: LOG_PATHS.pzUserLog, enabled: true, description: 'Player events (login, logout, death)' },
  { type: 'chat', filePath: LOG_PATHS.pzChatLog, enabled: true, description: 'Chat messages' },
  { type: 'server', filePath: LOG_PATHS.pzServerLog(''), enabled: true, description: 'Server events (startup, shutdown, errors)' },
  { type: 'perk', filePath: LOG_PATHS.pzPerkLog, enabled: true, description: 'Player skill progression' },
  { type: 'pvp', filePath: LOG_PATHS.pzPvpLog, enabled: true, description: 'Combat and PvP events' },
  { type: 'item', filePath: LOG_PATHS.pzItemLog, enabled: false, description: 'Item placement (disabled - high volume)' },
  { type: 'admin', filePath: LOG_PATHS.pzAdminLog, enabled: true, description: 'Admin commands' },
  { type: 'cmd', filePath: LOG_PATHS.pzCmdLog, enabled: true, description: 'Server commands' },
  { type: 'vehicle', filePath: LOG_PATHS.pzClientActionLog, enabled: true, description: 'Vehicle events' },
];

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
// Format: [YY-MM-DD HH:MM:SS.mmm] or [YYYY-MM-DD HH:MM:SS]
export function parsePZTimestamp(timestamp: string, _currentYear?: number): Date | null {
  // Try full format with milliseconds: [YY-MM-DD HH:MM:SS.mmm]
  const shortFormat = /^\[(\d{2})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d+)\]$/;
  const match = timestamp.match(shortFormat);

  if (match) {
    const [, yy, mm, dd, hh, mi, ss, ms] = match;
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

  // Try full format without milliseconds: [YYYY-MM-DD HH:MM:SS]
  const fullFormat = /^\[(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\]$/;
  const fullMatch = timestamp.match(fullFormat);

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

  // Server log: Various formats, handled specially
  serverLog: /^\[(\d{2}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+)\]\[(\w+)\] (.+)$/,

  // PVP log: Various combat formats
  pvpLog: /^\[(\d{2}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+)\] (.+)$/,

  // IP address pattern
  ipAddress: /^(\d{1,3}\.){3}\d{1,3}$/,

  // Username pattern (alphanumeric, underscore, hyphen)
  username: /^[a-zA-Z0-9_-]+$/,
};
