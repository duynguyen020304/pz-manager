'use client';

import React, { useState } from 'react';
import { AlertTriangle, Zap, Shield, Hammer, Loader2 } from 'lucide-react';
import { DIFFICULTY_PRESETS } from '@/lib/difficulty-presets';
import { useApplyDifficultyPreset, useServerSandboxVars } from '@/hooks/use-api';

interface DifficultyPresetSelectorProps {
  serverName: string;
  onOpenEditor?: () => void;
}

export function DifficultyPresetSelector({
  serverName,
  onOpenEditor,
}: DifficultyPresetSelectorProps) {
  const { isLoading } = useServerSandboxVars(serverName);
  const applyPreset = useApplyDifficultyPreset();
  
  const [selectedPreset, setSelectedPreset] = useState<string>('apocalypse');
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingPreset, setPendingPreset] = useState<string | null>(null);

  const presetEntries = Object.entries(DIFFICULTY_PRESETS);

  const handlePresetChange = (presetId: string) => {
    if (presetId === selectedPreset) return;
    setPendingPreset(presetId);
    setShowConfirm(true);
  };

  const confirmApplyPreset = async () => {
    if (!pendingPreset) return;
    
    try {
      await applyPreset.mutateAsync({
        serverName,
        presetId: pendingPreset as 'apocalypse' | 'survivor' | 'builder'
      });
      setSelectedPreset(pendingPreset);
    } catch (error) {
      console.error('Failed to apply preset:', error);
    } finally {
      setShowConfirm(false);
      setPendingPreset(null);
    }
  };

  const getPresetIcon = (presetId: string) => {
    switch (presetId) {
      case 'apocalypse':
        return <AlertTriangle className="w-5 h-5" />;
      case 'survivor':
        return <Shield className="w-5 h-5" />;
      case 'builder':
        return <Hammer className="w-5 h-5" />;
      default:
        return <Zap className="w-5 h-5" />;
    }
  };

  const getPresetColor = (presetId: string) => {
    switch (presetId) {
      case 'apocalypse':
        return 'border-red-500 bg-red-500/10 text-red-400';
      case 'survivor':
        return 'border-yellow-500 bg-yellow-500/10 text-yellow-400';
      case 'builder':
        return 'border-green-500 bg-green-500/10 text-green-400';
      default:
        return 'border-border bg-card text-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-1">Difficulty Preset</h3>
        <p className="text-sm text-muted-foreground">
          Select a difficulty preset to configure zombie behavior, loot rarity, and survival settings.
        </p>
      </div>

      <div className="grid gap-3">
        {presetEntries.map(([id, preset]) => (
          <button
            key={id}
            onClick={() => handlePresetChange(id)}
            className={`
              flex items-start gap-3 p-4 rounded-lg border transition-all text-left
              ${selectedPreset === id 
                ? `${getPresetColor(id)} border-2` 
                : 'border-border bg-card hover:bg-accent'
              }
            `}
          >
            <div className={`mt-0.5 ${selectedPreset === id ? 'text-inherit' : 'text-muted-foreground'}`}>
              {getPresetIcon(id)}
            </div>
            <div className="flex-1">
              <div className="font-medium">{preset.label}</div>
              <div className="text-sm opacity-80 mt-1">{preset.description}</div>
            </div>
            {selectedPreset === id && (
              <div className="text-xs font-medium px-2 py-1 rounded bg-current/20">
                Active
              </div>
            )}
          </button>
        ))}
      </div>

      {onOpenEditor && (
        <button
          onClick={onOpenEditor}
          className="w-full p-3 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors text-sm"
        >
          Customize individual settings
        </button>
      )}

      {showConfirm && pendingPreset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md mx-4">
            <h4 className="text-lg font-semibold mb-2">
              Apply {DIFFICULTY_PRESETS[pendingPreset]?.label} Preset?
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              This will overwrite your current difficulty settings with the preset values.
              Any customizations will be lost.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setPendingPreset(null);
                }}
                className="px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmApplyPreset}
                disabled={applyPreset.isPending}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {applyPreset.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Apply Preset'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
