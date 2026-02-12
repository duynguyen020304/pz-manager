'use client';

import { WarningBox } from '@/components/ui/warning-box';
import { Snapshot } from '@/types';

export interface ConfirmStepProps {
  serverName: string;
  snapshot: Snapshot;
  confirmationText: string;
  setConfirmationText: (text: string) => void;
  isValid: boolean;
}

export function ConfirmStep({
  serverName,
  snapshot,
  confirmationText,
  setConfirmationText,
  isValid
}: ConfirmStepProps) {
  return (
    <div className="space-y-6">
      <WarningBox variant="destructive" title="Final Confirmation">
        <p className="mb-4">
          You are about to restore server <strong>{serverName}</strong> from snapshot taken on{' '}
          <strong>{snapshot.formattedTimestamp}</strong>.
        </p>

        <div className="space-y-2">
          <p>This action will:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Stop the server (if running)</li>
            <li>Replace all current data with the snapshot</li>
            <li>Delete all progress made since {snapshot.formattedTimestamp}</li>
            <li>Create a backup of current data in tmp/ directory</li>
          </ul>
        </div>
      </WarningBox>

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
          aria-invalid={!isValid && confirmationText.length > 0}
          aria-describedby="confirm-hint"
        />
        {!isValid && confirmationText.length > 0 && (
          <p id="confirm-hint" className="text-sm text-destructive">
            Please type the exact server name to confirm
          </p>
        )}
      </div>
    </div>
  );
}
