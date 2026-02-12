'use client';

import { WarningBox } from '@/components/ui/warning-box';
import { Snapshot } from '@/types';

export interface PreviewStepProps {
  snapshot: Snapshot;
}

export function PreviewStep({ snapshot }: PreviewStepProps) {
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

      <WarningBox
        variant="destructive"
        title="Important Warnings"
      >
        <ul className="space-y-2">
          <li>• Server should be STOPPED before rollback</li>
          <li>• All changes since this snapshot will be LOST permanently</li>
          <li>• Current data will be backed up to tmp/ before restore</li>
          <li>• Players may lose progress since snapshot was taken</li>
        </ul>
      </WarningBox>

      <div className="bg-muted/30 rounded-lg p-4">
        <p className="text-sm text-muted-foreground">Snapshot Path:</p>
        <code className="text-xs text-foreground mt-1 block break-all">{snapshot.path}</code>
      </div>
    </div>
  );
}
