'use client';

import { useState, useRef, useEffect } from 'react';
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
  Package,
  Settings,
  Menu,
  X
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
  onQuickConfig?: () => void;
}

export function ServerCard({
  server,
  status,
  onDelete,
  onStart,
  onStop,
  onConsole,
  onRollback,
  onManageMods,
  onQuickConfig
}: ServerCardProps) {
  const { data: mods, isLoading: isLoadingMods } = useServerMods(server.name);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const isRunning = status?.state === 'running';
  const isStarting = status?.state === 'starting';
  const isStopping = status?.state === 'stopping';
  const isStopped = status?.state === 'stopped' || !status;
  const isLoading = isStarting || isStopping;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

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
        
        {/* Status Badge and Menu */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {status ? (
            <ServerStatusBadge status={status} />
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border bg-muted border-border text-muted-foreground text-xs">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Loading</span>
            </span>
          )}
          
          {/* Hamburger Menu Button */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-2 rounded-md hover:bg-muted transition-colors"
              aria-label={showDropdown ? 'Close menu' : 'Open menu'}
            >
              {showDropdown ? (
                <X className="w-5 h-5 text-foreground" />
              ) : (
                <Menu className="w-5 h-5 text-foreground" />
              )}
            </button>
            
            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 top-full mt-1 w-[200px] bg-card border border-border rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="py-1">
                  <button
                    onClick={() => {
                      onManageMods();
                      setShowDropdown(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <Package className="w-4 h-4 text-muted-foreground" />
                    Manage Mods
                  </button>
                  
                  {onQuickConfig && (
                    <button
                      onClick={() => {
                        onQuickConfig();
                        setShowDropdown(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      Configure Settings
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      onRollback();
                      setShowDropdown(false);
                    }}
                    disabled={isRunning || isLoading}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-4 h-4 text-muted-foreground" />
                    Rollback Server
                  </button>
                  
                  <button
                    onClick={() => {
                      onConsole();
                      setShowDropdown(false);
                    }}
                    disabled={!isRunning}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Terminal className="w-4 h-4 text-muted-foreground" />
                    Open Console
                  </button>
                  
                  <div className="border-t border-border my-1" />
                  
                  <button
                    onClick={() => {
                      onDelete();
                      setShowDropdown(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Server
                  </button>
                </div>
              </div>
            )}
          </div>
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

      {/* Start/Stop Button - Always Visible */}
      <div className="mt-3 pt-3 border-t border-border">
        {(isStopped || isStarting) && (
          <Button
            onClick={onStart}
            disabled={isStarting}
            className="w-full"
            size="sm"
            leftIcon={isStarting ? <Loader2 className="animate-spin" /> : <Play className="w-4 h-4" />}
          >
            {isStarting ? 'Starting...' : 'Start Server'}
          </Button>
        )}
        
        {(isRunning || isStopping) && (
          <Button
            onClick={onStop}
            disabled={isStopping}
            variant="destructive"
            className="w-full"
            size="sm"
            leftIcon={isStopping ? <Loader2 className="animate-spin" /> : <Power className="w-4 h-4" />}
          >
            {isStopping ? 'Stopping...' : 'Stop Server'}
          </Button>
        )}
      </div>
    </div>
  );
}
