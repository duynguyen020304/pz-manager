'use client';

import { useStopServer, useRestoreJob } from '@/hooks/use-api';
import { useState, useEffect } from 'react';
import { 
  X, 
  AlertTriangle, 
  Loader2, 
  Power,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface StopConfirmModalProps {
  serverName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function StopConfirmModal({ serverName, isOpen, onClose, onSuccess }: StopConfirmModalProps) {
  const [jobId, setJobId] = useState<string | null>(null);
  
  const stopServer = useStopServer();
  const { data: job } = useRestoreJob(jobId);

  // Handle successful completion
  useEffect(() => {
    if (job?.status === 'completed') {
      const timer = setTimeout(() => {
        onSuccess?.();
        onClose();
        setJobId(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [job?.status, onSuccess, onClose]);

  // Handle stop button click
  const handleStop = async () => {
    try {
      const result = await stopServer.mutateAsync(serverName);
      setJobId(result.jobId);
    } catch (error) {
      console.error('Failed to stop server:', error);
    }
  };

  // Handle close
  const handleClose = () => {
    if (job?.status !== 'running' && job?.status !== 'pending') {
      setJobId(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  const isStopping = job?.status === 'pending' || job?.status === 'running';
  const isCompleted = job?.status === 'completed';
  const isFailed = job?.status === 'failed';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
              <Power className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Stop Server</h2>
              <p className="text-sm text-muted-foreground">{serverName}</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            disabled={isStopping}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Initial Confirmation State */}
          {!isStopping && !isCompleted && !isFailed && (
            <>
              <div className="flex items-start gap-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    Warning
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This will save the current game state and gracefully shut down the server. 
                    All connected players will be disconnected.
                  </p>
                </div>
              </div>

              <div className="text-sm text-muted-foreground space-y-2">
                <p>The shutdown process will:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Save the current world state</li>
                  <li>Notify all connected players</li>
                  <li>Wait for graceful shutdown (up to 15 seconds)</li>
                  <li>Terminate the server process if needed</li>
                </ol>
              </div>
            </>
          )}

          {/* Stopping State */}
          {isStopping && (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-4">
                <div className="relative">
                  <Loader2 className="w-16 h-16 text-yellow-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-yellow-500">
                      {job?.progress || 0}%
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-500 transition-all duration-500 ease-out"
                    style={{ width: `${job?.progress || 0}%` }}
                  />
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  {job?.message || 'Stopping server...'}
                </p>
              </div>
            </div>
          )}

          {/* Success State */}
          {isCompleted && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">Server Stopped</p>
                <p className="text-sm text-muted-foreground">
                  {serverName} has been shut down successfully
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {isFailed && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">Failed to Stop</p>
                <p className="text-sm text-destructive mt-1">
                  {job?.error || 'An unknown error occurred'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-border">
          {!isStopping && !isCompleted && (
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-border rounded-md text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          )}
          
          {!isStopping && !isCompleted && !isFailed && (
            <button
              onClick={handleStop}
              disabled={stopServer.isPending}
              className="flex-1 px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {stopServer.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Stopping...
                </>
              ) : (
                <>
                  <Power className="w-4 h-4" />
                  Save & Stop
                </>
              )}
            </button>
          )}
          
          {isFailed && (
            <button
              onClick={() => {
                setJobId(null);
              }}
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors"
            >
              Try Again
            </button>
          )}
          
          {isCompleted && (
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}