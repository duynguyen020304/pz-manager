'use client';

import { useState, useEffect } from 'react';
import { useStartServer, useAbortStart, useRestoreJob, useInstallations } from '@/hooks/use-api';
import { ServerJob, RestoreJob } from '@/types';
import {
  X,
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Bug,
  XCircle as XCircleIcon
} from 'lucide-react';

// Type guard to check if job is a ServerJob
function isServerJob(job: ServerJob | RestoreJob | undefined): job is ServerJob {
  return job !== undefined && 'operation' in job;
}

interface ServerStartModalProps {
  serverName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ServerStartModal({ serverName, isOpen, onClose, onSuccess }: ServerStartModalProps) {
  const [debugMode, setDebugMode] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const startServer = useStartServer();
  const abortStart = useAbortStart();
  const { data: job } = useRestoreJob(jobId);
  const { data: installations } = useInstallations();

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
  }, [job, onSuccess, onClose]);

  useEffect(() => {
    if (!job || (job.status !== 'pending' && job.status !== 'running')) {
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [job]);

  // Format elapsed time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Handle start button click
  const handleStart = async () => {
    setElapsedTime(0);
    try {
      const result = await startServer.mutateAsync({
        serverName,
        options: { debug: debugMode }
      });
      setJobId(result.jobId);
    } catch (error) {
      console.error('Failed to start server:', error);
    }
  };

  // Handle abort button click
  const handleAbort = async () => {
    if (jobId) {
      try {
        await abortStart.mutateAsync({ serverName, jobId });
        setJobId(null);
        setDebugMode(false);
      } catch (error) {
        console.error('Failed to abort:', error);
      }
    }
  };

  // Handle close
  const handleClose = () => {
    if (job?.status !== 'running' && job?.status !== 'pending') {
      setJobId(null);
      setDebugMode(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  const isStarting = job?.status === 'pending' || job?.status === 'running';
  const isCompleted = job?.status === 'completed';
  const isFailed = job?.status === 'failed';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Play className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Start Server</h2>
              <p className="text-sm text-muted-foreground">{serverName}</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            disabled={isStarting}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Configuration (only show before starting) */}
          {!isStarting && !isCompleted && !isFailed && (
            <div className="space-y-4">
              {/* Installation */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Installation
                </label>
                <select 
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground disabled:opacity-50"
                  disabled
                >
                  {installations?.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name}
                    </option>
                  )) || (
                    <option value="default">Default (v42.13)</option>
                  )}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Multi-version support coming soon
                </p>
              </div>

              {/* Debug Mode Toggle */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-yellow-500/10 rounded-md flex items-center justify-center">
                    <Bug className="w-4 h-4 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Debug Mode</p>
                    <p className="text-xs text-muted-foreground">Enable verbose logging</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={debugMode}
                    onChange={(e) => setDebugMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          )}

          {/* Progress Section */}
          {isStarting && (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-4">
                <div className="relative">
                  <Loader2 className="w-16 h-16 text-primary animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">
                      {job?.progress || 0}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${job?.progress || 0}%` }}
                  />
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  {job?.message || 'Initializing...'}
                </p>
              </div>

              <div className="text-center text-xs text-muted-foreground">
                Elapsed time: {formatTime(elapsedTime)}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Starting may take several minutes for modded servers
              </p>
            </div>
          )}

          {/* Success State */}
          {isCompleted && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">Server Started!</p>
                <p className="text-sm text-muted-foreground">
                  {serverName} is now running
                </p>
              </div>
              {isServerJob(job) && job.result && (
                <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
                  {job.result.pid && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">PID:</span>
                      <span className="font-mono text-foreground">{job.result.pid}</span>
                    </div>
                  )}
                  {job.result.tmuxSession && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Session:</span>
                      <span className="font-mono text-foreground">{job.result.tmuxSession}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Error State */}
          {isFailed && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">Failed to Start</p>
                <p className="text-sm text-destructive mt-1">
                  {job?.error || 'An unknown error occurred'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-border">
          {!isStarting && !isCompleted && (
            <>
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-border rounded-md text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStart}
                disabled={startServer.isPending}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {startServer.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Start Server
                  </>
                )}
              </button>
            </>
          )}

          {isStarting && (
            <>
              <button
                onClick={handleAbort}
                disabled={abortStart.isPending}
                className="flex-1 px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {abortStart.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Aborting...
                  </>
                ) : (
                  <>
                    <XCircleIcon className="w-4 h-4" />
                    Abort
                  </>
                )}
              </button>
            </>
          )}

          {isFailed && (
            <button
              onClick={() => {
                setJobId(null);
                setDebugMode(false);
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