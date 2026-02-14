'use client';

import {
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Server,
  Download,
  MessageSquare,
  Sword,
  User,
  Activity,
  Database
} from 'lucide-react';
import type { UnifiedLogEntry } from '@/types';

const LOG_SOURCES = {
  backup: { label: 'Backup', icon: Database, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  player: { label: 'Player', icon: User, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  server: { label: 'Server', icon: Server, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  chat: { label: 'Chat', icon: MessageSquare, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
  pvp: { label: 'PvP', icon: Sword, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  skill: { label: 'Skills', icon: Activity, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
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

interface LogCardProps {
  log: UnifiedLogEntry;
  onClick: () => void;
}

export function LogCard({ log, onClick }: LogCardProps) {
  const sourceConfig = LOG_SOURCES[log.source as keyof typeof LOG_SOURCES];
  const StatusIcon = STATUS_ICONS[log.level] || CheckCircle2;

  const formatTimestamp = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-all duration-200 active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${LEVEL_BG_COLORS[log.level]}`}>
          <StatusIcon className={`w-4 h-4 ${LEVEL_COLORS[log.level]}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTimestamp(log.time)}
            </span>
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${LEVEL_BG_COLORS[log.level]} ${LEVEL_COLORS[log.level]}`}>
              {log.level}
            </span>
          </div>
          
          <p className="text-sm text-foreground line-clamp-2 mb-2">
            {log.message}
          </p>
          
          <div className="flex items-center gap-2 flex-wrap">
            {sourceConfig && (
              <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${sourceConfig.bgColor} ${sourceConfig.color}`}>
                <sourceConfig.icon className="w-3 h-3" />
                {sourceConfig.label}
              </span>
            )}
            {log.server && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <Server className="w-3 h-3" />
                {log.server}
              </span>
            )}
            {log.username && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <User className="w-3 h-3" />
                {log.username}
              </span>
            )}
          </div>
        </div>
        
        <Download className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </div>
    </button>
  );
}

export function LogCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-3 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-muted" />
        <div className="flex-1">
          <div className="h-4 w-32 bg-muted rounded mb-2" />
          <div className="h-3 w-full bg-muted rounded mb-1" />
          <div className="h-3 w-3/4 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}
