'use client';

import { useState } from 'react';
import { FileArchive } from 'lucide-react';
import { SelectableCard, EmptyState, LoadingSkeleton, FilterTabs } from '@/components/ui';
import { Snapshot } from '@/types';
import { HardDrive } from 'lucide-react';

export interface SelectBackupStepProps {
  snapshots?: Snapshot[];
  isLoading: boolean;
  selectedSnapshot: Snapshot | null;
  onSelect: (snapshot: Snapshot) => void;
}

export function SelectBackupStep({
  snapshots,
  isLoading,
  selectedSnapshot,
  onSelect
}: SelectBackupStepProps) {
  const [filter, setFilter] = useState<string | null>(null);

  const schedules = ['5min', '10min', '30min', 'hourly', 'daily', 'weekly'];
  const filteredSnapshots = filter
    ? snapshots?.filter(s => s.schedule === filter)
    : snapshots;

  // Build tabs for FilterTabs component
  const tabs = schedules
    .map(schedule => {
      const count = snapshots?.filter(s => s.schedule === schedule).length || 0;
      return count > 0 ? { id: schedule, label: schedule, count } : null;
    })
    .filter((tab): tab is { id: string; label: string; count: number } => tab !== null);

  if (isLoading) {
    return <LoadingSkeleton count={4} height="h-20" />;
  }

  if (!snapshots || snapshots.length === 0) {
    return (
      <EmptyState
        icon={FileArchive}
        title="No backups found"
        description="No snapshots available for this server"
      />
    );
  }

  return (
    <div>
      <FilterTabs
        tabs={tabs}
        activeTab={filter}
        onChange={setFilter}
        allLabel="All"
        allCount={snapshots.length}
      />

      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {filteredSnapshots?.map((snapshot) => (
          <SelectableCard
            key={snapshot.path}
            selected={selectedSnapshot?.path === snapshot.path}
            onClick={() => onSelect(snapshot)}
            icon={FileArchive}
            iconColor="text-accent"
            iconBg="bg-accent/10"
          >
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
          </SelectableCard>
        ))}
      </div>
    </div>
  );
}
