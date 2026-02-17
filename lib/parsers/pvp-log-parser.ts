/**
 * PVP log parser for Project Zomboid
 * Parses pvp.txt for combat and PvP events
 */

import { BaseParser, PATTERNS, parsePZTimestamp } from './base-parser';
import type { ParserType, UnifiedLogEntry, PZPVPEvent } from '@/types';

interface PVPEventDetails {
  attacker?: string;
  victim?: string;
  weapon?: string;
  damage?: number;
  bodyPart?: string;
  coordinates?: { x: number; y: number; z: number };
  wasKill?: boolean;
}

// PVP event patterns
const PVP_PATTERNS = {
  // Zomboid combat format: Combat: "player" (x,y,z) hit "player" (x,y,z) weapon="weapon" damage=N
  combat: /Combat:\s*"([^"]+)"\s*\([^)]+\)\s+hit\s+"([^"]+)"\s*\([^)]+\)\s+weapon="([^"]+)"\s+damage=([-\d.]+)/i,

  // Damage event: "X hit Y with Z for N damage"
  damage: /(\w+)\s+hit\s+(\w+)\s+with\s+(.+?)\s+for\s+([\d.]+)\s+damage/i,

  // Kill event: "X killed Y with Z"
  kill: /(\w+)\s+killed\s+(\w+)\s+with\s+(.+)/i,

  // Death event: "X died" or "X was killed"
  death: /(\w+)\s+(?:died|was killed)/i,

  // PVP specific: "PVP: X attacked Y"
  pvp: /pvp:\s*(\w+)\s+(?:attacked|hit|killed)\s+(\w+)/i,

  // Body part: "hit in the head", "body shot", etc.
  bodyPart: /(?:hit|shot)\s+(?:in|to)\s+(?:the\s+)?(\w+)/i,

  // Coordinates at end: "(1234, 5678, 0)"
  coords: /\((-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\)/,
};

export class PVPLogParser extends BaseParser {
  readonly type: ParserType = 'pvp';
  private currentYear: number;

  constructor(currentYear?: number) {
    super();
    this.currentYear = currentYear ?? new Date().getFullYear();
  }

  parseLine(line: string, lineNumber: number): UnifiedLogEntry | null {
    if (!line.trim()) return null;

    const match = line.match(PATTERNS.pvpLog);
    if (!match) return null;

    // Pattern now captures: [timestamp][level] message
    const [, timestamp, _level, message] = match;
    const time = parsePZTimestamp(timestamp, this.currentYear);

    if (!time) return null;

    const details = this.parsePVPEvent(message);
    if (!details) return null;

    const eventType = this.determineEventType(message, details);

    return {
      id: this.generateId(time, 'pvp', lineNumber),
      time,
      source: 'pvp',
      username: details.attacker || details.victim,
      eventType,
      level: details.wasKill ? 'WARN' : 'INFO',
      message: this.formatMessage(details, eventType),
      details: {
        ...details,
        rawMessage: message,
      },
    };
  }

  private parsePVPEvent(message: string): PVPEventDetails | null {
    // Try Zomboid combat format: Combat: "player" (x,y,z) hit "player" (x,y,z) weapon="weapon" damage=N
    let match = message.match(PVP_PATTERNS.combat);
    if (match) {
      return {
        attacker: match[1],
        victim: match[2],
        weapon: match[3],
        damage: parseFloat(match[4]),
        wasKill: false,
        ...this.parseAdditionalDetails(message),
      };
    }

    // Try kill pattern
    match = message.match(PVP_PATTERNS.kill);
    if (match) {
      return {
        attacker: match[1],
        victim: match[2],
        weapon: match[3].trim(),
        wasKill: true,
        ...this.parseAdditionalDetails(message),
      };
    }

    // Try damage pattern
    match = message.match(PVP_PATTERNS.damage);
    if (match) {
      return {
        attacker: match[1],
        victim: match[2],
        weapon: match[3].trim(),
        damage: parseFloat(match[4]),
        wasKill: false,
        ...this.parseAdditionalDetails(message),
      };
    }

    // Try PVP pattern
    match = message.match(PVP_PATTERNS.pvp);
    if (match) {
      return {
        attacker: match[1],
        victim: match[2],
        ...this.parseAdditionalDetails(message),
      };
    }

    // Try death pattern
    match = message.match(PVP_PATTERNS.death);
    if (match) {
      return {
        victim: match[1],
        wasKill: true,
        ...this.parseAdditionalDetails(message),
      };
    }

    return null;
  }

  private parseAdditionalDetails(message: string): Partial<PVPEventDetails> {
    const details: Partial<PVPEventDetails> = {};

    // Extract body part
    const bodyPartMatch = message.match(PVP_PATTERNS.bodyPart);
    if (bodyPartMatch) {
      details.bodyPart = bodyPartMatch[1].toLowerCase();
    }

    // Extract coordinates
    const coordsMatch = message.match(PVP_PATTERNS.coords);
    if (coordsMatch) {
      details.coordinates = {
        x: parseFloat(coordsMatch[1]),
        y: parseFloat(coordsMatch[2]),
        z: parseFloat(coordsMatch[3]),
      };
    }

    return details;
  }

  private determineEventType(message: string, details: PVPEventDetails): string {
    if (details.wasKill) return 'kill';
    if (details.damage) return 'damage';
    if (details.attacker && details.victim) return 'combat';
    if (details.victim) return 'death';
    return 'pvp';
  }

  private formatMessage(details: PVPEventDetails, eventType: string): string {
    switch (eventType) {
      case 'kill':
        return `${details.attacker} killed ${details.victim}${details.weapon ? ` with ${details.weapon}` : ''}`;
      case 'damage':
        return `${details.attacker} hit ${details.victim} for ${details.damage} damage${details.weapon ? ` with ${details.weapon}` : ''}`;
      case 'death':
        return `${details.victim} died`;
      case 'combat':
        return `${details.attacker} attacked ${details.victim}`;
      default:
        return `PVP event: ${details.attacker || 'Unknown'} vs ${details.victim || 'Unknown'}`;
    }
  }

  /**
   * Parse PVP log and return structured PVP events
   */
  parsePVPEvents(lines: string[], serverName: string): PZPVPEvent[] {
    const events: PZPVPEvent[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const entry = this.parseLine(line, i);
      if (entry) {
        events.push({
          time: entry.time,
          server: serverName,
          eventType: entry.eventType as PZPVPEvent['eventType'],
          attacker: entry.details?.attacker as string | undefined,
          victim: entry.details?.victim as string | undefined,
          weapon: entry.details?.weapon as string | undefined,
          damage: entry.details?.damage as number | undefined,
          details: entry.details,
        });
      }
    }

    return events;
  }
}

// Export singleton instance
export const pvpLogParser = new PVPLogParser();
