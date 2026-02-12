'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useServers, useSnapshots, useRestore, useRestoreJob } from '@/hooks/use-api';
import { Snapshot, RestoreJob, ServerJob } from '@/types';
import { Button } from '@/components/ui';
import { SelectServerStep, SelectBackupStep, PreviewStep, ConfirmStep, ProgressStep } from '@/components/rollback';
import { StepIndicator } from '@/components/rollback';

// Type guard to check if job is a RestoreJob
function isRestoreJob(job: RestoreJob | ServerJob | undefined): job is RestoreJob {
  return job !== undefined && 'snapshotPath' in job;
}

const steps = [
  { id: 1, name: 'Select Server', description: 'Choose which server to restore' },
  { id: 2, name: 'Select Backup', description: 'Choose a snapshot to restore from' },
  { id: 3, name: 'Preview', description: 'Review snapshot details and warnings' },
  { id: 4, name: 'Confirm', description: 'Confirm the restore operation' },
  { id: 5, name: 'Progress', description: 'Monitor restore progress' },
];

export default function RollbackPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [confirmationText, setConfirmationText] = useState('');

  const { data: servers, isLoading: serversLoading } = useServers();
  const { data: snapshots, isLoading: snapshotsLoading } = useSnapshots(selectedServer || '');
  const restoreMutation = useRestore();
  const { data: job } = useRestoreJob(jobId);

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
    setSelectedServer(null);
    setSelectedSnapshot(null);
    setJobId(null);
    setConfirmationText('');
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

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <RotateCcw className="w-8 h-8 text-primary" />
          Rollback Wizard
        </h1>
        <p className="text-muted-foreground mt-2">
          Restore your Project Zomboid server from a backup snapshot
        </p>
      </div>

      {/* Step Indicator - Compact variant */}
      <StepIndicator steps={steps} currentStep={currentStep} variant="compact" />

      {/* Step Content */}
      <div className="bg-card border border-border rounded-lg p-6">
        {currentStep === 1 && (
          <SelectServerStep
            servers={servers}
            isLoading={serversLoading}
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
          <ProgressStep job={job} onComplete={resetWizard} />
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <Button
          variant="secondary"
          onClick={handleBack}
          disabled={currentStep === 1 || currentStep === 5}
        >
          Back
        </Button>

        {currentStep < 4 && (
          <Button
            onClick={handleNext}
            disabled={!canGoNext()}
          >
            Next
          </Button>
        )}

        {currentStep === 4 && (
          <Button
            variant="destructive"
            onClick={handleRestore}
            disabled={!canGoNext()}
          >
            {restoreMutation.isPending ? 'Starting...' : 'Restore Server'}
          </Button>
        )}

        {currentStep === 5 && job?.status === 'completed' && (
          <Button onClick={resetWizard}>
            Start Over
          </Button>
        )}
      </div>
    </div>
  );
}
