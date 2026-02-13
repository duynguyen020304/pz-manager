'use client';


import { UserCog, Plus, RefreshCw, Shield, Users } from 'lucide-react';
import { useRoles } from '@/hooks/use-api-users';

const PERMISSION_LABELS: Record<string, string> = {
  servers: 'Servers',
  backups: 'Backups',
  schedules: 'Schedules',
  settings: 'Settings',
  logs: 'Logs',
  users: 'Users',
  roles: 'Roles',
};

const ACTION_LABELS: Record<string, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  start: 'Start',
  stop: 'Stop',
  configure: 'Configure',
  restore: 'Restore',
};

function PermissionBadge({ resource, actions }: { resource: string; actions: string[] }) {
  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded text-xs">
      <span className="font-medium">{PERMISSION_LABELS[resource] || resource}</span>
      <span className="text-muted-foreground">:</span>
      <span className="text-muted-foreground">
        {actions.map(a => ACTION_LABELS[a] || a).join(', ')}
      </span>
    </div>
  );
}

export default function RolesPage() {
  const { data, isLoading, error, refetch } = useRoles();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <UserCog className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Roles</h1>
            <p className="text-muted-foreground">Manage roles and permissions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-foreground ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            Create Role
          </button>
        </div>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            Loading roles...
          </div>
        ) : error ? (
          <div className="col-span-full py-12 text-center text-destructive">
            Failed to load roles
          </div>
        ) : (
          data?.roles.map((role) => (
            <div
              key={role.id}
              className="bg-card rounded-lg border border-border p-6 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    role.isSystem ? 'bg-primary/10' : 'bg-secondary'
                  }`}>
                    <Shield className={`w-5 h-5 ${
                      role.isSystem ? 'text-primary' : 'text-secondary-foreground'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground capitalize">{role.name}</h3>
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  </div>
                </div>
                {role.isSystem && (
                  <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                    System
                  </span>
                )}
              </div>

              {/* Permissions */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Permissions</h4>
                <div className="flex flex-wrap gap-2">
                  {role.name === 'superadmin' ? (
                    <PermissionBadge resource="*" actions={['*']} />
                  ) : (
                    Object.entries(role.permissions).map(([resource, actions]) => (
                      <PermissionBadge key={resource} resource={resource} actions={actions} />
                    ))
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>Users with this role</span>
                </div>
                <button
                  disabled={role.isSystem}
                  className="px-3 py-1 text-sm border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Edit
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info Card */}
      <div className="bg-muted/50 rounded-lg border border-border p-4">
        <h4 className="font-medium text-foreground mb-2">About Roles</h4>
        <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
          <li>System roles cannot be deleted or renamed</li>
          <li>Superadmin has full access to all features</li>
          <li>Changes to role permissions apply immediately to all users with that role</li>
          <li>Deleting a role will remove it from all assigned users</li>
        </ul>
      </div>
    </div>
  );
}
