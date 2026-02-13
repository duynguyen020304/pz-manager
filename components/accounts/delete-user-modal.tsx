'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Trash2 } from 'lucide-react';
import type { UserWithRole } from '@/types';

interface DeleteUserModalProps {
  user: UserWithRole;
  onClose: () => void;
  onConfirm: (id: number) => void;
  isDeleting: boolean;
}

export function DeleteUserModal({ user, onClose, onConfirm, isDeleting }: DeleteUserModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const isConfirmEnabled = confirmText === user.username;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 animate-scale-in">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Delete User?</h2>
            <p className="text-sm text-muted-foreground">{user.username}</p>
          </div>
        </div>

        {/* Warning content */}
        <div className="space-y-4 mb-6">
          {/* Info box */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete{' '}
              <strong className="text-foreground">{user.username}</strong>?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              This action cannot be undone. All data associated with this user will be permanently removed.
            </p>
          </div>

          {/* Confirmation input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Type <strong>{user.username}</strong> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder={`Enter "${user.username}"`}
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
            onClick={() => onConfirm(user.id)}
            variant="destructive"
            className="flex-1"
            disabled={!isConfirmEnabled || isDeleting}
            isLoading={isDeleting}
            leftIcon={!isDeleting ? <Trash2 className="w-4 h-4" /> : undefined}
          >
            Delete User
          </Button>
        </div>
      </div>
    </div>
  );
}
