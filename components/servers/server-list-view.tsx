'use client';

import React from 'react';
import {
  Play,
  Power,
  Loader2,
  Terminal,
  RotateCcw,
  Trash2,
  Settings,
  Clock,
  CheckCircle2,
  AlertCircle,
  Database,
  FileText,
} from 'lucide-react';
import { Server, ServerStatus } from '@/types';

interface ServerListViewProps {
  servers: Server[];
  statuses: Record<string, ServerStatus>;
  onStart: (name: string) => void;
  onStop: (name: string) => void;
  onConsole: (name: string) => void;
  onRollback: (name: string) => void;
  onDelete: (name: string) => void;
  onQuickConfig: (name: string) => void;
  loadingActions?: Record<string, boolean>;
}

export function ServerListView({
  servers,
  statuses,
  onStart,
  onStop,
  onConsole,
  onRollback,
  onDelete,
  onQuickConfig,
  loadingActions = {},
}: ServerListViewProps) {
  const getStatusConfig = (state: ServerStatus['state']) => {
    switch (state) {
      case 'running':
        return {
          icon: Play,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          label: 'Online',
        };
      case 'starting':
        return {
          icon: Loader2,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          label: 'Starting...',
        };
      case 'stopping':
        return {
          icon: Loader2,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          label: 'Stopping...',
        };
      default:
        return {
          icon: Power,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted',
          label: 'Offline',
        };
    }
  };

  return (
    <div className="space-y-2">
      {servers.map((server) => {
        const status = statuses[server.name];
        const state = status?.state || 'stopped';
        const config = getStatusConfig(state);
        const Icon = config.icon;
        const isLoading = loadingActions[server.name];

        return (
          <div
            key={server.name}
            className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary/30 transition-all"
          >
            {/* Icon and Status */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  server.valid ? 'bg-green-500/10' : 'bg-yellow-500/10'
                }`}
              >
                {server.valid ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground truncate">
                    {server.name}
                  </span>
                  <div
                    className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${config.bgColor} ${config.color}`}
                  >
                    <Icon
                      className={`w-3 h-3 ${state === 'starting' || state === 'stopping' ? 'animate-spin' : ''}`}
                    />
                    {config.label}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground"
                >
                  <span className="truncate">{server.path}</span>
                  {status?.uptime && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {status.uptime}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="hidden md:flex items-center gap-1">
              {server.hasIni && (
                <div className="px-2 py-1 rounded bg-blue-500/10 text-blue-500 text-xs flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" />
                  Config
                </div>
              )}
              {server.hasDb && (
                <div className="px-2 py-1 rounded bg-purple-500/10 text-purple-500 text-xs flex items-center gap-1"
                >
                  <Database className="w-3 h-3" />
                  DB
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => onQuickConfig(server.name)}
                className="p-2 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                aria-label="Quick configure"
              >
                <Settings className="w-4 h-4" />
              </button>

              {state === 'stopped' ? (
                <button
                  onClick={() => onStart(server.name)}
                  disabled={isLoading}
                  className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50"
                  aria-label="Start server"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
              ) : (
                <button
                  onClick={() => onStop(server.name)}
                  disabled={isLoading || state === 'stopping'}
                  className="p-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all disabled:opacity-50"
                  aria-label="Stop server"
                >
                  {isLoading || state === 'stopping' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Power className="w-4 h-4" />
                  )}
                </button>
              )}

              <button
                onClick={() => onConsole(server.name)}
                disabled={state === 'stopped'}
                className="hidden sm:flex p-2 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all disabled:opacity-50"
                aria-label="Open console"
              >
                <Terminal className="w-4 h-4" />
              </button>

              <button
                onClick={() => onRollback(server.name)}
                disabled={state !== 'stopped'}
                className="hidden sm:flex p-2 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all disabled:opacity-50"
                aria-label="Rollback"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => onDelete(server.name)}
                className="p-2 rounded-lg border border-border hover:border-destructive hover:bg-destructive/10 transition-all text-muted-foreground hover:text-destructive"
                aria-label="Delete server"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ServerListView;
