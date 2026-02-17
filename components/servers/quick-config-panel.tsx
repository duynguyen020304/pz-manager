'use client';

import React, { useState, useEffect } from 'react';
import { X, Globe, Swords, Home, Package, Settings2, Loader2, Save, ChevronRight, Skull, AlertTriangle, Shield, Hammer, Apple } from 'lucide-react';
import { RamSlider } from '@/components/ui/ram-slider';
import { StepperControl } from '@/components/ui/stepper-control';
import { ToggleCard } from '@/components/ui/toggle-card';

interface QuickConfigPanelProps {
  serverName: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: QuickConfig) => Promise<void>;
  onOpenAdvanced: () => void;
  onOpenSandboxAdvanced?: () => void;
  initialConfig?: QuickConfig;
  initialSandboxConfig?: SandboxQuickConfig;
  systemRam?: number;
}

export interface QuickConfig {
  xms: number;
  xmx: number;
  maxPlayers: number;
  public: boolean;
  pvp: boolean;
  safehouse: boolean;
  lootRespawn: boolean;
}

export interface SandboxQuickConfig {
  preset: 'apocalypse' | 'survivor' | 'builder' | null;
  starterKit: boolean;
  nutrition: boolean;
}

const DEFAULT_CONFIG: QuickConfig = {
  xms: 8,
  xmx: 12,
  maxPlayers: 16,
  public: true,
  pvp: true,
  safehouse: true,
  lootRespawn: false,
};

const DEFAULT_SANDBOX_CONFIG: SandboxQuickConfig = {
  preset: 'apocalypse',
  starterKit: true,
  nutrition: true,
};

const PRESETS = {
  apocalypse: {
    label: 'Apocalypse',
    description: 'Stealth focus, combat best avoided',
    icon: AlertTriangle,
    color: 'border-red-500 bg-red-500/10 text-red-400',
  },
  survivor: {
    label: 'Survivor',
    description: 'Powerful combat, longer lifespan',
    icon: Shield,
    color: 'border-yellow-500 bg-yellow-500/10 text-yellow-400',
  },
  builder: {
    label: 'Builder',
    description: '80% fewer zombies, relaxed experience',
    icon: Hammer,
    color: 'border-green-500 bg-green-500/10 text-green-400',
  },
};

