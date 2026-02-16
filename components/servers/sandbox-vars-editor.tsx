'use client';

import React, { useState, useMemo } from 'react';
import { X, Save, RotateCcw, Loader2, Search } from 'lucide-react';
import { useServerSandboxVars, useUpdateServerSandboxVars, useResetServerSandboxVars } from '@/hooks/use-api';
import { SandboxVars, OptionCategory, SandboxOptionMeta } from '@/lib/sandbox-vars-types';

interface SandboxVarsEditorProps {
  serverName: string;
  isOpen: boolean;
  onClose: () => void;
}

const OPTION_CATEGORIES: { id: OptionCategory; label: string }[] = [
  { id: 'population', label: 'Population' },
  { id: 'time', label: 'Time & Date' },
  { id: 'world', label: 'World' },
  { id: 'nature', label: 'Nature' },
  { id: 'character', label: 'Character' },
  { id: 'zombie_lore', label: 'Zombie Lore' },
  { id: 'zombie_config', label: 'Zombie Config' },
  { id: 'loot', label: 'Loot Rarity' },
  { id: 'meta', label: 'Meta Events' },
];

const SANDBOX_OPTIONS: SandboxOptionMeta[] = [
  // Population
  { key: 'Zombies', category: 'population', label: 'Zombie Population', description: 'Overall zombie count', type: 'select', min: 1, max: 5, options: [
    { value: 1, label: 'Insane (Max)' },
    { value: 2, label: 'Very High' },
    { value: 3, label: 'High' },
    { value: 4, label: 'Normal' },
    { value: 5, label: 'Low (20%)' },
  ]},
  { key: 'Distribution', category: 'population', label: 'Zombie Distribution', description: 'Urban vs uniform distribution', type: 'select', min: 1, max: 2, options: [
    { value: 1, label: 'Urban Focused' },
    { value: 2, label: 'Uniform' },
  ]},
  
  // Time
  { key: 'DayLength', category: 'time', label: 'Day Length', description: 'Real-time per in-game day', type: 'select', min: 1, max: 9, options: [
    { value: 1, label: '15 minutes' },
    { value: 2, label: '30 minutes' },
    { value: 3, label: '1 hour' },
    { value: 4, label: '2 hours' },
    { value: 5, label: '3 hours' },
    { value: 6, label: '4 hours' },
    { value: 7, label: '5 hours' },
    { value: 8, label: '12 hours' },
    { value: 9, label: 'Real-time' },
  ]},
  { key: 'StartMonth', category: 'time', label: 'Start Month', description: 'Starting month', type: 'select', min: 1, max: 12, options: [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
  ]},
  { key: 'StartTime', category: 'time', label: 'Start Time', description: 'Starting time of day', type: 'select', min: 1, max: 9, options: [
    { value: 1, label: '7 AM' },
    { value: 2, label: '9 AM' },
    { value: 3, label: '12 PM' },
    { value: 4, label: '2 PM' },
    { value: 5, label: '5 PM' },
    { value: 6, label: '9 PM' },
    { value: 7, label: '12 AM' },
    { value: 8, label: '2 AM' },
    { value: 9, label: '5 AM' },
  ]},

  // World
  { key: 'WaterShut', category: 'world', label: 'Water Shutoff', description: 'When water stops working', type: 'select', min: 1, max: 7, options: [
    { value: -1, label: 'Instant' },
    { value: 1, label: '0-30 days' },
    { value: 2, label: '0-2 months' },
    { value: 3, label: '0-6 months' },
    { value: 4, label: '0-1 year' },
    { value: 5, label: '0-5 years' },
    { value: 6, label: '6-12 months' },
    { value: 7, label: 'Never' },
  ]},
  { key: 'ElecShut', category: 'world', label: 'Electricity Shutoff', description: 'When power stops working', type: 'select', min: 1, max: 7, options: [
    { value: -1, label: 'Instant' },
    { value: 1, label: '0-30 days' },
    { value: 2, label: '0-2 months' },
    { value: 3, label: '0-6 months' },
    { value: 4, label: '0-1 year' },
    { value: 5, label: '0-5 years' },
    { value: 6, label: '6-12 months' },
    { value: 7, label: 'Never' },
  ]},
  { key: 'Alarm', category: 'world', label: 'House Alarms', description: 'Frequency of alarms in houses', type: 'select', min: 1, max: 6, options: [
    { value: 1, label: 'Never' },
    { value: 2, label: 'Extremely Rare' },
    { value: 3, label: 'Rare' },
    { value: 4, label: 'Sometimes' },
    { value: 5, label: 'Often' },
    { value: 6, label: 'Very Often' },
  ]},
  { key: 'LockedHouses', category: 'world', label: 'Locked Houses', description: 'Frequency of locked doors', type: 'select', min: 1, max: 6, options: [
    { value: 1, label: 'Never' },
    { value: 2, label: 'Extremely Rare' },
    { value: 3, label: 'Rare' },
    { value: 4, label: 'Sometimes' },
    { value: 5, label: 'Often' },
    { value: 6, label: 'Very Often' },
  ]},
  { key: 'LootRespawn', category: 'world', label: 'Loot Respawn', description: 'How often loot respawns', type: 'select', min: 1, max: 5, options: [
    { value: 1, label: 'None' },
    { value: 2, label: 'Every Day' },
    { value: 3, label: 'Every Week' },
    { value: 4, label: 'Every Month' },
    { value: 5, label: 'Every 2 Months' },
  ]},

  // Nature
  { key: 'Temperature', category: 'nature', label: 'Temperature', description: 'Weather temperature', type: 'select', min: 1, max: 5, options: [
    { value: 1, label: 'Very Cold' },
    { value: 2, label: 'Cold' },
    { value: 3, label: 'Normal' },
    { value: 4, label: 'Hot' },
    { value: 5, label: 'Very Hot' },
  ]},
  { key: 'Rain', category: 'nature', label: 'Rain', description: 'Frequency of rain', type: 'select', min: 1, max: 5, options: [
    { value: 1, label: 'Very Dry' },
    { value: 2, label: 'Dry' },
    { value: 3, label: 'Normal' },
    { value: 4, label: 'Rainy' },
    { value: 5, label: 'Very Rainy' },
  ]},
  { key: 'ErosionSpeed', category: 'nature', label: 'Erosion Speed', description: 'How fast buildings decay', type: 'select', min: 1, max: 5, options: [
    { value: 1, label: 'Very Fast (20 days)' },
    { value: 2, label: 'Fast (50 days)' },
    { value: 3, label: 'Normal (100 days)' },
    { value: 4, label: 'Slow (200 days)' },
    { value: 5, label: 'Very Slow (500 days)' },
  ]},
  { key: 'Farming', category: 'nature', label: 'Farming Speed', description: 'Crop growth speed', type: 'select', min: 1, max: 5, options: [
    { value: 1, label: 'Very Fast' },
    { value: 2, label: 'Fast' },
    { value: 3, label: 'Normal' },
    { value: 4, label: 'Slow' },
    { value: 5, label: 'Very Slow' },
  ]},
  { key: 'NatureAbundance', category: 'nature', label: 'Foraging/Fishing', description: 'Abundance of wild food', type: 'select', min: 1, max: 5, options: [
    { value: 1, label: 'Very Poor' },
    { value: 2, label: 'Poor' },
    { value: 3, label: 'Normal' },
    { value: 4, label: 'Abundant' },
    { value: 5, label: 'Very Abundant' },
  ]},

  // Character
  { key: 'XpMultiplier', category: 'character', label: 'XP Multiplier', description: 'Experience gain rate', type: 'number', min: 0.1, max: 10 },
  { key: 'StatsDecrease', category: 'character', label: 'Stats Decrease', description: 'How fast hunger/thirst depletes', type: 'select', min: 1, max: 5, options: [
    { value: 1, label: 'Very Fast' },
    { value: 2, label: 'Fast' },
    { value: 3, label: 'Normal' },
    { value: 4, label: 'Slow' },
    { value: 5, label: 'Very Slow' },
  ]},
  { key: 'EndRegen', category: 'character', label: 'Endurance Regen', description: 'How fast endurance recovers', type: 'select', min: 1, max: 5, options: [
    { value: 1, label: 'Very Fast' },
    { value: 2, label: 'Fast' },
    { value: 3, label: 'Normal' },
    { value: 4, label: 'Slow' },
    { value: 5, label: 'Very Slow' },
  ]},
  { key: 'StarterKit', category: 'character', label: 'Starter Kit', description: 'Start with extra items', type: 'boolean' },
  { key: 'Nutrition', category: 'character', label: 'Nutrition', description: 'Food nutrition affects health', type: 'boolean' },

  // Zombie Lore
  { key: 'ZombieLore.Speed', category: 'zombie_lore', label: 'Zombie Speed', description: 'Movement speed of zombies', type: 'select', min: 1, max: 3, nested: true, nestedKey: 'ZombieLore', options: [
    { value: 1, label: 'Sprinters' },
    { value: 2, label: 'Fast Shamblers' },
    { value: 3, label: 'Shamblers' },
  ]},
  { key: 'ZombieLore.Strength', category: 'zombie_lore', label: 'Zombie Strength', description: 'Damage dealt by zombies', type: 'select', min: 1, max: 3, nested: true, nestedKey: 'ZombieLore', options: [
    { value: 1, label: 'Superhuman' },
    { value: 2, label: 'Normal' },
    { value: 3, label: 'Weak' },
  ]},
  { key: 'ZombieLore.Toughness', category: 'zombie_lore', label: 'Zombie Toughness', description: 'Hit points of zombies', type: 'select', min: 1, max: 3, nested: true, nestedKey: 'ZombieLore', options: [
    { value: 1, label: 'Tough' },
    { value: 2, label: 'Normal' },
    { value: 3, label: 'Fragile' },
  ]},
  { key: 'ZombieLore.Transmission', category: 'zombie_lore', label: 'Infection Type', description: 'How infection spreads', type: 'select', min: 1, max: 4, nested: true, nestedKey: 'ZombieLore', options: [
    { value: 1, label: 'Blood/Saliva' },
    { value: 2, label: 'Saliva Only' },
    { value: 3, label: 'Everyone Infected' },
    { value: 4, label: 'No Transmission' },
  ]},
  { key: 'ZombieLore.Mortality', category: 'zombie_lore', label: 'Infection Mortality', description: 'How deadly the infection is', type: 'select', min: 1, max: 7, nested: true, nestedKey: 'ZombieLore', options: [
    { value: 1, label: 'Instant' },
    { value: 2, label: '2 hours' },
    { value: 3, label: '12 hours' },
    { value: 4, label: '24 hours' },
    { value: 5, label: '3 days' },
    { value: 6, label: '1-2 weeks' },
    { value: 7, label: 'Never' },
  ]},
  { key: 'ZombieLore.Sight', category: 'zombie_lore', label: 'Zombie Sight', description: 'How well zombies see', type: 'select', min: 1, max: 3, nested: true, nestedKey: 'ZombieLore', options: [
    { value: 1, label: 'Eagle-eyed' },
    { value: 2, label: 'Normal' },
    { value: 3, label: 'Poor' },
  ]},
  { key: 'ZombieLore.Hearing', category: 'zombie_lore', label: 'Zombie Hearing', description: 'How well zombies hear', type: 'select', min: 1, max: 3, nested: true, nestedKey: 'ZombieLore', options: [
    { value: 1, label: 'Pinpoint' },
    { value: 2, label: 'Normal' },
    { value: 3, label: 'Poor' },
  ]},
  { key: 'ZombieLore.Smell', category: 'zombie_lore', label: 'Zombie Smell', description: 'How well zombies smell', type: 'select', min: 1, max: 3, nested: true, nestedKey: 'ZombieLore', options: [
    { value: 1, label: 'Bloodhound' },
    { value: 2, label: 'Normal' },
    { value: 3, label: 'Poor' },
  ]},
  { key: 'ZombieLore.ZombiesDragDown', category: 'zombie_lore', label: 'Drag Down', description: 'Zombies can drag down players', type: 'boolean', nested: true, nestedKey: 'ZombieLore' },

  // Zombie Config
  { key: 'ZombieConfig.PopulationMultiplier', category: 'zombie_config', label: 'Population Multiplier', description: 'Base zombie spawn multiplier', type: 'number', min: 0, max: 4, nested: true, nestedKey: 'ZombieConfig' },
  { key: 'ZombieConfig.RespawnHours', category: 'zombie_config', label: 'Respawn Hours', description: 'Hours before zombie respawn', type: 'number', min: 0, max: 8760, nested: true, nestedKey: 'ZombieConfig' },
  { key: 'ZombieConfig.RallyGroupSize', category: 'zombie_config', label: 'Rally Group Size', description: 'Zombie group size', type: 'number', min: 0, max: 1000, nested: true, nestedKey: 'ZombieConfig' },

  // Loot
  { key: 'FoodLoot', category: 'loot', label: 'Food Loot', description: 'Rarity of food items', type: 'select', min: 1, max: 5, options: [
    { value: 1, label: 'Extremely Rare' },
    { value: 2, label: 'Rare' },
    { value: 3, label: 'Normal' },
    { value: 4, label: 'Common' },
    { value: 5, label: 'Abundant' },
  ]},
  { key: 'WeaponLoot', category: 'loot', label: 'Weapon Loot', description: 'Rarity of weapons', type: 'select', min: 1, max: 5, options: [
    { value: 1, label: 'Extremely Rare' },
    { value: 2, label: 'Rare' },
    { value: 3, label: 'Normal' },
    { value: 4, label: 'Common' },
    { value: 5, label: 'Abundant' },
  ]},
  { key: 'OtherLoot', category: 'loot', label: 'Other Loot', description: 'Rarity of misc items', type: 'select', min: 1, max: 5, options: [
    { value: 1, label: 'Extremely Rare' },
    { value: 2, label: 'Rare' },
    { value: 3, label: 'Normal' },
    { value: 4, label: 'Common' },
    { value: 5, label: 'Abundant' },
  ]},

  // Meta
  { key: 'TimeSinceApo', category: 'meta', label: 'Months Since Apocalypse', description: 'Time since outbreak', type: 'select', min: 0, max: 12, options: [
    { value: 0, label: '0 (Start)' },
    { value: 1, label: '1 month' },
    { value: 2, label: '2 months' },
    { value: 3, label: '3 months' },
    { value: 4, label: '4 months' },
    { value: 5, label: '5 months' },
    { value: 6, label: '6 months' },
    { value: 7, label: '7 months' },
    { value: 8, label: '8 months' },
    { value: 9, label: '9 months' },
    { value: 10, label: '10 months' },
    { value: 11, label: '11 months' },
    { value: 12, label: '12 months' },
  ]},
];

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

