'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { ToggleCard } from '@/components/ui/toggle-card';
import { StepperControl } from '@/components/ui/stepper-control';

export type IniValueType = 'boolean' | 'number' | 'string';

interface DynamicIniInputProps {
  keyName: string;
  value: string;
  onChange: (key: string, value: string) => void;
}

/**
 * Detect the type of an INI value and render the appropriate input
 */
export function detectValueType(value: string): IniValueType {
  if (!value) return 'string';

  // Check for boolean values
  const lowerValue = value.toLowerCase().trim();
  if (['true', 'false', '1', '0', 'yes', 'no'].includes(lowerValue)) {
    return 'boolean';
  }

  // Check for numeric values
  if (/^-?\d+$/.test(value.trim())) {
    return 'number';
  }

  return 'string';
}

/**
 * Parse a boolean value from string
 */
export function parseBoolean(value: string): boolean {
  const lowerValue = value.toLowerCase().trim();
  return ['true', '1', 'yes'].includes(lowerValue);
}

/**
 * Convert value to proper string for INI file
 */
export function formatValue(value: string | boolean | number, type: IniValueType): string {
  if (type === 'boolean') {
    return typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value);
  }
  return String(value);
}

/**
 * Get a user-friendly label from key name
 * e.g., "MaxPlayers" -> "Max Players"
 */
export function getLabelFromKey(key: string): string {
  // Insert spaces before capital letters
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Dynamic input component that renders the appropriate input type
 * based on the value content
 */
export function DynamicIniInput({ keyName, value, onChange }: DynamicIniInputProps) {
  const t = useTranslations('components.servers.dynamicIniInput.descriptions');
  const type = detectValueType(value);
  const label = getLabelFromKey(keyName);
  const description = t(keyName, { default: '' }) || undefined;

  if (type === 'boolean') {
    const boolValue = parseBoolean(value);
    return (
      <ToggleCard
        label={label}
        description={description}
        checked={boolValue}
        onChange={(checked) => onChange(keyName, checked ? 'true' : 'false')}
      />
    );
  }

  if (type === 'number') {
    const numValue = parseInt(value, 10) || 0;
    return (
      <StepperControl
        label={label}
        description={description}
        value={numValue}
        onChange={(newValue) => onChange(keyName, String(newValue))}
        min={0}
        max={keyName.includes('Port') ? 65535 : 999999}
      />
    );
  }

  // String input
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(keyName, e.target.value)}
        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-foreground"
      />
    </div>
  );
}

export default DynamicIniInput;
