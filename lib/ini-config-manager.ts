'use server';

import fs from 'fs/promises';
import { getServerIniPath } from '@/lib/paths';
import { IniConfig, parseIniContent, generateIniContent } from './ini-utils';

// Re-export types only
export type { IniConfig } from './ini-utils';

/**
 * Parse an INI file and return all key-value pairs
 * Handles comments (lines starting with # or ;) and empty lines
 */
export async function readIniFile(serverName: string): Promise<IniConfig> {
  const iniPath = getServerIniPath(serverName);

  try {
    const content = await fs.readFile(iniPath, 'utf-8');
    return parseIniContent(content);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // File doesn't exist, return empty config
      return {};
    }
    console.error('Failed to read INI file:', error);
    throw new Error(`Failed to read INI file for server: ${serverName}`);
  }
}

/**
 * Write INI configuration to file
 * Preserves comments and formatting is basic but functional
 */
export async function writeIniFile(serverName: string, config: IniConfig): Promise<void> {
  const iniPath = getServerIniPath(serverName);

  try {
    // Read existing content to preserve comments if possible
    let existingContent = '';
    try {
      existingContent = await fs.readFile(iniPath, 'utf-8');
    } catch {
      // File doesn't exist, start fresh
    }

    const newContent = generateIniContent(config, existingContent);
    await fs.writeFile(iniPath, newContent, 'utf-8');
  } catch (error) {
    console.error('Failed to write INI file:', error);
    throw new Error(`Failed to write INI file for server: ${serverName}`);
  }
}

/**
 * Update specific keys in the INI file while preserving others
 */
export async function updateIniValues(
  serverName: string,
  updates: Record<string, string>
): Promise<IniConfig> {
  const currentConfig = await readIniFile(serverName);
  const newConfig = { ...currentConfig, ...updates };
  await writeIniFile(serverName, newConfig);
  return newConfig;
}

/**
 * Get a specific INI value
 */
export async function getIniValue(serverName: string, key: string): Promise<string | undefined> {
  const config = await readIniFile(serverName);
  return config[key];
}

/**
 * Set a specific INI value
 */
export async function setIniValue(serverName: string, key: string, value: string): Promise<void> {
  await updateIniValues(serverName, { [key]: value });
}
