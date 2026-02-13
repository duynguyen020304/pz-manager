/**
 * Server log parser for Project Zomboid
 * Parses DebugLog-server.txt for server events (startup, shutdown, errors, warnings)
 *
 * Format: [12-02-26 16:17:54.957][LOG] message
 *         [12-02-26 16:17:54.957][ERROR] error message
 */

import { BaseParser, PATTERNS, parsePZTimestamp } from './base-parser';
import type { ParserType, UnifiedLogEntry, PZServerEvent } from '@/types';

interface ServerEventDetails {
  category: string;
  rawMessage: string;
  exception?: string;
  stackTrace?: string[];
  modName?: string;
  player?: string;
}

// Known event patterns in server logs
const SERVER_EVENT_PATTERNS = {
  // Startup events
  serverStarted: /server (started|listening|initialized)/i,
  loadingMap: /loading map/i,
  loadingMods: /loading mod/i,
  serverReady: /server (ready|online)/i,

  // Shutdown events
  serverStopping: /server (stopping|shutting down|quitting)/i,
  serverStopped: /server (stopped|offline|quit)/i,
  savingWorld: /saving (world|game)/i,

  // Error patterns
  exception: /exception|error|failed|crash/i,
  javaException: /java\.\w+\.\w+Exception/i,
  nullPointer: /NullPointerException/i,
  ioException: /IOException/i,
  outOfMemory: /OutOfMemoryError/i,

  // Warning patterns
  warning: /warning|warn/i,
  performanceWarning: /performance|slow|lag/i,
  connectionWarning: /connection|timeout|disconnect/i,

  // Player events in server log
  playerJoin: /player.*joined|connected player/i,
  playerLeave: /player.*left|disconnected player/i,

  // Mod events
  modLoaded: /mod.*loaded/i,
  modError: /mod.*error/i,
  luaError: /lua error/i,
};

// Category mapping based on message content
const CATEGORY_MAP: Record<string, RegExp> = {
  network: /network|socket|connection|port|timeout/i,
  performance: /performance|memory|lag|slow|timeout/i,
  mod: /mod|lua|script/i,
  player: /player|user|client/i,
  world: /world|chunk|map|save|load/i,
  general: /.*/,
};

export class ServerLogParser extends BaseParser {
  readonly type: ParserType = 'server';
  private currentYear: number;
  private inExceptionBlock = false;
  private currentException: string[] = [];

  constructor(currentYear?: number) {
    super();
    this.currentYear = currentYear ?? new Date().getFullYear();
  }

  parseLine(line: string, lineNumber: number): UnifiedLogEntry | UnifiedLogEntry[] | null {
    if (!line.trim()) return null;

    // Handle multi-line exception blocks
    if (this.inExceptionBlock) {
      // Check if this is still part of the exception (indented or stack trace)
      if (line.match(/^\s+at\s+/) || line.match(/^\s+\.\.\.\./) || line.match(/Caused by:/)) {
        this.currentException.push(line);
        return null;
      } else {
        // Exception block ended, process it
        this.inExceptionBlock = false;
        const exceptionEntry = this.processExceptionBlock(lineNumber);
        // Continue to process the current line
        const currentEntry = this.parseLogLine(line, lineNumber);
        if (exceptionEntry && currentEntry) {
          return [exceptionEntry, currentEntry] as UnifiedLogEntry[];
        }
        return exceptionEntry || currentEntry;
      }
    }

    return this.parseLogLine(line, lineNumber);
  }

  private parseLogLine(line: string, lineNumber: number): UnifiedLogEntry | null {
    const match = line.match(PATTERNS.serverLog);
    if (!match) return null;

    const [, timestamp, level, message] = match;
    const time = parsePZTimestamp(timestamp, this.currentYear);

    if (!time) return null;

    const details = this.parseEventDetails(message, level);
    const eventType = this.determineEventType(message, level);

    // Check if this starts an exception block
    if (level.toUpperCase() === 'ERROR' && SERVER_EVENT_PATTERNS.javaException.test(message)) {
      this.inExceptionBlock = true;
      this.currentException = [message];
      return null; // Will be processed when block ends
    }

    return {
      id: this.generateId(time, 'server', lineNumber),
      time,
      source: 'server',
      eventType,
      level: this.normalizeLevel(level),
      message: this.formatMessage(message),
      details: {
        ...details,
        category: this.categorizeEvent(message),
      },
    };
  }

