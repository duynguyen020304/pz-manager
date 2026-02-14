'use client';

import {
  X,
  Clock,
  Server,
  User,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Activity,
  Database,
  MessageSquare,
  Sword
} from 'lucide-react';
import type { UnifiedLogEntry } from '@/types';

const LOG_SOURCES = {
  backup: { label: 'Backup', icon: Database, color: 'text-blue-500' },
  player: { label: 'Player', icon: User, color: 'text-green-500' },
  server: { label: 'Server', icon: Server, color: 'text-purple-500' },
  chat: { label: 'Chat', icon: MessageSquare, color: 'text-yellow-500' },
  pvp: { label: 'PvP', icon: Sword, color: 'text-red-500' },
  skill: { label: 'Skills', icon: Activity, color: 'text-cyan-500' },
};

const LEVEL_COLORS = {
  INFO: 'text-primary',
  ERROR: 'text-destructive',
  WARN: 'text-yellow-500',
  DEBUG: 'text-muted-foreground',
};

const LEVEL_BG_COLORS = {
  INFO: 'bg-primary/10',
  ERROR: 'bg-destructive/10',
  WARN: 'bg-yellow-500/10',
  DEBUG: 'bg-muted/10',
};

const STATUS_ICONS = {
  INFO: CheckCircle2,
  ERROR: AlertCircle,
  WARN: AlertTriangle,
  DEBUG: Activity,
};

interface LogDetailSheetProps {
  log: UnifiedLogEntry | null;
  onClose: () => void;
}

export function LogDetailSheet({ log, onClose }: LogDetailSheetProps) {
  if (!log) return null;

  const sourceConfig = LOG_SOURCES[log.source as keyof typeof LOG_SOURCES];
  const StatusIcon = STATUS_ICONS[log.level] || CheckCircle2;

  const formatTimestamp = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-card border-t-2 border-x-2 sm:border-2 border-border rounded-t-2xl sm:rounded-lg max-w-lg w-full max-h-[85vh] sm:max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${LEVEL_BG_COLORS[log.level]}`}>
              <StatusIcon className={`w-5 h-5 ${LEVEL_COLORS[log.level]}`} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground capitalize truncate">
                {log.eventType}
              </h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimestamp(log.time)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground uppercase mb-1 flex items-center gap-1">
                {sourceConfig && <sourceConfig.icon className="w-3 h-3" />}
                Source
              </p>
              <p className="text-sm font-medium text-foreground capitalize">{log.source}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground uppercase mb-1 flex items-center gap-1">
                <Server className="w-3 h-3" />
                Server
              </p>
              <p className="text-sm font-medium text-foreground truncate">{log.server || '-'}</p>
            </div>
          </div>

          {log.username && (
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground uppercase mb-1 flex items-center gap-1">
                <User className="w-3 h-3" />
                Username
              </p>
              <p className="text-sm font-medium text-foreground">{log.username}</p>
            </div>
          )}

          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground uppercase mb-1">Level</p>
            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${LEVEL_BG_COLORS[log.level]} ${LEVEL_COLORS[log.level]}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              <span>{log.level}</span>
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground uppercase mb-1">Message</p>
            <p className="text-sm text-foreground whitespace-pre-wrap break-words">{log.message}</p>
          </div>

          {log.details && Object.keys(log.details).length > 0 && (
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground uppercase mb-1">Details</p>
              <pre className="text-xs text-foreground overflow-x-auto whitespace-pre-wrap break-words">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border bg-muted/20">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
