'use client';

import { useServers, useSnapshots, useRestore, useRestoreJob } from '@/hooks/use-api';
import { useState, useEffect } from 'react';
import { 
  Server, 
  ChevronRight, 
  ChevronLeft, 
  AlertTriangle, 
  CheckCircle2,
  Loader2,
  Clock,
  HardDrive,
  FileArchive,
  RotateCcw,
  ArrowLeft
} from 'lucide-react';
import { Snapshot, Server as ServerType, RestoreJob, ServerJob } from '@/types';

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

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                    currentStep > step.id
                      ? 'bg-green-500 text-white'
                      : currentStep === step.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {currentStep > step.id ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <div className={`ml-3 ${index < steps.length - 1 ? 'mr-8' : ''}`}>
                    <p className={`text-sm font-medium ${
                      currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {step.name}
                    </p>
                    <p className="text-xs text-muted-foreground hidden sm:block">
                      {step.description}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-px mx-4 transition-colors ${
                      currentStep > step.id ? 'bg-green-500' : 'bg-border'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-card border border-border rounded-lg p-6">
            {currentStep === 1 && (
              <Step1SelectServer
                servers={servers}
                isLoading={serversLoading}
                selectedServer={selectedServer}
                onSelect={setSelectedServer}
              />
            )}

            {currentStep === 2 && (
              <Step2SelectBackup
                snapshots={snapshots}
                isLoading={snapshotsLoading}
                selectedSnapshot={selectedSnapshot}
                onSelect={setSelectedSnapshot}
              />
            )}

            {currentStep === 3 && selectedSnapshot && (
              <Step3Preview snapshot={selectedSnapshot} />
            )}

            {currentStep === 4 && selectedServer && selectedSnapshot && (
              <Step4Confirm
                serverName={selectedServer}
                snapshot={selectedSnapshot}
                confirmationText={confirmationText}
                setConfirmationText={setConfirmationText}
              />
            )}

            {currentStep === 5 && job && isRestoreJob(job) && (
              <Step5Progress job={job} onComplete={resetWizard} />
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
            <button
              onClick={handleBack}
              disabled={currentStep === 1 || currentStep === 5}
              className="flex items-center gap-2 px-6 py-3 border border-border rounded-md text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>

            {currentStep < 4 && (
              <button
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && !selectedServer) ||
                  (currentStep === 2 && !selectedSnapshot)
                }
                className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {currentStep === 4 && (
              <button
                onClick={handleRestore}
                disabled={confirmationText !== selectedServer || restoreMutation.isPending}
                className="flex items-center gap-2 px-6 py-3 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {restoreMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-5 h-5" />
                    Restore Server
                  </>
                )}
              </button>
            )}

            {currentStep === 5 && job?.status === 'completed' && (
              <button
                onClick={resetWizard}
                className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Start Over
              </button>
            )}
          </div>
    </div>
  );
}

// Step 1: Select Server
function Step1SelectServer({
  servers,
  isLoading,
  selectedServer,
  onSelect
}: {
  servers?: ServerType[];
  isLoading: boolean;
  selectedServer: string | null;
  onSelect: (server: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!servers || servers.length === 0) {
    return (
      <div className="text-center py-12">
        <Server className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-medium text-foreground mb-2">No servers configured</h3>
        <p className="text-muted-foreground">Add a server first to perform a rollback</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium text-foreground mb-4">Select a server to restore:</h3>
      {servers.map((server) => (
        <button
          key={server.name}
          onClick={() => onSelect(server.name)}
          className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all text-left ${
            selectedServer === server.name
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/30'
          }`}
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            server.valid ? 'bg-green-500/10' : 'bg-yellow-500/10'
          }`}>
            <Server className={`w-5 h-5 ${server.valid ? 'text-green-500' : 'text-yellow-500'}`} />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">{server.name}</p>
            <p className="text-sm text-muted-foreground">{server.path}</p>
          </div>
          {selectedServer === server.name && (
            <CheckCircle2 className="w-5 h-5 text-primary" />
          )}
        </button>
      ))}
    </div>
  );
}

// Step 2: Select Backup
function Step2SelectBackup({
  snapshots,
  isLoading,
  selectedSnapshot,
  onSelect
}: {
  snapshots?: Snapshot[];
  isLoading: boolean;
  selectedSnapshot: Snapshot | null;
  onSelect: (snapshot: Snapshot) => void;
}) {
  const [filter, setFilter] = useState<string | null>(null);
  
  const schedules = ['5min', '10min', '30min', 'hourly', 'daily', 'weekly'];
  const filteredSnapshots = filter 
    ? snapshots?.filter(s => s.schedule === filter)
    : snapshots;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="text-center py-12">
        <FileArchive className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-medium text-foreground mb-2">No backups found</h3>
        <p className="text-muted-foreground">No snapshots available for this server</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter(null)}
          className={`px-3 py-1 rounded-full text-sm transition-colors ${
            filter === null 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          All ({snapshots.length})
        </button>
        {schedules.map(schedule => {
          const count = snapshots.filter(s => s.schedule === schedule).length;
          if (count === 0) return null;
          return (
            <button
              key={schedule}
              onClick={() => setFilter(schedule)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                filter === schedule 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {schedule} ({count})
            </button>
          );
        })}
      </div>

      {/* Snapshots List */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {filteredSnapshots?.map((snapshot) => (
          <button
            key={snapshot.path}
            onClick={() => onSelect(snapshot)}
            className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all text-left ${
              selectedSnapshot?.path === snapshot.path
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/30'
            }`}
          >
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <FileArchive className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground">{snapshot.formattedTimestamp}</p>
                <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                  {snapshot.schedule}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <HardDrive className="w-4 h-4" />
                  {snapshot.formattedSize}
                </span>
                <span>{snapshot.fileCount.toLocaleString()} files</span>
              </div>
            </div>
            {selectedSnapshot?.path === snapshot.path && (
              <CheckCircle2 className="w-5 h-5 text-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// Step 3: Preview
function Step3Preview({ snapshot }: { snapshot: Snapshot }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">Snapshot Date</p>
          <p className="text-lg font-medium text-foreground">{snapshot.formattedTimestamp}</p>
        </div>
        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">Schedule Type</p>
          <p className="text-lg font-medium text-foreground capitalize">{snapshot.schedule}</p>
        </div>
        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">Size</p>
          <p className="text-lg font-medium text-foreground">{snapshot.formattedSize}</p>
        </div>
        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">Files</p>
          <p className="text-lg font-medium text-foreground">{snapshot.fileCount.toLocaleString()}</p>
        </div>
      </div>

      {/* Warnings */}
      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-destructive">Important Warnings</h4>
            <ul className="mt-2 space-y-2 text-sm text-destructive/90">
              <li>• Server should be STOPPED before rollback</li>
              <li>• All changes since this snapshot will be LOST permanently</li>
              <li>• Current data will be backed up to tmp/ before restore</li>
              <li>• Players may lose progress since the snapshot was taken</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-muted/30 rounded-lg p-4">
        <p className="text-sm text-muted-foreground">Snapshot Path:</p>
        <code className="text-xs text-foreground mt-1 block break-all">{snapshot.path}</code>
      </div>
    </div>
  );
}

// Step 4: Confirm
function Step4Confirm({
  serverName,
  snapshot,
  confirmationText,
  setConfirmationText
}: {
  serverName: string;
  snapshot: Snapshot;
  confirmationText: string;
  setConfirmationText: (text: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-8 h-8 text-destructive" />
          <h3 className="text-xl font-bold text-destructive">Final Confirmation</h3>
        </div>
        
        <p className="text-destructive/90 mb-4">
          You are about to restore server <strong className="text-destructive">{serverName}</strong> from snapshot taken on <strong className="text-destructive">{snapshot.formattedTimestamp}</strong>.
        </p>
        
        <div className="space-y-2 text-sm text-destructive/80">
          <p>This action will:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Stop the server (if running)</li>
            <li>Replace all current data with the snapshot</li>
            <li>Delete all progress made since {snapshot.formattedTimestamp}</li>
            <li>Create a backup of current data in tmp/ directory</li>
          </ul>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Type <code className="bg-muted px-1 py-0.5 rounded">{serverName}</code> to confirm:
        </label>
        <input
          type="text"
          value={confirmationText}
          onChange={(e) => setConfirmationText(e.target.value)}
          placeholder={`Type "${serverName}" to confirm`}
          className="w-full px-4 py-3 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-destructive text-foreground"
        />
      </div>
    </div>
  );
}

// Step 5: Progress
function Step5Progress({ job, onComplete }: { job: RestoreJob; onComplete: () => void }) {
  useEffect(() => {
    if (job.status === 'completed' || job.status === 'failed') {
      // Auto-reset after 5 seconds on completion
      const timer = setTimeout(() => {
        onComplete();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [job.status, onComplete]);

  const isRunning = job.status === 'running' || job.status === 'pending';
  const isCompleted = job.status === 'completed';
  const isFailed = job.status === 'failed';

  return (
    <div className="text-center py-8">
      <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
        isRunning ? 'bg-primary/10' :
        isCompleted ? 'bg-green-500/10' :
        'bg-destructive/10'
      }`}>
        {isRunning && <Loader2 className="w-10 h-10 text-primary animate-spin" />}
        {isCompleted && <CheckCircle2 className="w-10 h-10 text-green-500" />}
        {isFailed && <AlertTriangle className="w-10 h-10 text-destructive" />}
      </div>

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
      <div className="max-w-md mx-auto mb-4">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              isCompleted ? 'bg-green-500' :
              isFailed ? 'bg-destructive' :
              'bg-primary'
            }`}
            style={{ width: `${job.progress}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground mt-2">{job.progress}%</p>
      </div>

      {job.error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-sm text-destructive">{job.error}</p>
        </div>
      )}

      {isCompleted && (
        <p className="text-sm text-muted-foreground mt-4">
          Returning to start in 5 seconds...
        </p>
      )}
    </div>
  );
}