export function QuickConfigPanel({
  serverName,
  isOpen,
  onClose,
  onSave,
  onOpenAdvanced,
  onOpenSandboxAdvanced,
  initialConfig,
  initialSandboxConfig,
  systemRam = 64,
}: QuickConfigPanelProps) {
  const [config, setConfig] = useState<QuickConfig>(initialConfig || DEFAULT_CONFIG);
  const [sandboxConfig, setSandboxConfig] = useState<SandboxQuickConfig>(initialSandboxConfig || DEFAULT_SANDBOX_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    }
  }, [initialConfig]);

  useEffect(() => {
    if (initialSandboxConfig) {
      setSandboxConfig(initialSandboxConfig);
    }
  }, [initialSandboxConfig]);

  useEffect(() => {
    if (isOpen) {
      setHasChanges(false);
    }
  }, [isOpen]);

  const handleChange = (updates: Partial<QuickConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleSandboxChange = (updates: Partial<SandboxQuickConfig>) => {
    setSandboxConfig((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Combine regular config and sandbox config for the save handler
      await onSave({ ...config, sandbox: sandboxConfig } as QuickConfig & { sandbox: SandboxQuickConfig });
      setHasChanges(false);
    } finally {
      setIsSaving(false);
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

      {/* Slide-out Panel */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-card border-l border-border z-50 shadow-2xl animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Quick Configure</h2>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* RAM Configuration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                <h3 className="font-medium text-foreground">Memory Allocation</h3>
              </div>
              <span className="text-sm text-muted-foreground">
                {config.xms}-{config.xmx}GB
              </span>
            </div>
            <RamSlider
              xms={config.xms}
              xmx={config.xmx}
              systemRam={systemRam}
              onChange={(xms, xmx) => handleChange({ xms, xmx })}
            />
          </div>

          {/* Max Players */}
          <div className="space-y-3">
            <StepperControl
              label="Max Players"
              description="Maximum concurrent players"
              value={config.maxPlayers}
              min={1}
              max={100}
              onChange={(maxPlayers) => handleChange({ maxPlayers })}
            />
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Quick Toggles */}
          <div className="space-y-3">
            <h3 className="font-medium text-foreground">Quick Settings</h3>

            <ToggleCard
              label="Public Server"
              description="Visible in Steam server browser"
              icon={Globe}
              checked={config.public}
              onChange={(public_) => handleChange({ public: public_ })}
            />

            <ToggleCard
              label="PVP Enabled"
              description="Player vs player combat"
              icon={Swords}
              checked={config.pvp}
              onChange={(pvp) => handleChange({ pvp })}
            />

            <ToggleCard
              label="Safehouses"
              description="Base protection system"
              icon={Home}
              checked={config.safehouse}
              onChange={(safehouse) => handleChange({ safehouse })}
            />

            <ToggleCard
              label="Loot Respawn"
              description="Items respawn over time"
              icon={Package}
              checked={config.lootRespawn}
              onChange={(lootRespawn) => handleChange({ lootRespawn })}
            />
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Sandbox Settings Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Skull className="w-5 h-5 text-primary" />
              <h3 className="font-medium text-foreground">Sandbox Settings</h3>
            </div>

            {/* Difficulty Preset Cards */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Difficulty Preset</p>
              <div className="grid gap-2">
                {(Object.entries(PRESETS) as [string, typeof PRESETS['apocalypse']][]).map(([id, preset]) => {
                  const Icon = preset.icon;
                  const isSelected = sandboxConfig.preset === id;
                  return (
                    <button
                      key={id}
                      onClick={() => handleSandboxChange({ preset: id as 'apocalypse' | 'survivor' | 'builder' })}
                      className={`
                        flex items-center gap-3 p-3 rounded-lg border transition-all text-left
                        ${isSelected
                          ? `${preset.color} border-2`
                          : 'border-border bg-card hover:bg-muted/30 hover:border-primary/30'
                        }
                      `}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-current/20' : 'bg-muted'}`}>
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-inherit' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium text-sm ${isSelected ? 'text-inherit' : 'text-foreground'}`}>
                          {preset.label}
                        </div>
                        <div className={`text-xs ${isSelected ? 'opacity-80' : 'text-muted-foreground'}`}>
                          {preset.description}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="text-xs font-medium px-2 py-0.5 rounded bg-current/20">
                          Active
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Sandbox Toggles */}
            <div className="space-y-2">
              <ToggleCard
                label="Starter Kit"
                description="Players start with basic survival items"
                icon={Package}
                checked={sandboxConfig.starterKit}
                onChange={(starterKit) => handleSandboxChange({ starterKit })}
              />
              <ToggleCard
                label="Nutrition System"
                description="Food nutrition affects health"
                icon={Apple}
                checked={sandboxConfig.nutrition}
                onChange={(nutrition) => handleSandboxChange({ nutrition })}
              />
            </div>

            {/* Advanced Sandbox Settings Link */}
            {onOpenSandboxAdvanced && (
              <button
                onClick={onOpenSandboxAdvanced}
                className="w-full flex items-center justify-between p-3 border border-border rounded-lg hover:border-primary/30 hover:bg-muted/30 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Settings2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-sm text-foreground">Advanced Sandbox Settings</div>
                    <div className="text-xs text-muted-foreground">Configure 40+ difficulty options</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            )}
          </div>

          {/* Advanced Settings Link */}
          <button
            onClick={onOpenAdvanced}
            className="w-full flex items-center justify-between p-3 border border-border rounded-lg hover:border-primary/30 hover:bg-muted/30 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Settings2 className="w-4 h-4 text-primary" />
              </div>
              <div className="text-left">
                <div className="font-medium text-sm text-foreground">Advanced Settings</div>
                <div className="text-xs text-muted-foreground">Configure all 80+ options</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-card">
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
    </>
  );
}

export default QuickConfigPanel;