  private parseEventDetails(message: string, _level: string): ServerEventDetails {
    const details: ServerEventDetails = {
      category: 'general',
      rawMessage: message,
    };

    // Extract mod name if present
    const modMatch = message.match(/mod\s*[:=]?\s*['"]?(\w+)['"]?/i);
    if (modMatch) {
      details.modName = modMatch[1];
    }

    // Extract player name if present
    const playerMatch = message.match(/player\s*[:=]?\s*['"]?(\w+)['"]?/i);
    if (playerMatch) {
      details.player = playerMatch[1];
    }

    // Extract exception type if present
    const exceptionMatch = message.match(/(java\.\w+\.\w+Exception|java\.\w+\.\w+Error)/);
    if (exceptionMatch) {
      details.exception = exceptionMatch[1];
    }

    return details;
  }

  private determineEventType(message: string, level: string): string {
    if (SERVER_EVENT_PATTERNS.serverStarted.test(message)) return 'startup';
    if (SERVER_EVENT_PATTERNS.serverStopping.test(message)) return 'shutdown';
    if (SERVER_EVENT_PATTERNS.serverStopped.test(message)) return 'shutdown';
    if (SERVER_EVENT_PATTERNS.savingWorld.test(message)) return 'save';
    if (SERVER_EVENT_PATTERNS.loadingMap.test(message)) return 'map_load';
    if (SERVER_EVENT_PATTERNS.loadingMods.test(message)) return 'mod_load';

    if (level.toUpperCase() === 'ERROR') return 'error';
    if (level.toUpperCase() === 'WARN') return 'warning';

    if (SERVER_EVENT_PATTERNS.playerJoin.test(message)) return 'player_join';
    if (SERVER_EVENT_PATTERNS.playerLeave.test(message)) return 'player_leave';
    if (SERVER_EVENT_PATTERNS.modLoaded.test(message)) return 'mod_loaded';
    if (SERVER_EVENT_PATTERNS.modError.test(message)) return 'mod_error';
    if (SERVER_EVENT_PATTERNS.luaError.test(message)) return 'lua_error';

    return 'info';
  }

  private categorizeEvent(message: string): string {
    for (const [category, pattern] of Object.entries(CATEGORY_MAP)) {
      if (pattern.test(message)) {
        return category;
      }
    }
    return 'general';
  }

  private normalizeLevel(level: string): 'INFO' | 'ERROR' | 'WARN' | 'DEBUG' {
    const upper = level.toUpperCase();
    if (['ERROR', 'ERR', 'FATAL', 'CRITICAL'].includes(upper)) return 'ERROR';
    if (['WARN', 'WARNING'].includes(upper)) return 'WARN';
    if (['DEBUG', 'TRACE', 'VERBOSE'].includes(upper)) return 'DEBUG';
    return 'INFO';
  }

  private formatMessage(message: string): string {
    // Clean up common prefixes
    return message
      .replace(/^\[[\w-]+\]\s*/i, '')
      .replace(/^(LOG|INFO):\s*/i, '')
      .trim();
  }

  private processExceptionBlock(lineNumber: number): UnifiedLogEntry | null {
    if (this.currentException.length === 0) return null;

    const exceptionLines = [...this.currentException];
    const mainMessage = exceptionLines[0] || '';
    const exceptionType = mainMessage.match(/(java\.\w+\.\w+Exception|java\.\w+\.\w+Error)/)?.[1] || 'Exception';

    // Extract the most relevant stack trace line
    const relevantStackLine = exceptionLines.find(l => l.includes('zomboid') || l.includes('zombie'));

    const entry: UnifiedLogEntry = {
      id: this.generateId(new Date(), 'exception', lineNumber),
      time: new Date(),
      source: 'server',
      eventType: 'error',
      level: 'ERROR',
      message: exceptionType,
      details: {
        category: 'general',
        exception: exceptionType,
        stackTrace: exceptionLines,
        relevantFrame: relevantStackLine,
      },
    };

    this.currentException = [];
    return entry;
  }

  /**
   * Parse server log and return structured server events
   */
  parseServerEvents(lines: string[], serverName: string): PZServerEvent[] {
    const events: PZServerEvent[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const entry = this.parseLogLine(line, i);
      if (entry) {
        // Handle array result
        const entries = Array.isArray(entry) ? entry : [entry];
        for (const e of entries) {
          events.push({
            time: e.time,
            server: serverName,
            eventType: e.eventType as PZServerEvent['eventType'],
            category: (e.details?.category as string) || undefined,
            level: (e.level === 'DEBUG' ? 'LOG' : e.level) as PZServerEvent['level'],
            message: e.message,
            details: e.details,
          });
        }
      }
    }

    return events;
  }
}

// Export singleton instance
export const serverLogParser = new ServerLogParser();
