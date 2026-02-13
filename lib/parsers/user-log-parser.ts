/**
 * User log parser for Project Zomboid
 * Parses user.txt for player events (login, logout, death, etc.)
 */

import { BaseParser, PATTERNS, parsePZTimestamp } from './base-parser';
import type { ParserType, UnifiedLogEntry } from '@/types';

interface UserEventDetails {
  ipAddress: string;
  rawMessage: string;
  deathCoords?: { x: number; y: number; z: number };
  loadTime?: number;
  version?: string;
}

// Known event patterns in user.txt
const USER_EVENT_PATTERNS = {
  attemptingJoin: /attempting to join/i,
  allowedJoin: /allowed to join/i,
  loadingTime: /loading time:\s*(\d+)/i,
  disconnected: /disconnected|connection lost/i,
  died: /died at/i,
  kicked: /kicked/i,
  banned: /banned/i,
  alreadyConnected: /already connected/i,
  serverFull: /server full/i,
  invalidPassword: /invalid password/i,
  versionMismatch: /version mismatch/i,
  pingTimeout: /ping timeout/i,
};

export class UserLogParser extends BaseParser {
  readonly type: ParserType = 'user';
  private currentYear: number;

  constructor(currentYear?: number) {
    super();
    this.currentYear = currentYear ?? new Date().getFullYear();
  }

  parseLine(line: string, lineNumber: number): UnifiedLogEntry | null {
    if (!line.trim()) return null;

    const match = line.match(PATTERNS.userLog);
    if (!match) return null;

    const [, timestamp, ipAddress, username, message] = match;
    const time = parsePZTimestamp(timestamp, this.currentYear);

    if (!time) return null;

    const details = this.parseEventDetails(message, ipAddress);
    const eventType = this.determineEventType(message);

    return {
      id: this.generateId(time, 'user', lineNumber),
      time,
      source: 'player',
      username,
      eventType,
      level: this.determineLevel(eventType, message),
      message: this.formatMessage(message, eventType),
      details: {
        ...details,
        username,
      },
    };
  }

  private parseEventDetails(message: string, ipAddress: string): UserEventDetails {
    const details: UserEventDetails = {
      ipAddress,
      rawMessage: message,
    };

    // Extract death coordinates: "died at (1234, 5678, 0)"
    const deathCoordsMatch = message.match(/died at\s*\((-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\)/i);
    if (deathCoordsMatch) {
      details.deathCoords = {
        x: parseFloat(deathCoordsMatch[1]),
        y: parseFloat(deathCoordsMatch[2]),
        z: parseFloat(deathCoordsMatch[3]),
      };
    }

    // Extract loading time: "loading time: 1234"
    const loadTimeMatch = message.match(/loading time:\s*(\d+)/i);
    if (loadTimeMatch) {
      details.loadTime = parseInt(loadTimeMatch[1], 10);
    }

    // Extract version info
    const versionMatch = message.match(/version\s*[:=]?\s*(\d+\.?\d*)/i);
    if (versionMatch) {
      details.version = versionMatch[1];
    }

    return details;
  }

  private determineEventType(message: string): string {
    if (USER_EVENT_PATTERNS.attemptingJoin.test(message)) {
      return 'login_attempt';
    }
    if (USER_EVENT_PATTERNS.allowedJoin.test(message)) {
      return 'login_success';
    }
    if (USER_EVENT_PATTERNS.loadingTime.test(message)) {
      return 'login_complete';
    }
    if (USER_EVENT_PATTERNS.disconnected.test(message)) {
      return 'logout';
    }
    if (USER_EVENT_PATTERNS.died.test(message)) {
      return 'death';
    }
    if (USER_EVENT_PATTERNS.kicked.test(message)) {
      return 'kicked';
    }
    if (USER_EVENT_PATTERNS.banned.test(message)) {
      return 'banned';
    }
    if (USER_EVENT_PATTERNS.alreadyConnected.test(message)) {
      return 'already_connected';
    }
    if (USER_EVENT_PATTERNS.serverFull.test(message)) {
      return 'server_full';
    }
    if (USER_EVENT_PATTERNS.invalidPassword.test(message)) {
      return 'invalid_password';
    }
    if (USER_EVENT_PATTERNS.versionMismatch.test(message)) {
      return 'version_mismatch';
    }
    if (USER_EVENT_PATTERNS.pingTimeout.test(message)) {
      return 'ping_timeout';
    }

    return 'unknown';
  }

  private determineLevel(eventType: string, _message: string): 'INFO' | 'ERROR' | 'WARN' | 'DEBUG' {
    const errorEvents = ['death', 'kicked', 'banned', 'ping_timeout', 'version_mismatch', 'invalid_password'];
    const warnEvents = ['server_full', 'already_connected'];

    if (errorEvents.includes(eventType)) {
      // Death is not really an error, just notable
      if (eventType === 'death') return 'INFO';
      return 'ERROR';
    }
    if (warnEvents.includes(eventType)) {
      return 'WARN';
    }

    return 'INFO';
  }

  private formatMessage(message: string, eventType: string): string {
    switch (eventType) {
      case 'login_attempt':
        return 'Attempting to join server';
      case 'login_success':
        return 'Successfully joined server';
      case 'login_complete':
        return 'Finished loading into game';
      case 'logout':
        return 'Disconnected from server';
      case 'death':
        const coordsMatch = message.match(/died at\s*\(([^)]+)\)/i);
        return coordsMatch ? `Player died at ${coordsMatch[1]}` : 'Player died';
      case 'kicked':
        return 'Player was kicked';
      case 'banned':
        return 'Player was banned';
      case 'server_full':
        return 'Server is full';
      case 'already_connected':
        return 'Already connected from another location';
      case 'invalid_password':
        return 'Invalid password';
      case 'version_mismatch':
        return 'Client version mismatch';
      case 'ping_timeout':
        return 'Connection timed out';
      default:
        return message;
    }
  }
}

// Export singleton instance
export const userLogParser = new UserLogParser();
