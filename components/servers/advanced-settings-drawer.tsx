'use client';

import React, { useState, useMemo } from 'react';
import { X, Search, Save, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';
import { DynamicIniInput } from './dynamic-ini-input';

interface AdvancedSettingsDrawerProps {
  serverName: string;
  isOpen: boolean;
  onClose: () => void;
  config: Record<string, string>;
  onSave: (config: Record<string, string>) => Promise<void>;
  onReset?: () => Promise<void>;
  isLoading?: boolean;
}

export function AdvancedSettingsDrawer({
  serverName,
  isOpen,
  onClose,
  config,
  onSave,
  onReset,
  isLoading = false,
}: AdvancedSettingsDrawerProps) {
  const [localConfig, setLocalConfig] = useState(config);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update local config when prop changes
  React.useEffect(() => {
    setLocalConfig(config);
    setHasChanges(false);
  }, [config]);

  const filteredConfig = useMemo(() => {
    if (!searchQuery.trim()) return localConfig;

    const query = searchQuery.toLowerCase();
    return Object.entries(localConfig).reduce(
      (acc, [key, value]) => {
        if (key.toLowerCase().includes(query) || value.toLowerCase().includes(query)) {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, string>
    );
  }, [localConfig, searchQuery]);

  const handleChange = (key: string, value: string) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setError(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSave(localConfig);
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!onReset || !confirm('Are you sure you want to reset all settings to defaults?')) {
      return;
    }
    try {
      await onReset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset configuration');
    }
  };

  const handleClose = () => {
    if (hasChanges && !confirm('You have unsaved changes. Are you sure you want to close?')) {
      return;
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={handleClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full lg:w-[600px] xl:w-[700px] bg-card border-l border-border z-50 shadow-2xl animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Advanced Settings</h2>
            <p className="text-sm text-muted-foreground">Server: {serverName}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-foreground"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Showing {Object.keys(filteredConfig).length} of {Object.keys(localConfig).length} settings
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : Object.keys(filteredConfig).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? 'No settings match your search'
                  : 'No configuration found for this server'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {Object.entries(filteredConfig).map(([key, value]) => (
                <DynamicIniInput
                  key={key}
                  keyName={key}
                  value={value}
                  onChange={handleChange}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-card">
          <div className="flex flex-col gap-3">
            {onReset && (
              <button
                onClick={handleReset}
                disabled={isSaving}
                className="w-full px-4 py-2 border border-destructive/50 text-destructive rounded-lg hover:bg-destructive/10 transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Defaults
              </button>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default AdvancedSettingsDrawer;
