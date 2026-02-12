'use client';

import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface DeleteConfirmModalProps {
  serverName: string;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteConfirmModal({
  serverName,
  onClose,
  onConfirm,
  isDeleting
}: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 animate-scale-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Remove Server?</h2>
            <p className="text-sm text-muted-foreground">{serverName}</p>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 mb-6">
          <p className="text-muted-foreground">
            Are you sure you want to remove{' '}
            <strong className="text-foreground">{serverName}</strong>?
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            This will not delete any backup data, only remove it from management.
          </p>
        </div>

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
            disabled={isDeleting}
            isLoading={isDeleting}
          >
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}
