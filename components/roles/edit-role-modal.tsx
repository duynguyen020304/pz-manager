'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PermissionMatrix } from './permission-matrix';
import { Pencil, X, AlertTriangle, Lock } from 'lucide-react';
import type { Role } from '@/types';

interface EditRoleModalProps {
  role: Role;
  userCount?: number;
  onClose: () => void;
  onSubmit: (id: number, data: { name?: string; description?: string; permissions?: Record<string, string[]> }) => void;
  isSubmitting: boolean;
}

export function EditRoleModal({ role, userCount, onClose, onSubmit, isSubmitting }: EditRoleModalProps) {
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description || '');
  const [permissions, setPermissions] = useState<Record<string, string[]>>(() => JSON.parse(JSON.stringify(role.permissions)));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate name (only if not a system role)
    if (!role.isSystem) {
      if (!name.trim()) {
        newErrors.name = 'Role name is required';
      } else if (name.length > 50) {
        newErrors.name = 'Role name must be 50 characters or less';
      } else if (!/^[a-z][a-z0-9-]*$/.test(name)) {
        newErrors.name = 'Must start with lowercase letter and contain only lowercase letters, numbers, and hyphens';
      }
    }

    // Validate permissions
    if (Object.keys(permissions).length === 0) {
      newErrors.permissions = 'At least one permission is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    onSubmit(role.id, {
      name: role.isSystem ? undefined : name.trim(),
      description: description.trim() || undefined,
      permissions,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Pencil className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Edit Role</h2>
              <p className="text-sm text-muted-foreground capitalize">{role.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-muted rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* System role warning */}
        {role.isSystem && (
          <div className="mx-4 mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2">
            <Lock className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-600">System Role</p>
              <p className="text-muted-foreground">The name of system roles cannot be changed.</p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* Name field */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Role Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => {
                setName(e.target.value);
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              placeholder="e.g., server-operator"
              className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground text-sm transition-all ${
                errors.name ? 'border-destructive' : 'border-border focus:border-primary'
              } ${role.isSystem ? 'opacity-60 cursor-not-allowed' : ''}`}
              disabled={isSubmitting || role.isSystem}
            />
            {errors.name && (
              <p className="text-xs text-destructive mt-1">{errors.name}</p>
            )}
            {role.isSystem && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Lock className="w-3 h-3" /> System role names cannot be changed
              </p>
            )}
          </div>

          {/* Description field */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of this role's purpose"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-foreground text-sm transition-all"
              disabled={isSubmitting}
            />
          </div>

          {/* User count info */}
          {userCount !== undefined && userCount > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">{userCount} user{userCount !== 1 ? 's' : ''}</strong> currently
                assigned to this role. Permission changes will apply immediately.
              </p>
            </div>
          )}

          {/* Permissions */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Permissions <span className="text-destructive">*</span>
            </label>
            {errors.permissions && (
              <p className="text-xs text-destructive mb-2">{errors.permissions}</p>
            )}
            <PermissionMatrix
              value={permissions}
              onChange={newPermissions => {
                setPermissions(newPermissions);
                if (errors.permissions) setErrors({ ...errors, permissions: '' });
              }}
              disabled={isSubmitting}
              showPresets={true}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-border">
          <Button
            onClick={onClose}
            variant="secondary"
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="primary"
            className="flex-1"
            disabled={isSubmitting}
            isLoading={isSubmitting}
            leftIcon={!isSubmitting ? <Pencil className="w-4 h-4" /> : undefined}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
