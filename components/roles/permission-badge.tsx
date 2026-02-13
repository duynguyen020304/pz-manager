'use client';

import { getResourceLabel, getActionLabel } from '@/lib/permission-constants';

interface PermissionBadgeProps {
  resource: string;
  actions: string[];
}

export function PermissionBadge({ resource, actions }: PermissionBadgeProps) {
  const resourceLabel = getResourceLabel(resource);
  const actionsLabel = actions.map(a => getActionLabel(a)).join(', ');

  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded text-xs">
      <span className="font-medium">{resourceLabel}</span>
      <span className="text-muted-foreground">:</span>
      <span className="text-muted-foreground">{actionsLabel}</span>
    </div>
  );
}
