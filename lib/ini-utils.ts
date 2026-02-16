/**
 * INI Configuration Utilities
 * These functions can be used on both client and server
 */

export interface IniConfig {
  [key: string]: string;
}

/**
 * Parse value as boolean (handles "true", "True", "TRUE", "1", "false", etc.)
 */
export function parseBooleanValue(value: string | undefined): boolean {
  if (!value) return false;
  return ['true', 'True', 'TRUE', '1', 'yes', 'Yes', 'YES'].includes(value.trim());
}

/**
 * Parse value as number
 */
export function parseNumberValue(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Convert boolean to INI string value
 */
export function booleanToString(value: boolean): string {
  return value ? 'true' : 'false';
}

/**
 * Parse an INI content string into key-value pairs
 * Handles comments (lines starting with # or ;) and empty lines
 */
export function parseIniContent(content: string): IniConfig {
  const config: IniConfig = {};

  const lines = content.split('\n');
  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith(';')) {
      continue;
    }

    // Parse key=value format
    const equalIndex = trimmedLine.indexOf('=');
    if (equalIndex === -1) {
      continue;
    }

    const key = trimmedLine.substring(0, equalIndex).trim();
    const value = trimmedLine.substring(equalIndex + 1).trim();

    if (key) {
      config[key] = value;
    }
  }

  return config;
}

/**
 * Generate INI content from config object
 * Attempts to preserve comments from existing content
 */
export function generateIniContent(config: IniConfig, existingContent: string): string {
  const lines: string[] = [];
  const processedKeys = new Set<string>();

  // Process existing lines to preserve comments and structure
  const existingLines = existingContent.split('\n');

  for (const line of existingLines) {
    const trimmedLine = line.trim();

    // Keep empty lines and comments as-is
    if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith(';')) {
      lines.push(line);
      continue;
    }

    // Parse key from existing line
    const equalIndex = trimmedLine.indexOf('=');
    if (equalIndex === -1) {
      lines.push(line);
      continue;
    }

    const key = trimmedLine.substring(0, equalIndex).trim();

    // If this key exists in new config, use the new value
    if (key in config) {
      lines.push(`${key}=${config[key]}`);
      processedKeys.add(key);
    } else {
      // Key was removed, skip it
      continue;
    }
  }

  // Add any new keys that weren't in the existing file
  for (const [key, value] of Object.entries(config)) {
    if (!processedKeys.has(key)) {
      lines.push(`${key}=${value}`);
    }
  }

  return lines.join('\n');
}

/**
 * Get default INI configuration for a new server
 */
export function getDefaultIniConfig(): IniConfig {
  return {
    PublicName: '',
    PublicDescription: '',
    MaxPlayers: '16',
    PVP: 'true',
    PauseEmpty: 'true',
    GlobalChat: 'true',
    Open: 'true',
    Password: '',
    AdminPassword: '',
    SafehouseAllowTrespass: 'true',
    SafehouseAllowFire: 'true',
    SafehouseAllowLoot: 'true',
    SafehouseAllowRespawn: 'false',
    PlayerSafehouse: 'true',
    Faction: 'true',
    VoiceEnable: 'true',
    Voice3D: 'true',
    SteamVAC: 'true',
    Public: 'true',
    Mods: '',
    Map: 'Muldraugh, KY',
    WorkshopItems: '',
  };
}