export function SandboxVarsEditor({ serverName, isOpen, onClose }: SandboxVarsEditorProps) {
  const { data, isLoading } = useServerSandboxVars(serverName);
  const updateSandboxVars = useUpdateServerSandboxVars();
  const resetSandboxVars = useResetServerSandboxVars();

  const [localConfig, setLocalConfig] = useState<SandboxVars | null>(null);
  const [activeTab, setActiveTab] = useState<OptionCategory>('population');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const config = localConfig || data?.config || {};

  React.useEffect(() => {
    if (data?.config) {
      setLocalConfig(data.config);
    }
  }, [data?.config]);

  const handleValueChange = (key: string, value: unknown) => {
    setLocalConfig(prev => {
      if (!prev) return prev;
      const newConfig = JSON.parse(JSON.stringify(prev)) as SandboxVars;
      setNestedValue(newConfig as Record<string, unknown>, key, value);
      return newConfig;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!localConfig) return;
    try {
      await updateSandboxVars.mutateAsync({
        serverName,
        config: localConfig
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };

  const handleReset = async () => {
    try {
      await resetSandboxVars.mutateAsync(serverName);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to reset:', error);
    }
  };

  const filteredOptions = useMemo(() => {
    let options = SANDBOX_OPTIONS.filter(opt => opt.category === activeTab);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      options = options.filter(opt => 
        opt.label.toLowerCase().includes(query) || 
        opt.description.toLowerCase().includes(query)
      );
    }
    return options;
  }, [activeTab, searchQuery]);

  const renderInput = (option: SandboxOptionMeta) => {
    const value = getNestedValue(config as Record<string, unknown>, option.key);

    if (option.type === 'boolean') {
      return (
        <button
          onClick={() => handleValueChange(option.key, !value)}
          className={`
            w-12 h-6 rounded-full transition-colors relative
            ${value ? 'bg-green-500' : 'bg-gray-600'}
          `}
        >
          <span
            className={`
              absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
              ${value ? 'left-7' : 'left-1'}
            `}
          />
        </button>
      );
    }

    if (option.type === 'select' && option.options) {
      return (
        <select
          value={(value as number) ?? option.min}
          onChange={(e) => handleValueChange(option.key, parseInt(e.target.value))}
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
        >
          {option.options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    if (option.type === 'number') {
      return (
        <input
          type="number"
          value={(value as number) ?? option.min}
          min={option.min}
          max={option.max}
          onChange={(e) => handleValueChange(option.key, parseFloat(e.target.value))}
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
        />
      );
    }

    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-card border border-border rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-semibold">Difficulty Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            <div className="w-48 border-r border-border p-2 space-y-1">
              {OPTION_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`
                    w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                    ${activeTab === cat.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-accent'
                    }
                  `}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search settings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {filteredOptions.map(option => (
                  <div key={option.key} className="flex items-start gap-4 p-3 rounded-lg hover:bg-accent/50">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{option.description}</div>
                    </div>
                    <div className="w-40">
                      {renderInput(option)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between p-4 border-t border-border">
          <button
            onClick={handleReset}
            disabled={resetSandboxVars.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Default
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || updateSandboxVars.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm disabled:opacity-50"
            >
              {updateSandboxVars.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
