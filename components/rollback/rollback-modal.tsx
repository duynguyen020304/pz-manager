'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, ArrowLeft, RotateCcw, Loader2 } from 'lucide-react';
import { useServers, useSnapshots, useRestore, useRestoreJob } from '@/hooks/use-api';
import { Snapshot, RestoreJob, ServerJob } from '@/types';
import { Button } from '@/components/ui';
import {
  SelectServerStep,
  SelectBackupStep,
  PreviewStep,
  ConfirmStep,
  ProgressStep
} from './steps';
import { StepIndicator, type Step } from './step-indicator';

// Type guard to check if job is a RestoreJob
function isRestoreJob(job: RestoreJob | ServerJob | undefined): job is RestoreJob {
  return job !== undefined && 'snapshotPath' in job;
}

const steps: Step[] = [
  { id: 1, name: 'Select Server', description: 'Choose which server to restore' },
  { id: 2, name: 'Select Backup', description: 'Choose a snapshot to restore from' },
  { id: 3, name: 'Preview', description: 'Review snapshot details and warnings' },
  { id: 4, name: 'Confirm', description: 'Confirm the restore operation' },
  { id: 5, name: 'Progress', description: 'Monitor restore progress' },
];

interface RollbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialServer?: string | null;
  initialSnapshot?: string | null;
}

export function RollbackModal({
  isOpen,
  onClose,
  initialServer,
  initialSnapshot
}: RollbackModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedServer, setSelectedServer] = useState<string | null>(initialServer || null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [confirmationText, setConfirmationText] = useState('');

  const { data: servers } = useServers();
  const { data: snapshots, isLoading: snapshotsLoading } = useSnapshots(selectedServer || '');
  const restoreMutation = useRestore();
  const { data: job } = useRestoreJob(jobId);

  // Focus trap for accessibility
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Handle keyboard
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'Escape':
        // Only allow escape if not running a restore
        if (job?.status !== 'running' && job?.status !== 'pending') {
          onClose();
        }
        break;
    }
  }, [isOpen, job?.status, onClose]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      // Focus first focusable element after modal opens
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements?.[0] as HTMLElement;
      firstElement?.focus();
    } else if (previousActiveElement.current) {
      // Return focus to trigger element on close
      previousActiveElement.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleRestore = async () => {
    if (!selectedServer || !selectedSnapshot) return;

    try {
      const result = await restoreMutation.mutateAsync({
        serverName: selectedServer,
        snapshotPath: selectedSnapshot.path
      });
      setJobId(result.jobId);
      handleNext();
    } catch (error) {
      console.error('Restore failed:', error);
    }
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setSelectedServer(initialServer || null);
    setSelectedSnapshot(null);
    setJobId(null);
    setConfirmationText('');
  };

  const handleClose = () => {
    // Only allow closing if not running a restore
    if (job?.status !== 'running' && job?.status !== 'pending') {
      resetWizard();
      onClose();
    }
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return selectedServer !== null;
      case 2:
        return selectedSnapshot !== null;
      case 3:
        return true;
      case 4:
        return confirmationText === selectedServer && !restoreMutation.isPending;
      default:
        return false;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // Close on backdrop click (only if not running)
        if (e.target === e.currentTarget && job?.status !== 'running' && job?.status !== 'pending') {
          handleClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="bg-card border border-border rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rollback-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 id="rollback-title" className="text-xl font-semibold text-foreground">
                Rollback Wizard
              </h2>
              <p className="text-sm text-muted-foreground">
                Step {currentStep} of {steps.length}
                {selectedServer && `: ${selectedServer}`}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={job?.status === 'running' || job?.status === 'pending'}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 1 && (
            <SelectServerStep
              servers={servers}
              isLoading={false}
              selectedServer={selectedServer}
              onSelect={setSelectedServer}
            />
          )}

          {currentStep === 2 && (
            <SelectBackupStep
              snapshots={snapshots}
              isLoading={snapshotsLoading}
              selectedSnapshot={selectedSnapshot}
              onSelect={setSelectedSnapshot}
            />
          )}

          {currentStep === 3 && selectedSnapshot && (
            <PreviewStep snapshot={selectedSnapshot} />
          )}

          {currentStep === 4 && selectedServer && selectedSnapshot && (
            <ConfirmStep
              serverName={selectedServer}
              snapshot={selectedSnapshot}
              confirmationText={confirmationText}
              setConfirmationText={setConfirmationText}
              isValid={confirmationText === selectedServer}
            />
          )}

          {currentStep === 5 && job && isRestoreJob(job) && (
            <ProgressStep job={job} onComplete={() => {
              resetWizard();
              onClose();
            }} />
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex justify-between p-6 border-t border-border shrink-0">
          <Button
            variant="secondary"
            leftIcon={<ChevronLeft />}
            onClick={handleBack}
            disabled={currentStep === 1 || currentStep === 5}
          >
            Back
          </Button>

          {currentStep < 4 && (
            <Button
              leftIcon={<ChevronRight />}
              onClick={handleNext}
              disabled={!canGoNext()}
            >
              Next
            </Button>
          )}

          {currentStep === 4 && (
            <Button
              variant="destructive"
              leftIcon={restoreMutation.isPending ? <Loader2 className="animate-spin" /> : <RotateCcw />}
              onClick={handleRestore}
              disabled={!canGoNext()}
            >
              {restoreMutation.isPending ? 'Starting...' : 'Restore Server'}
            </Button>
          )}

          {currentStep === 5 && job?.status === 'completed' && (
            <Button
              leftIcon={<ArrowLeft />}
              onClick={() => {
                resetWizard();
                onClose();
              }}
            >
              Done
            </Button>
          )}

          {currentStep === 5 && job?.status === 'failed' && (
            <Button
              onClick={() => {
                setJobId(null);
                setCurrentStep(4);
              }}
            >
              Try Again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
