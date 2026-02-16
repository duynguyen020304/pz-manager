'use client';

import React from 'react';
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
 * Get a description for common INI options
 */
export function getDescriptionForKey(key: string): string | undefined {
  const descriptions: Record<string, string> = {
    PublicName: 'Server name shown in the public server browser',
    PublicDescription: 'Description shown in the public server browser',
    MaxPlayers: 'Maximum number of concurrent players',
    PVP: 'Enable player vs player combat',
    PauseEmpty: 'Pause the server when no players are online',
    GlobalChat: 'Enable global chat (/all command)',
    Password: 'Password required to join the server',
    AdminPassword: 'Password for admin access',
    SafehouseAllowTrespass: 'Allow non-members to enter safehouses',
    SafehouseAllowFire: 'Allow fire to damage safehouses',
    SafehouseAllowLoot: 'Allow non-members to loot safehouses',
    SafehouseAllowRespawn: 'Allow respawning in owned safehouses',
    PlayerSafehouse: 'Allow players to claim safehouses',
    Faction: 'Enable faction system',
    VoiceEnable: 'Enable in-game voice chat',
    Voice3D: 'Enable 3D positional voice',
    SteamVAC: 'Enable Valve Anti-Cheat',
    Public: 'Make server visible in Steam browser',
    Mods: 'Comma-separated list of mod IDs',
    Map: 'Map locations to load',
    WorkshopItems: 'Steam Workshop item IDs',
    DefaultPort: 'Main game port',
    UDPPort: 'UDP communication port',
    RCONPort: 'RCON administration port',
    RCONPassword: 'RCON access password',
    PingLimit: 'Maximum ping before kick (ms)',
    HoursForLootRespawn: 'Hours before loot respawns (0=never)',
    ConstructionPreventsLootRespawn: 'Player constructions block loot respawn',
    DropOffWhiteListAfterDeath: 'Remove players from whitelist on death',
    NoFire: 'Disable all fires',
    AnnounceDeath: 'Announce player deaths globally',
    MinutesPerPage: 'Minutes to read one page',
    SaveWorldEveryMinutes: 'Auto-save interval in minutes (0=never)',
    SafehouseDaySurvivedToClaim: 'Days survived required to claim safehouse',
    SafeHouseRemovalTime: 'Hours of inactivity before safehouse removal',
    AllowDestructionBySledgehammer: 'Allow sledgehammer world destruction',
    KickFastPlayers: 'Kick players moving too fast',
    PlayerRespawnWithSelf: 'Respawn at place of death',
    FastForwardMultiplier: 'Fast-forward speed multiplier',
    BloodSplatLifespanDays: 'Days blood splats last (0=forever)',
  };

  return descriptions[key];
}

/**
 * Dynamic input component that renders the appropriate input type
 * based on the value content
 */
export function DynamicIniInput({ keyName, value, onChange }: DynamicIniInputProps) {
  const type = detectValueType(value);
  const label = getLabelFromKey(keyName);
  const description = getDescriptionForKey(keyName);

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
