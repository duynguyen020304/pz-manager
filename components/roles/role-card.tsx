'use client';

import { Shield, Users, Pencil, Trash2, Lock } from 'lucide-react';
import { PermissionBadge } from './permission-badge';
import type { Role } from '@/types';

interface RoleCardProps {
  role: Role;
  userCount?: number;
  onEdit: () => void;
  onDelete?: () => void;
}

export function RoleCard({ role, userCount, onEdit, onDelete }: RoleCardProps) {
  const permissionEntries = Object.entries(role.permissions);
  const displayedPermissions = permissionEntries.slice(0, 3);
  const hiddenCount = permissionEntries.length - 3;

  return (
    <div className="bg-card rounded-lg border border-border p-6 hover:border-primary/50 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${role.isSystem ? 'bg-primary/10' : 'bg-secondary'}`}>
            <Shield className={`w-5 h-5 ${role.isSystem ? 'text-primary' : 'text-secondary-foreground'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground capitalize">{role.name}</h3>
              {role.isSystem && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                  <Lock className="w-3 h-3" />
                  System
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{role.description || 'No description'}</p>
          </div>
        </div>
      </div>

      {/* Permissions */}
      <div className="space-y-2 mb-4">
        <h4 className="text-sm font-medium text-muted-foreground">Permissions</h4>
        <div className="flex flex-wrap gap-2">
          {role.name === 'superadmin' ? (
            <PermissionBadge resource="*" actions={['*']} />
          ) : displayedPermissions.length > 0 ? (
            <>
              {displayedPermissions.map(([resource, actions]) => (
                <PermissionBadge key={resource} resource={resource} actions={actions} />
              ))}
              {hiddenCount > 0 && (
                <span className="inline-flex items-center px-2 py-1 bg-muted text-muted-foreground text-xs rounded">
                  +{hiddenCount} more
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-muted-foreground italic">No permissions assigned</span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>
            {userCount !== undefined ? (
              <>
                <strong className="text-foreground">{userCount}</strong> user{userCount !== 1 ? 's' : ''}
              </>
            ) : (
              'Loading...'
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
          {!role.isSystem && onDelete && (
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-destructive/50 text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
