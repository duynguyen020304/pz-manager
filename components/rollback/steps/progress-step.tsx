'use client';

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ProgressBar } from '@/components/ui/progress-bar';
import { WarningBox } from '@/components/ui/warning-box';
import { RestoreJob } from '@/types';

export interface ProgressStepProps {
  job: RestoreJob;
  onComplete?: () => void;
  autoResetDelay?: number;
}

type RestoreStage = {
  id: string;
  label: string;
  threshold: number;
};

const restoreStages: RestoreStage[] = [
  { id: 'emergency', label: 'Creating emergency backup', threshold: 10 },
  { id: 'verify', label: 'Verifying checksums', threshold: 20 },
  { id: 'stopping', label: 'Stopping server', threshold: 30 },
  { id: 'extracting', label: 'Extracting snapshot', threshold: 60 },
  { id: 'restoring', label: 'Restoring files', threshold: 80 },
  { id: 'verifying', label: 'Verifying databases', threshold: 95 },
  { id: 'complete', label: 'Restore complete', threshold: 100 }
];

export function ProgressStep({
  job,
  onComplete,
  autoResetDelay = 5000
}: ProgressStepProps) {
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (job.status === 'completed' && onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, autoResetDelay);
      return () => clearTimeout(timer);
    }
  }, [job.status, onComplete, autoResetDelay]);

  const isRunning = job.status === 'running' || job.status === 'pending';
  const isCompleted = job.status === 'completed';
  const isFailed = job.status === 'failed';

  const currentStage = restoreStages.find(s => job.progress < s.threshold) || restoreStages[restoreStages.length - 1];
  const completedStages = restoreStages.filter(s => job.progress >= s.threshold);

  return (
    <div className="text-center py-8">
      {/* Status Icon */}
      <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
        isRunning ? 'bg-primary/10' :
        isCompleted ? 'bg-green-500/10' :
        'bg-destructive/10'
      }`}>
        {isRunning && <Loader2 className="w-10 h-10 text-primary animate-spin" />}
        {isCompleted && <CheckCircle2 className="w-10 h-10 text-green-500" />}
        {isFailed && <AlertTriangle className="w-10 h-10 text-destructive" />}
      </div>

      {/* Status Text */}
      <h3 className={`text-xl font-bold mb-2 ${
        isRunning ? 'text-foreground' :
        isCompleted ? 'text-green-500' :
        'text-destructive'
      }`}>
        {isRunning && 'Restoring Server...'}
        {isCompleted && 'Restore Completed!'}
        {isFailed && 'Restore Failed'}
      </h3>

      <p className="text-muted-foreground mb-6">{job.message}</p>

      {/* Progress Bar */}
      <div className="max-w-md mx-auto mb-6">
        <ProgressBar
          progress={job.progress}
          color={isCompleted ? 'success' : isFailed ? 'destructive' : 'primary'}
          showPercentage
          size="md"
        />
      </div>

      {/* Stage Indicators */}
      {isRunning && (
        <div className="max-w-md mx-auto mb-6">
          <p className="text-sm text-muted-foreground mb-3">Restore progress:</p>
          <div className="flex items-center justify-center gap-1">
            {restoreStages.map((stage, index) => (
              <div
                key={stage.id}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  job.progress >= stage.threshold
                    ? 'bg-green-500 w-4'
                    : job.progress > (restoreStages[index - 1]?.threshold || 0)
                      ? 'bg-primary w-6 animate-pulse'
                      : 'bg-muted w-2'
                }`}
                title={stage.label}
                aria-label={stage.label}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {currentStage.label}
          </p>
        </div>
      )}

      {/* Error Display */}
      {isFailed && job.error && (
        <>
          {!showError ? (
            <button
              onClick={() => setShowError(true)}
              className="text-sm text-destructive underline mb-4"
            >
              View error details
            </button>
          ) : (
            <WarningBox variant="destructive" title="Error Details" className="max-w-md mx-auto mb-4">
              <p className="whitespace-pre-wrap text-sm">{job.error}</p>
            </WarningBox>
          )}
        </>
      )}

      {/* Auto-redirect Notice */}
      {isCompleted && onComplete && (
        <p className="text-sm text-muted-foreground mt-4">
          Returning to start in {autoResetDelay / 1000} seconds...
        </p>
      )}
    </div>
  );
}
