'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, AlertTriangle, Trash2 } from 'lucide-react';
import type { Role } from '@/types';

interface DeleteRoleModalProps {
  role: Role;
  userCount: number;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteRoleModal({ role, userCount, onClose, onConfirm, isDeleting }: DeleteRoleModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const isConfirmEnabled = confirmText === role.name;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 animate-scale-in">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Delete Role?</h2>
            <p className="text-sm text-muted-foreground capitalize">{role.name}</p>
          </div>
        </div>

        {/* Warning content */}
        <div className="space-y-4 mb-6">
          {/* User count warning */}
          {userCount > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <p className="font-medium text-destructive">Warning</p>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">{userCount} user{userCount !== 1 ? 's' : ''}</strong> currently
                assigned to this role. Deleting this role will remove role assignments from these users.
              </p>
            </div>
          )}

          {/* Info box */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete{' '}
              <strong className="text-foreground capitalize">{role.name}</strong>?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              This action cannot be undone.
            </p>
          </div>

          {/* Confirmation input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Type <strong className="capitalize">{role.name}</strong> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder={`Enter "${role.name}"`}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-foreground text-sm transition-all"
              disabled={isDeleting}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={onClose}
            variant="secondary"
            className="flex-1"
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            variant="destructive"
            className="flex-1"
            disabled={!isConfirmEnabled || isDeleting}
            isLoading={isDeleting}
            leftIcon={!isDeleting ? <Trash2 className="w-4 h-4" /> : undefined}
          >
            Delete Role
          </Button>
        </div>
      </div>
    </div>
  );
}
