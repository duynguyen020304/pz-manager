'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PermissionMatrix } from './permission-matrix';
import { Plus, X } from 'lucide-react';

interface CreateRoleModalProps {
  onClose: () => void;
  onSubmit: (data: { name: string; description?: string; permissions: Record<string, string[]> }) => void;
  isSubmitting: boolean;
}

export function CreateRoleModal({ onClose, onSubmit, isSubmitting }: CreateRoleModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate name
    if (!name.trim()) {
      newErrors.name = 'Role name is required';
    } else if (name.length > 50) {
      newErrors.name = 'Role name must be 50 characters or less';
    } else if (!/^[a-z][a-z0-9-]*$/.test(name)) {
      newErrors.name = 'Must start with lowercase letter and contain only lowercase letters, numbers, and hyphens';
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

    onSubmit({
      name: name.trim(),
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
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Create Role</h2>
              <p className="text-sm text-muted-foreground">Define a new role with custom permissions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-muted rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

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
              }`}
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-xs text-destructive mt-1">{errors.name}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Lowercase letters, numbers, and hyphens only. Must start with a letter.
            </p>
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
            leftIcon={!isSubmitting ? <Plus className="w-4 h-4" /> : undefined}
          >
            Create Role
          </Button>
        </div>
      </div>
    </div>
  );
}
