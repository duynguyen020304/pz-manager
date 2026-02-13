/**
 * Permission constants for role management
 * Shared across components and used for permission matrix UI
 */

// Resource labels for display
export const PERMISSION_RESOURCES = [
  { key: 'servers', label: 'Servers' },
  { key: 'backups', label: 'Backups' },
  { key: 'schedules', label: 'Schedules' },
  { key: 'settings', label: 'Settings' },
  { key: 'logs', label: 'Logs' },
  { key: 'users', label: 'Users' },
  { key: 'roles', label: 'Roles' },
] as const;

// Action labels for display
export const PERMISSION_ACTIONS = [
  { key: 'view', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
  { key: 'start', label: 'Start' },
  { key: 'stop', label: 'Stop' },
  { key: 'configure', label: 'Config' },
  { key: 'restore', label: 'Restore' },
] as const;

// Resource-to-applicable-actions mapping
// Derived from DEFAULT_ROLES in lib/role-manager.ts
export const RESOURCE_ACTIONS: Record<string, string[]> = {
  servers: ['view', 'start', 'stop', 'configure'],
  backups: ['view', 'create', 'restore', 'delete'],
  schedules: ['view', 'create', 'edit', 'delete'],
  settings: ['view', 'edit'],
  logs: ['view'],
  users: ['view', 'create', 'edit', 'delete'],
  roles: ['view', 'create', 'edit', 'delete'],
};

// All unique actions across all resources
export const ALL_ACTIONS = [...new Set(Object.values(RESOURCE_ACTIONS).flat())];

// Permission presets for quick selection
export const PERMISSION_PRESETS = {
  readOnly: {
    label: 'Read Only',
    description: 'View all resources without modification',
    permissions: {
      servers: ['view'],
      backups: ['view'],
      schedules: ['view'],
      logs: ['view'],
    },
  },
  operator: {
    label: 'Operator',
    description: 'Start/stop servers and view logs',
    permissions: {
      servers: ['view', 'start', 'stop'],
      backups: ['view'],
      schedules: ['view'],
      logs: ['view'],
    },
  },
  admin: {
    label: 'Administrator',
    description: 'Full access except role management',
    permissions: {
      servers: ['view', 'start', 'stop', 'configure'],
      backups: ['view', 'create', 'restore', 'delete'],
      schedules: ['view', 'create', 'edit', 'delete'],
      settings: ['view', 'edit'],
      logs: ['view'],
      users: ['view', 'create', 'edit'],
      roles: ['view'],
    },
  },
} as const;

// Get label for a resource key
export function getResourceLabel(resource: string): string {
  return PERMISSION_RESOURCES.find(r => r.key === resource)?.label ?? resource;
}

// Get label for an action key
export function getActionLabel(action: string): string {
  return PERMISSION_ACTIONS.find(a => a.key === action)?.label ?? action;
}

// Check if permissions are empty (no resources with actions)
export function isEmptyPermissions(permissions: Record<string, string[]>): boolean {
  return Object.keys(permissions).length === 0 ||
    Object.values(permissions).every(actions => actions.length === 0);
}

// Count total permissions (resource-action pairs)
export function countPermissions(permissions: Record<string, string[]>): number {
  return Object.values(permissions).reduce((sum, actions) => sum + actions.length, 0);
}
