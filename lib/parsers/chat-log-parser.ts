/**
 * Chat log parser for Project Zomboid
 * Parses chat.txt for chat messages
 *
 * Format: [12-02-26 16:21:22.677][info] Got message:ChatMessage{chat=Local, author='X', text='Y'}
 */

import { BaseParser, PATTERNS, parsePZTimestamp } from './base-parser';
import type { ParserType, UnifiedLogEntry, PZChatMessage } from '@/types';

interface ChatMessageDetails {
  chatType: string;
  author: string;
  text: string;
  coordinates?: { x: number; y: number; z: number };
}

// Chat type mapping
const CHAT_TYPE_MAP: Record<string, string> = {
  Local: 'Local',
  Global: 'Global',
  Shout: 'Shout',
  Whisper: 'Whisper',
  Radio: 'Radio',
  Faction: 'Faction',
  Safehouse: 'Safehouse',
  General: 'General',
  Say: 'Say',
  Low: 'Low',
};

export class ChatLogParser extends BaseParser {
  readonly type: ParserType = 'chat';
  private currentYear: number;

  constructor(currentYear?: number) {
    super();
    this.currentYear = currentYear ?? new Date().getFullYear();
  }

  parseLine(line: string, lineNumber: number): UnifiedLogEntry | null {
    if (!line.trim()) return null;

    const match = line.match(PATTERNS.chatLog);
    if (!match) return null;

    const [, timestamp, level, message] = match;
    const time = parsePZTimestamp(timestamp, this.currentYear);

    if (!time) return null;

    // Parse chat message format
    const chatDetails = this.parseChatMessage(message);
    if (!chatDetails) {
      // Not a chat message, skip
      return null;
    }

    return {
      id: this.generateId(time, 'chat', lineNumber),
      time,
      source: 'chat',
      username: chatDetails.author,
      eventType: 'chat',
      level: level.toUpperCase() as 'INFO' | 'ERROR' | 'WARN' | 'DEBUG',
      message: chatDetails.text,
      details: {
        chatType: chatDetails.chatType,
        author: chatDetails.author,
        text: chatDetails.text,
        coordinates: chatDetails.coordinates,
      },
    };
  }

  /**
   * Parse chat message details from the log line
   * Format: Got message:ChatMessage{chat=Local, author='X', text='Y'}
   */
  private parseChatMessage(message: string): ChatMessageDetails | null {
    // Match ChatMessage format
    const chatMatch = message.match(/ChatMessage\{chat=(\w+),\s*author='([^']*)',\s*text='([^']*)'/);

    if (!chatMatch) {
      // Try alternate format without ChatMessage wrapper
      const altMatch = message.match(/author='([^']*)'.*text='([^']*)'/);
      if (altMatch) {
        return {
          chatType: 'Unknown',
          author: altMatch[1],
          text: altMatch[2],
        };
      }
      return null;
    }

    const [, chatType, author, text] = chatMatch;

    // Extract coordinates if present
    let coordinates: { x: number; y: number; z: number } | undefined;
    const coordsMatch = message.match(/pos=\((-?[\d.]+),\s*(-?[\d.]+),\s*(-?[\d.]+)\)/);
    if (coordsMatch) {
      coordinates = {
        x: parseFloat(coordsMatch[1]),
        y: parseFloat(coordsMatch[2]),
        z: parseFloat(coordsMatch[3]),
      };
    }

    return {
      chatType: CHAT_TYPE_MAP[chatType] || chatType,
      author,
      text,
      coordinates,
    };
  }

  /**
   * Parse chat log and return structured chat messages
   */
  parseChatMessages(lines: string[]): PZChatMessage[] {
    const messages: PZChatMessage[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const match = line.match(PATTERNS.chatLog);
      if (!match) continue;

      const [, timestamp, , message] = match;
      const time = parsePZTimestamp(timestamp, this.currentYear);
      if (!time) continue;

      const chatDetails = this.parseChatMessage(message);
      if (!chatDetails) continue;

      messages.push({
        time,
        server: '', // Server is determined by log file location
        username: chatDetails.author,
        chatType: chatDetails.chatType,
        message: chatDetails.text,
        coordinates: chatDetails.coordinates,
      });
    }

    return messages;
  }
}

// Export singleton instance
export const chatLogParser = new ChatLogParser();
