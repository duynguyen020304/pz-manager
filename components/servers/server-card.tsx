'use client';

import { Server as ServerType, ServerStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { ServerStatusBadge } from '@/components/ServerStatusBadge';
import { ModList } from '@/components/ModList';
import { useServerMods } from '@/hooks/use-api';
import {
  CheckCircle2,
  AlertCircle,
  FileText,
  Database,
  Play,
  Power,
  Terminal,
  RotateCcw,
  Trash2,
  Loader2,
  Package
} from 'lucide-react';

interface ServerCardProps {
  server: ServerType;
  status?: ServerStatus;
  onDelete: () => void;
  onStart: () => void;
  onStop: () => void;
  onConsole: () => void;
  onRollback: () => void;
  onManageMods: () => void;
}

export function ServerCard({
  server,
  status,
  onDelete,
  onStart,
  onStop,
  onConsole,
  onRollback,
  onManageMods
}: ServerCardProps) {
  const { data: mods, isLoading: isLoadingMods } = useServerMods(server.name);
  
  const isRunning = status?.state === 'running';
  const isStarting = status?.state === 'starting';
  const isStopping = status?.state === 'stopping';
  const isStopped = status?.state === 'stopped' || !status;
  const isLoading = isStarting || isStopping;

  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-all duration-200">
      {/* Header Section - Compact */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Server Icon */}
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            server.valid ? 'bg-green-500/10' : 'bg-yellow-500/10'
          }`}>
            {server.valid ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-500" />
            )}
          </div>
          
          {/* Server Info */}
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-foreground truncate">{server.name}</h3>
            <p className="text-xs text-muted-foreground truncate">{server.path}</p>
            
            {/* Compact Tags */}
            <div className="flex flex-wrap items-center gap-1 mt-1.5">
              {server.valid && (
                <span className="inline-flex items-center gap-1 text-xs bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded">
                  <CheckCircle2 className="w-3 h-3" />
                  Valid
                </span>
              )}
              {server.hasIni && (
                <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                  <FileText className="w-3 h-3" />
                  Config
                </span>
              )}
              {server.hasDb && (
                <span className="inline-flex items-center gap-1 text-xs bg-accent/10 text-accent px-1.5 py-0.5 rounded">
                  <Database className="w-3 h-3" />
                  DB
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Status Badge */}
        <div className="flex-shrink-0">
          {status ? (
            <ServerStatusBadge status={status} />
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border bg-muted border-border text-muted-foreground text-xs">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Loading</span>
            </span>
          )}
        </div>
      </div>

      {/* Server Stats - Inline when running */}
      {isRunning && status && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs bg-muted/30 rounded-md px-2.5 py-1.5">
          {status.pid && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="uppercase tracking-wide text-[10px]">PID:</span>
              <span className="font-mono text-foreground">{status.pid}</span>
            </div>
          )}
          {status.uptime && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="uppercase tracking-wide text-[10px]">Uptime:</span>
              <span className="text-foreground">{status.uptime}</span>
            </div>
          )}
          {status.ports && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="uppercase tracking-wide text-[10px]">Port:</span>
              <span className="font-mono text-foreground">
                {status.actualPort || status.ports.defaultPort}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Mods - Compact inline */}
      <ModList 
        mods={mods ?? { serverName: server.name, mods: [], workshopItems: [], maps: ['Muldraugh, KY'] }} 
        isLoading={isLoadingMods} 
      />

      {/* Manage Mods Button */}
      <Button
        onClick={onManageMods}
        variant="secondary"
        size="sm"
        className="w-full mt-2"
        leftIcon={<Package className="w-4 h-4" />}
      >
        Manage Mods
      </Button>

      {/* Actions Grid - Responsive */}
      <div className="mt-3 pt-3 border-t border-border">
        {/* Primary Action Row */}
        <div className="flex gap-2 mb-2">
          {(isStopped || isStarting) && (
            <Button
              onClick={onStart}
              disabled={isStarting}
              className="flex-1"
              size="sm"
              leftIcon={isStarting ? <Loader2 className="animate-spin" /> : <Play className="w-4 h-4" />}
            >
              {isStarting ? 'Starting...' : 'Start'}
            </Button>
          )}
          
          {(isRunning || isStopping) && (
            <Button
              onClick={onStop}
              disabled={isStopping}
              variant="destructive"
              className="flex-1"
              size="sm"
              leftIcon={isStopping ? <Loader2 className="animate-spin" /> : <Power className="w-4 h-4" />}
            >
              {isStopping ? 'Stopping...' : 'Stop'}
            </Button>
          )}

          {/* Secondary Actions - Icon buttons on mobile, text on larger screens */}
          <Button
            onClick={onRollback}
            disabled={isRunning || isLoading}
            variant="secondary"
            size="sm"
            className="hidden sm:flex-1 sm:flex"
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Rollback
          </Button>
          
          <Button
            onClick={onConsole}
            disabled={!isRunning}
            variant="secondary"
            size="sm"
            className="hidden sm:flex-1 sm:flex"
            leftIcon={<Terminal className="w-4 h-4" />}
          >
            Console
          </Button>

          {/* Delete - Icon only */}
          <Button
            onClick={onDelete}
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            leftIcon={<Trash2 className="w-4 h-4" />}
          />
        </div>

        {/* Mobile Secondary Actions */}
        <div className="flex gap-2 sm:hidden">
          <Button
            onClick={onRollback}
            disabled={isRunning || isLoading}
            variant="secondary"
            size="sm"
            className="flex-1"
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Rollback
          </Button>
          
          <Button
            onClick={onConsole}
            disabled={!isRunning}
            variant="secondary"
            size="sm"
            className="flex-1"
            leftIcon={<Terminal className="w-4 h-4" />}
          >
            Console
          </Button>
        </div>
      </div>
    </div>
  );
}
