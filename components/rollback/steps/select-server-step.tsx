'use client';

import { Server } from 'lucide-react';
import { SelectableCard, EmptyState, LoadingSkeleton } from '@/components/ui';
import { Server as ServerType } from '@/types';

export interface SelectServerStepProps {
  servers?: ServerType[];
  isLoading: boolean;
  selectedServer: string | null;
  onSelect: (server: string) => void;
}

export function SelectServerStep({
  servers,
  isLoading,
  selectedServer,
  onSelect
}: SelectServerStepProps) {
  if (isLoading) {
    return <LoadingSkeleton count={3} height="h-16" />;
  }

  if (!servers || servers.length === 0) {
    return (
      <EmptyState
        icon={Server}
        title="No servers configured"
        description="Add a server first to perform a rollback"
      />
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium text-foreground mb-4">Select a server to restore:</h3>
      {servers.map((server) => (
        <SelectableCard
          key={server.name}
          selected={selectedServer === server.name}
          onClick={() => onSelect(server.name)}
          icon={Server}
          iconColor={server.valid ? 'text-green-500' : 'text-yellow-500'}
          iconBg={server.valid ? 'bg-green-500/10' : 'bg-yellow-500/10'}
        >
          <div className="flex-1">
            <p className="font-medium text-foreground">{server.name}</p>
            <p className="text-sm text-muted-foreground">{server.path}</p>
          </div>
        </SelectableCard>
      ))}
    </div>
  );
}
