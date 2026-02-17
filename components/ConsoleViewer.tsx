'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [autoScroll, setAutoScroll] = useState(true);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-slate-900 border-b border-slate-700">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <TerminalIcon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 flex-shrink-0" />
          <span className="font-mono text-xs sm:text-sm text-slate-200 truncate">{serverName}</span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <div className={`flex items-center gap-1 sm:gap-1.5 ${status.color} flex-shrink-0`}>
            <StatusIcon className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            <span className="text-xs hidden sm:inline">{status.label}</span>
          </div>
        </div>

        {/* Controls */}
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors min-h-[44px] sm:min-h-0 self-start sm:self-auto"
          title={autoScroll ? 'Pause auto-scroll' : 'Resume auto-scroll'}
        >
          {autoScroll ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span className="hidden sm:inline">{autoScroll ? 'Pause' : 'Resume'}</span>
        </button>
      </div>

      {/* Console output */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-2 sm:p-4 font-mono text-xs sm:text-sm"
      >
        {error ? (
          <div className="flex items-start sm:items-center gap-3 p-3 sm:p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive">
            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 mt-0.5 sm:mt-0" />
            <div className="min-w-0">
              <p className="font-medium text-sm sm:text-base">Console Error</p>
              <p className="text-xs sm:text-sm opacity-80 break-words">{error}</p>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 p-4">
            <div className="text-center">
              <TerminalIcon className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 opacity-50" />
              <p className="text-sm sm:text-base">Waiting for console output...</p>
              {!isConnected && <p className="text-xs sm:text-sm mt-1 opacity-70">Connecting to server...</p>}
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
      <div className="px-3 sm:px-4 py-2 sm:py-3 bg-slate-900 border-t border-slate-700 text-xs sm:text-sm text-slate-500 flex items-center justify-between">
        <span>{logs.length} lines</span>
        {autoScroll && (
          <span className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
            <span>Live</span>
          </span>
        )}
      </div>
    </div>
  );
}
