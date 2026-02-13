/**
 * Perk log parser for Project Zomboid
 * Parses PerkLog.txt for player skill progression
 *
 * This parser handles a complex 2-line format:
 * Line 1: [12-02-26 16:18:24.420] [username][coords][Login][Hours Survived: 87]
 * Line 2: [12-02-26 16:18:24.420] [username][coords][Cooking=0, Fitness=9, ...][Hours Survived: 87]
 */

import { BaseParser, parsePZTimestamp } from './base-parser';
import type { ParserType, UnifiedLogEntry, PZSkillSnapshot } from '@/types';

interface PerkLogEntry {
  time: Date;
  username: string;
  coordinates: { x: number; y: number; z: number };
  event: string; // 'Login', 'Logout', 'Died', etc.
  hoursSurvived: number;
  skills?: Record<string, number>;
}

export class PerkLogParser extends BaseParser {
  readonly type: ParserType = 'perk';
  private currentYear: number;
  private pendingEntries: Map<string, PerkLogEntry> = new Map();

  constructor(currentYear?: number) {
    super();
    this.currentYear = currentYear ?? new Date().getFullYear();
  }

  /**
   * Parse a single line - handles the 2-line format by combining pairs
   * This returns null for line 1 (stores it), and returns the combined entry on line 2
   */
  parseLine(line: string, lineNumber: number): UnifiedLogEntry | null {
    if (!line.trim()) return null;

    const parsed = this.parsePerkLine(line);
    if (!parsed) return null;

    // Create a unique key for this entry pair
    const key = `${parsed.username}-${parsed.time.getTime()}`;

    // Check if this is a skills line (has skills object)
    if (parsed.skills && Object.keys(parsed.skills).length > 0) {
      // This is line 2 - complete the entry
      const pending = this.pendingEntries.get(key);
      if (pending) {
        // Merge with pending entry
        parsed.event = pending.event;
        this.pendingEntries.delete(key);
      }

      return {
        id: this.generateId(parsed.time, 'skill', lineNumber),
        time: parsed.time,
        source: 'skill',
        username: parsed.username,
        eventType: parsed.event.toLowerCase(),
        level: 'INFO',
        message: `${parsed.event}: ${parsed.username} (${parsed.hoursSurvived}h survived)`,
        details: {
          hoursSurvived: parsed.hoursSurvived,
          skills: parsed.skills,
          coordinates: parsed.coordinates,
        },
      };
    } else {
      // This is line 1 - store for pairing
      this.pendingEntries.set(key, parsed);
      return null;
    }
  }

  /**
   * Parse perk log lines and return structured skill snapshots
   * This method processes all lines together to handle the 2-line format
   */
  parseSkillSnapshots(lines: string[], serverName: string): PZSkillSnapshot[] {
    const snapshots: PZSkillSnapshot[] = [];
    const entries = this.parseAllLines(lines);

    for (const entry of entries) {
      if (entry.skills) {
        snapshots.push({
          time: entry.time,
          server: serverName,
          username: entry.username,
          hoursSurvived: entry.hoursSurvived,
          skills: entry.skills,
        });
      }
    }

    return snapshots;
  }

  /**
   * Parse all lines and return complete entries
   */
  parseAllLines(lines: string[]): PerkLogEntry[] {
    const entries: PerkLogEntry[] = [];
    const lineMap = new Map<string, PerkLogEntry>();

    for (const line of lines) {
      if (!line.trim()) continue;

      const parsed = this.parsePerkLine(line);
      if (!parsed) continue;

      const key = `${parsed.username}-${parsed.time.getTime()}`;

      const existing = lineMap.get(key);
      if (existing) {
        // Merge with existing entry
        if (parsed.skills) {
          existing.skills = parsed.skills;
        } else if (parsed.event) {
          existing.event = parsed.event;
        }
        // Only add to results if we have skills
        if (existing.skills && Object.keys(existing.skills).length > 0) {
          entries.push(existing);
          lineMap.delete(key);
        }
      } else {
        lineMap.set(key, parsed);
      }
    }

    // Add any remaining entries without skills
    for (const entry of lineMap.values()) {
      entries.push(entry);
    }

    return entries;
  }

  /**
   * Parse a single perk log line
   */
  private parsePerkLine(line: string): PerkLogEntry | null {
    // General format: [timestamp] [username][coords][data][Hours Survived: N]
    const generalMatch = line.match(
      /^\[(\d{2}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+)\] \[([^\]]+)\]\[([^\]]+)\]\[([^\]]+)\]\[Hours Survived: (\d+)\]/
    );

    if (!generalMatch) return null;

    const [, timestamp, username, coordStr, dataStr, hoursStr] = generalMatch;
    const time = parsePZTimestamp(timestamp, this.currentYear);

    if (!time) return null;

    const hoursSurvived = parseInt(hoursStr, 10);
    const coordinates = this.parseCoordinates(coordStr);

    // Check if dataStr is an event type or skills
    const knownEvents = ['Login', 'Logout', 'Died', 'Spawn', 'Respawn'];

    if (knownEvents.includes(dataStr)) {
      return {
        time,
        username,
        coordinates,
        event: dataStr,
        hoursSurvived,
        skills: undefined,
      };
    } else {
      // This is a skills line
      const skills = this.parseSkills(dataStr);
      return {
        time,
        username,
        coordinates,
        event: '', // Event is on the paired line
        hoursSurvived,
        skills,
      };
    }
  }

  /**
   * Parse coordinate string: "1234, 5678, 0"
   */
  private parseCoordinates(coordStr: string): { x: number; y: number; z: number } {
    const parts = coordStr.split(',').map(s => parseFloat(s.trim()));
    return {
      x: parts[0] || 0,
      y: parts[1] || 0,
      z: parts[2] || 0,
    };
  }

  /**
   * Parse skills string: "Cooking=0, Fitness=9, Strength=8, ..."
   */
  private parseSkills(skillsStr: string): Record<string, number> {
    const skills: Record<string, number> = {};

    // Split by comma, handle potential edge cases
    const pairs = skillsStr.split(',');

    for (const pair of pairs) {
      const trimmed = pair.trim();
      if (!trimmed) continue;

      const [name, value] = trimmed.split('=').map(s => s.trim());
      if (name && value !== undefined) {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue)) {
          skills[name] = numValue;
        }
      }
    }

    return skills;
  }
}

// Export singleton instance
export const perkLogParser = new PerkLogParser();
