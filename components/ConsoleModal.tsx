'use client';

import { useEffect } from 'react';
import { X, Maximize2 } from 'lucide-react';
import { useConsoleStream } from '@/hooks/use-api';
import { ConsoleViewer } from '@/components/ConsoleViewer';

interface ConsoleModalProps {
  serverName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ConsoleModal({ serverName, isOpen, onClose }: ConsoleModalProps) {
  const { logs, isConnected, error } = useConsoleStream(serverName, isOpen);

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-6xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Maximize2 className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Server Console</h2>
              <p className="text-xs text-muted-foreground">{serverName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-2 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Console Viewer */}
        <div className="flex-1 overflow-hidden">
          <ConsoleViewer
            serverName={serverName}
            logs={logs}
            isConnected={isConnected}
            error={error}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}
