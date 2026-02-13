/**
 * Backup system log parser
 * Parses backup.log, restore.log, and rollback-cli.log files
 */

import { BaseParser, PATTERNS, parseBackupTimestamp } from './base-parser';
import type { ParserType, UnifiedLogEntry } from '@/types';

interface BackupLogDetails {
  server?: string;
  schedule?: string;
  dryRun?: boolean;
  sourceSize?: string;
  compressedSize?: string;
  ratio?: string;
  duration?: number;
  snapshotPath?: string;
  error?: string;
}

export class BackupLogParser extends BaseParser {
  readonly type: ParserType;
  private logType: 'backup' | 'restore' | 'rollback-cli';

  constructor(logType: 'backup' | 'restore' | 'rollback-cli' = 'backup') {
    super();
    this.logType = logType;
    this.type = logType === 'rollback-cli' ? 'restore' : logType;
  }

  parseLine(line: string, lineNumber: number): UnifiedLogEntry | null {
    if (!line.trim()) return null;

    const match = line.match(PATTERNS.backupLog);
    if (!match) return null;

    const [, timestamp, level, message] = match;
    const time = parseBackupTimestamp(timestamp);

    if (!time) return null;

    // Extract structured details from the message
    const details = this.parseMessageDetails(message);

    // Determine event type based on message content
    const eventType = this.determineEventType(message, details);

    return {
      id: this.generateId(time, this.logType, lineNumber),
      time,
      source: this.logType === 'rollback-cli' ? 'backup' : this.logType,
      server: details.server,
      eventType,
      level: level.toUpperCase() as 'INFO' | 'ERROR' | 'WARN',
      message: this.formatMessage(message, details),
      details: {
        ...details,
        logType: this.logType,
      },
    };
  }

  private parseMessageDetails(message: string): BackupLogDetails {
    const details: BackupLogDetails = {};

    // Extract server name: "Server: servertest"
    const serverMatch = message.match(/Server:\s*([^,]+)/i);
    if (serverMatch) {
      details.server = serverMatch[1].trim();
    }

    // Extract schedule: "Schedule: hourly"
    const scheduleMatch = message.match(/Schedule:\s*([^,]+)/i);
    if (scheduleMatch) {
      details.schedule = scheduleMatch[1].trim();
    }

    // Extract dry-run status
    const dryRunMatch = message.match(/Dry-run:\s*(true|false)/i);
    if (dryRunMatch) {
      details.dryRun = dryRunMatch[1].toLowerCase() === 'true';
    }

    // Extract source size: "Source size: 20.00 MB"
    const sourceSizeMatch = message.match(/Source size:\s*([\d.]+\s*[KMGT]?B)/i);
    if (sourceSizeMatch) {
      details.sourceSize = sourceSizeMatch[1];
    }

    // Extract backup size: "3.00 MB"
    const backupSizeMatch = message.match(/(\d+\.?\d*\s*[KMGT]?B)/);
    if (backupSizeMatch && (message.includes('created:') || message.includes('completed'))) {
      details.compressedSize = backupSizeMatch[1];
    }

    // Extract compression ratio: "ratio: 6.7x"
    const ratioMatch = message.match(/ratio:\s*([\d.]+)x/i);
    if (ratioMatch) {
      details.ratio = ratioMatch[1];
    }

    // Extract snapshot path
    const pathMatch = message.match(/(\/[^\s]+\.(?:tar\.zst|tar\.gz|zip))/);
    if (pathMatch) {
      details.snapshotPath = pathMatch[1];
    }

    // Extract error message
    if (message.toLowerCase().includes('error') || message.toLowerCase().includes('failed')) {
      details.error = message;
    }

    // Extract duration from restore logs
    const durationMatch = message.match(/completed in\s*([\d.]+)\s*(seconds?|minutes?|ms)/i);
    if (durationMatch) {
      const value = parseFloat(durationMatch[1]);
      const unit = durationMatch[2].toLowerCase();
      if (unit.startsWith('minute')) {
        details.duration = value * 60;
      } else if (unit.startsWith('ms')) {
        details.duration = value / 1000;
      } else {
        details.duration = value;
      }
    }

    return details;
  }

  private determineEventType(message: string, _details: BackupLogDetails): string {
    const lowerMessage = message.toLowerCase();

    if (this.logType === 'backup') {
      if (lowerMessage.includes('started')) return 'backup_started';
      if (lowerMessage.includes('completed')) return 'backup_completed';
      if (lowerMessage.includes('failed')) return 'backup_failed';
      if (lowerMessage.includes('summary')) return 'backup_summary';
      if (lowerMessage.includes('cleanup')) return 'retention_cleanup';
      if (lowerMessage.includes('verifying')) return 'integrity_check';
    } else if (this.logType === 'restore') {
      if (lowerMessage.includes('started')) return 'restore_started';
      if (lowerMessage.includes('completed')) return 'restore_completed';
      if (lowerMessage.includes('failed')) return 'restore_failed';
      if (lowerMessage.includes('emergency backup')) return 'emergency_backup';
      if (lowerMessage.includes('verifying')) return 'integrity_check';
    } else {
      if (lowerMessage.includes('rollback')) return 'rollback';
      if (lowerMessage.includes('selected')) return 'snapshot_selected';
    }

    // Fallback based on level
    if (lowerMessage.includes('error')) return 'error';
    if (lowerMessage.includes('warning') || lowerMessage.includes('warn')) return 'warning';

    return 'info';
  }

  private formatMessage(message: string, details: BackupLogDetails): string {
    // Clean up the message for display
    let formatted = message;

    // Remove redundant server/schedule info if already extracted
    if (details.server) {
      formatted = formatted.replace(/Server:\s*[^,]+,?\s*/i, '');
    }
    if (details.schedule) {
      formatted = formatted.replace(/Schedule:\s*[^,]+,?\s*/i, '');
    }
    if (details.dryRun !== undefined) {
      formatted = formatted.replace(/Dry-run:\s*(true|false),?\s*/i, '');
    }

    // Clean up extra spaces and commas
    formatted = formatted.replace(/,\s*$/, '').replace(/\s+/g, ' ').trim();

    return formatted;
  }
}

// Factory function to create appropriate parser based on log type
export function createBackupParser(logType: 'backup' | 'restore' | 'rollback-cli'): BackupLogParser {
  return new BackupLogParser(logType);
}
