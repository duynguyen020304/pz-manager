'use client';

import { useState, useEffect } from 'react';
import { RESOURCE_ACTIONS, PERMISSION_PRESETS, getResourceLabel, getActionLabel, ALL_ACTIONS } from '@/lib/permission-constants';
import { Check } from 'lucide-react';

interface PermissionMatrixProps {
  value: Record<string, string[]>;
  onChange: (permissions: Record<string, string[]>) => void;
  disabled?: boolean;
  showPresets?: boolean;
}

export function PermissionMatrix({
  value,
  onChange,
  disabled = false,
  showPresets = true,
}: PermissionMatrixProps) {
  const [localValue, setLocalValue] = useState<Record<string, string[]>>(value);

  // Sync local state with prop
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const togglePermission = (resource: string, action: string) => {
    if (disabled) return;

    const currentActions = localValue[resource] || [];
    const newActions = currentActions.includes(action)
      ? currentActions.filter(a => a !== action)
      : [...currentActions, action];

    const newValue = {
      ...localValue,
      [resource]: newActions,
    };

    // Remove empty resource entries
    if (newActions.length === 0) {
      delete newValue[resource];
    }

    setLocalValue(newValue);
    onChange(newValue);
  };

  const applyPreset = (presetKey: keyof typeof PERMISSION_PRESETS) => {
    if (disabled) return;

    // Deep copy the preset permissions
    const presetPermissions = JSON.parse(JSON.stringify(PERMISSION_PRESETS[presetKey].permissions));
    setLocalValue(presetPermissions);
    onChange(presetPermissions);
  };

  const hasPermission = (resource: string, action: string): boolean => {
    return localValue[resource]?.includes(action) ?? false;
  };

  const isPresetActive = (presetKey: keyof typeof PERMISSION_PRESETS): boolean => {
    const preset = PERMISSION_PRESETS[presetKey].permissions;
    const presetStr = JSON.stringify(preset, Object.keys(preset).sort());
    const localStr = JSON.stringify(localValue, Object.keys(localValue).sort());
    return presetStr === localStr;
  };

  return (
    <div className="space-y-4">
      {/* Preset buttons */}
      {showPresets && (
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PERMISSION_PRESETS) as Array<keyof typeof PERMISSION_PRESETS>).map(presetKey => {
            const preset = PERMISSION_PRESETS[presetKey];
            return (
              <button
                key={presetKey}
                type="button"
                onClick={() => applyPreset(presetKey)}
                disabled={disabled}
                className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                  isPresetActive(presetKey)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Permission matrix table */}
      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground sticky left-0 bg-muted/50 z-10 min-w-[100px]">
                Resource
              </th>
              {ALL_ACTIONS.map(action => (
                <th
                  key={action}
                  className="px-2 py-2 text-center text-xs font-medium text-muted-foreground min-w-[60px]"
                >
                  {getActionLabel(action)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(RESOURCE_ACTIONS).map(([resource, availableActions]) => (
              <tr key={resource} className="border-t border-border hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2 text-sm font-medium text-foreground sticky left-0 bg-card z-10">
                  {getResourceLabel(resource)}
                </td>
                {ALL_ACTIONS.map(action => {
                  const isAvailable = availableActions.includes(action);
                  const isChecked = hasPermission(resource, action);

                  return (
                    <td key={`${resource}-${action}`} className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => togglePermission(resource, action)}
                        disabled={disabled || !isAvailable}
                        className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                          !isAvailable
                            ? 'bg-muted/30 cursor-not-allowed opacity-30'
                            : isChecked
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80 text-transparent hover:text-muted-foreground'
                        } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                        aria-label={`${getResourceLabel(resource)}: ${getActionLabel(action)}`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Permission count summary */}
      <div className="text-xs text-muted-foreground">
        {Object.keys(localValue).length === 0 ? (
          <span className="text-yellow-500">No permissions selected</span>
        ) : (
          <span>
            {Object.entries(localValue).reduce((sum, [, actions]) => sum + actions.length, 0)} permissions
            across {Object.keys(localValue).length} resources
          </span>
        )}
      </div>
    </div>
  );
}
