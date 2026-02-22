'use client';

import { useState } from 'react';
import { useTokens, useCreateToken, useRevokeToken, useDeleteToken } from '@/hooks/use-api';
import { ApiToken } from '@/types';
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
  X,
  Loader2,
  Clock,
  Shield,
  AlertCircle
} from 'lucide-react';

const EXPIRATION_OPTIONS = [
  { value: undefined, label: 'Never' },
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
  { value: 90, label: '90 days' },
  { value: 180, label: '6 months' },
  { value: 365, label: '1 year' },
];

export default function TokensPage() {
  const { data: tokens, isLoading, error } = useTokens();
  const createToken = useCreateToken();
  const revokeToken = useRevokeToken();
  const deleteToken = useDeleteToken();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenDescription, setNewTokenDescription] = useState('');
  const [newTokenExpiration, setNewTokenExpiration] = useState<number | undefined>(90);
  const [createdToken, setCreatedToken] = useTokenState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useTokenState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useTokenState<string | null>(null);

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim()) return;

    try {
      const result = await createToken.mutateAsync({
        name: newTokenName.trim(),
        description: newTokenDescription.trim() || undefined,
        expiresInDays: newTokenExpiration,
      });
      setCreatedToken(result.token);
      setShowCreateForm(false);
      setNewTokenName('');
      setNewTokenDescription('');
      setNewTokenExpiration(90);
    } catch (err) {
      console.error('Failed to create token:', err);
    }
  };

  const handleCopy = async (token: string, id: string) => {
    await navigator.clipboard.writeText(token);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = async (tokenId: string) => {
    try {
      await revokeToken.mutateAsync(tokenId);
      setConfirmRevoke(null);
    } catch (err) {
      console.error('Failed to revoke token:', err);
    }
  };

  const handleDelete = async (tokenId: string) => {
    try {
      await deleteToken.mutateAsync(tokenId);
      setConfirmDelete(null);
    } catch (err) {
      console.error('Failed to delete token:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
        <h2 className="text-xl font-bold text-foreground">Failed to load tokens</h2>
        <p className="text-muted-foreground mt-2">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Key className="w-8 h-8 text-primary" />
          API Tokens
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage personal access tokens for API authentication
        </p>
      </div>

      {createdToken && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-green-600">Token created successfully</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Copy this token now. You won&apos;t be able to see it again.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 p-2 bg-background rounded border border-border font-mono text-sm break-all">
                  {createdToken}
                </code>
                <button
                  onClick={() => handleCopy(createdToken, 'new')}
                  className="p-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                >
                  {copiedId === 'new' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={() => setCreatedToken(null)}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {showCreateForm && (
        <div className="mb-6 p-6 bg-card border border-border rounded-lg">
          <h2 className="text-lg font-semibold text-foreground mb-4">Create New Token</h2>
          <form onSubmit={handleCreateToken}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Token Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                  placeholder="e.g., Production API"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newTokenDescription}
                  onChange={(e) => setNewTokenDescription(e.target.value)}
                  placeholder="Optional description for this token"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Expiration
                </label>
                <select
                  value={newTokenExpiration ?? ''}
                  onChange={(e) => setNewTokenExpiration(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {EXPIRATION_OPTIONS.map((option) => (
                    <option key={option.label} value={option.value ?? ''}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={createToken.isPending || !newTokenName.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {createToken.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Create Token
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewTokenName('');
                    setNewTokenDescription('');
                    setNewTokenExpiration(90);
                  }}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Your Tokens</h2>
          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Create Token
            </button>
          )}
        </div>

        {(!tokens || tokens.length === 0) ? (
          <div className="p-12 text-center">
            <Key className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-2">No API tokens yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first personal access token to authenticate with the API
            </p>
            {!showCreateForm && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Token
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {tokens.map((token) => (
              <TokenRow
                key={token.id}
                token={token}
                onRevoke={() => setConfirmRevoke(token.id)}
                onDelete={() => setConfirmDelete(token.id)}
                revokePending={revokeToken.isPending}
                deletePending={deleteToken.isPending}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-foreground">Security Best Practices</h3>
            <ul className="mt-2 text-sm text-muted-foreground space-y-1">
              <li>• Tokens are only shown once at creation time</li>
              <li>• Store tokens securely and never share them</li>
              <li>• Use expiration dates for added security</li>
              <li>• Revoke tokens you no longer need</li>
            </ul>
          </div>
        </div>
      </div>

      {confirmRevoke && (
        <Modal
          title="Revoke Token"
          message="Are you sure you want to revoke this token? Any applications using this token will lose access immediately."
          confirmLabel="Revoke"
          onConfirm={() => handleRevoke(confirmRevoke)}
          onCancel={() => setConfirmRevoke(null)}
          isDestructive
          isLoading={revokeToken.isPending}
        />
      )}

      {confirmDelete && (
        <Modal
          title="Delete Token"
          message="Are you sure you want to permanently delete this token? This action cannot be undone."
          confirmLabel="Delete"
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
          isDestructive
          isLoading={deleteToken.isPending}
        />
      )}
    </div>
  );
}

function TokenRow({
  token,
  onRevoke,
  onDelete,
  revokePending,
  deletePending,
}: {
  token: ApiToken;
  onRevoke: () => void;
  onDelete: () => void;
  revokePending: boolean;
  deletePending: boolean;
}) {
  const isExpired = token.expiresAt && new Date(token.expiresAt) < new Date();
  const isActive = token.isActive && !isExpired;

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-foreground">{token.name}</h3>
            {isActive && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
                Active
              </span>
            )}
            {!token.isActive && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 border border-red-500/20">
                Revoked
              </span>
            )}
            {isExpired && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 border border-yellow-500/20">
                Expired
              </span>
            )}
          </div>

          {token.description && (
            <p className="text-sm text-muted-foreground mt-1">{token.description}</p>
          )}

          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Created {new Date(token.createdAt).toLocaleDateString()}
            </span>

            {token.expiresAt && (
              <span className="flex items-center gap-1">
                Expires {new Date(token.expiresAt).toLocaleDateString()}
              </span>
            )}

            {token.lastUsedAt && (
              <span>Last used {new Date(token.lastUsedAt).toLocaleDateString()}</span>
            )}

            {token.lastUsedIp && (
              <span>IP: {token.lastUsedIp}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {token.isActive && !isExpired && (
            <button
              onClick={onRevoke}
              disabled={revokePending}
              className="px-3 py-1.5 text-sm text-yellow-600 border border-yellow-500/30 rounded-md hover:bg-yellow-500/10 transition-colors disabled:opacity-50"
            >
              Revoke
            </button>
          )}
          <button
            onClick={onDelete}
            disabled={deletePending}
            className="p-1.5 text-destructive border border-destructive/30 rounded-md hover:bg-destructive/10 transition-colors disabled:opacity-50"
            title="Delete token"
          >
            {deletePending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Modal({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  isDestructive,
  isLoading,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
  isLoading?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />
      <div className="relative bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-start gap-4">
          {isDestructive && (
            <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-2 text-muted-foreground">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-md transition-colors disabled:opacity-50 ${
              isDestructive
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function useTokenState<T>(initialValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState(initialValue);
  return [value, setValue];
}
