'use client';

import { useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Wifi, WifiOff, AlertCircle, Pause, Play } from 'lucide-react';

interface ConsoleViewerProps {
  serverName: string;
  logs: string[];
  isConnected: boolean;
  error?: string | null;
  className?: string;
}

export function ConsoleViewer({
  serverName,
  logs,
  isConnected,
  error,
  className = ''
}: ConsoleViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = React.useState(true);
  const wasAtBottom = useRef(true);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Track if user scrolled up manually
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      wasAtBottom.current = scrollTop + clientHeight >= scrollHeight - 10;
    }
  };

  // Connection status indicator
  const getConnectionStatus = () => {
    if (error) return { icon: AlertCircle, color: 'text-destructive', label: 'Error' };
    if (isConnected) return { icon: Wifi, color: 'text-green-500', label: 'Connected' };
    return { icon: WifiOff, color: 'text-muted-foreground', label: 'Connecting...' };
  };

  const status = getConnectionStatus();
  const StatusIcon = status.icon;

  return (
    <div className={`flex flex-col h-full bg-slate-950 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <TerminalIcon className="w-5 h-5 text-slate-400" />
          <span className="font-mono text-sm text-slate-200">{serverName}</span>
          <span className="text-slate-600">|</span>
          <div className={`flex items-center gap-1.5 ${status.color}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            <span className="text-xs">{status.label}</span>
          </div>
        </div>

        {/* Controls */}
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          title={autoScroll ? 'Pause auto-scroll' : 'Resume auto-scroll'}
        >
          {autoScroll ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{autoScroll ? 'Pause' : 'Resume'}</span>
        </button>
      </div>

      {/* Console output */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 font-mono text-sm"
      >
        {error ? (
          <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Console Error</p>
              <p className="text-sm opacity-80">{error}</p>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            <div className="text-center">
              <TerminalIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Waiting for console output...</p>
              {!isConnected && <p className="text-sm mt-1 opacity-70">Connecting to server...</p>}
            </div>
          </div>
        ) : (
          <div className="space-y-0.5">
            {logs.map((log, index) => (
              <div
                key={index}
                className="text-slate-300 leading-tight whitespace-pre-wrap break-words"
              >
                {log}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with log count */}
      <div className="px-4 py-2 bg-slate-900 border-t border-slate-700 text-xs text-slate-500 flex items-center justify-between">
        <span>{logs.length} lines</span>
        {autoScroll && (
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Live</span>
          </span>
        )}
      </div>
    </div>
  );
}

// Import React for useState
import React from 'react';
