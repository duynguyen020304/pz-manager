import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileExists } from './file-utils';
import { ZOMBOID_PATH, STEAM_CMD_PATH, getServerIniPath, SERVER_WORKSHOP_PATH } from '@/lib/paths';
import type { ServerModsConfig, ServerMod, ModEntry, ValidationResult } from '@/types/index.js';

const execAsync = promisify(exec);

const STEAM_APP_ID = '108600';

const STEAM_WORKSHOP_REGEX = /steamcommunity\.com\/sharedfiles\/filedetails\/\?id=(\d+)/;

/**
 * Fetch mod title from Steam Workshop page
 */
export async function fetchModTitleFromWorkshop(workshopId: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://steamcommunity.com/sharedfiles/filedetails/?id=${workshopId}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );
    
    if (!response.ok) {
      return null;
    }
    
    const html = await response.text();
    
    const titleMatch = html.match(/<div class="workshopItemTitle">([^<]+)<\/div>/);
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1].trim();
    }
    
    const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    if (ogTitleMatch && ogTitleMatch[1]) {
      return ogTitleMatch[1].trim();
    }
    
    return null;
  } catch (error) {
    console.error(`Failed to fetch mod title for ${workshopId}:`, error);
    return null;
  }
}

export function parseWorkshopId(url: string): string | null {
  const match = url.match(STEAM_WORKSHOP_REGEX);
  return match ? match[1] : null;
}

export function parseWorkshopIdFromUrl(url: string): string {
  const id = parseWorkshopId(url);
  if (!id) {
    throw new Error('Invalid Steam Workshop URL. Please provide a valid URL like: https://steamcommunity.com/sharedfiles/filedetails/?id=1234567890');
  }
  return id;
}

/**
 * Parse a server INI file to extract mod configuration
 */
export async function getServerMods(serverName: string): Promise<ServerModsConfig> {
  const iniPath = getServerIniPath(serverName);
  
  if (!await fileExists(iniPath)) {
    throw new Error(`Server configuration file not found: ${iniPath}`);
  }
  
  const content = await fs.readFile(iniPath, 'utf-8');
  
  const modsMatch = content.match(/^Mods=(.+)$/m);
  const mods = modsMatch && modsMatch[1].trim() 
    ? modsMatch[1].split(',').map(m => m.trim()).filter(Boolean)
    : [];
  
  const workshopMatch = content.match(/^WorkshopItems=(.+)$/m);
  const workshopItems: ServerMod[] = [];
  
  if (workshopMatch && workshopMatch[1].trim()) {
    const items = workshopMatch[1].split(';').map(item => item.trim()).filter(Boolean);
    for (const item of items) {
      const [workshopId, ...nameParts] = item.split('=');
      if (workshopId) {
        workshopItems.push({
          workshopId: workshopId.trim(),
          name: nameParts.length > 0 ? nameParts.join('=').trim() : workshopId.trim()
        });
      }
    }
  }
  
  const mapMatch = content.match(/^Map=(.+)$/m);
  const maps = mapMatch && mapMatch[1].trim()
    ? mapMatch[1].split(',').map(m => m.trim()).filter(Boolean)
    : ['Muldraugh, KY'];
  
  return {
    serverName,
    mods,
    workshopItems,
    maps
  };
}

/**
 * Get mod count summary for a server
 */
export async function getServerModSummary(serverName: string): Promise<{
  modCount: number;
  workshopCount: number;
  mapCount: number;
}> {
  try {
    const config = await getServerMods(serverName);
    return {
      modCount: config.mods.length,
      workshopCount: config.workshopItems.length,
      mapCount: config.maps.length
    };
  } catch {
    return {
      modCount: 0,
      workshopCount: 0,
      mapCount: 0
    };
  }
}

/**
 * Get global workshop mod directory path (steamcmd download location)
 */
function getGlobalWorkshopDir(workshopId: string): string {
  return path.join(ZOMBOID_PATH, 'steamapps', 'workshop', 'content', STEAM_APP_ID, workshopId);
}

/**
 * Get server-specific workshop mod directory path (CACHEDIR location)
 */
function getServerWorkshopDir(serverName: string, workshopId: string): string {
  return path.join(SERVER_WORKSHOP_PATH(serverName), workshopId);
}

/**
 * Download a mod from Steam Workshop using steamcmd
 * Downloads to global Steam workshop location (steamcmd limitation)
 */
export async function downloadMod(serverName: string, workshopId: string): Promise<string> {
  const globalWorkshopDir = getGlobalWorkshopDir(workshopId);

  if (await fileExists(globalWorkshopDir)) {
    console.log(`Mod ${workshopId} already downloaded`);
    return globalWorkshopDir;
  }

  console.log(`Downloading mod ${workshopId} via steamcmd...`);

  const cmd = `${STEAM_CMD_PATH} +login anonymous +workshop_download_item ${STEAM_APP_ID} ${workshopId} +quit`;

  try {
    await execAsync(cmd, { timeout: 300000 });
    console.log(`Successfully downloaded mod ${workshopId}`);
    return globalWorkshopDir;
  } catch (error) {
    console.error(`Failed to download mod ${workshopId}:`, error);
    throw new Error(`Failed to download mod from Steam Workshop. Please check the URL and try again.`);
  }
}

/**
 * Validate mod structure - check if it's server-compatible
 */
export async function validateMod(modPath: string): Promise<ValidationResult> {
  const luaPath = path.join(modPath, 'media', 'lua');
  
  const hasServer = await fileExists(path.join(luaPath, 'server'));
  const hasClient = await fileExists(path.join(luaPath, 'client'));
  const hasShared = await fileExists(path.join(luaPath, 'shared'));
  
  const hasServerCode = hasServer;
  const hasClientCode = hasClient;
  const hasSharedCode = hasShared;
  
  let isValid = true;
  let message = 'Mod is server-compatible';
  
  if (hasClientCode && !hasServerCode && !hasSharedCode) {
    isValid = false;
    message = 'This mod appears to be client-only and won\'t work on a dedicated server. It only contains client-side code (UI/visual effects) with no server components.';
  } else if (hasServerCode) {
    message = 'Mod has server-side code - fully compatible with dedicated servers.';
  } else if (hasSharedCode) {
    message = 'Mod has shared code - compatible with dedicated servers.';
  } else {
    message = 'Mod contains no Lua code (textures, models, etc.) - safe to use.';
  }
  
  return {
    isValid,
    message,
    hasServerCode,
    hasClientCode,
    hasSharedCode
  };
}

/**
 * Extract mod ID from info.txt file
 */
export async function extractModId(modPath: string): Promise<string> {
  const possiblePaths = [
    path.join(modPath, 'mods', 'mod.info'),
    path.join(modPath, 'mod.info'),
  ];
  
  for (const infoPath of possiblePaths) {
    if (await fileExists(infoPath)) {
      const content = await fs.readFile(infoPath, 'utf-8');
      const idMatch = content.match(/^id=(.+)$/m);
      if (idMatch && idMatch[1]) {
        return idMatch[1].trim();
      }
    }
  }
  
  const modsDir = path.join(modPath, 'mods');
  if (await fileExists(modsDir)) {
    const entries = await fs.readdir(modsDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory());
    if (dirs.length > 0) {
      return dirs[0].name;
    }
  }
  
  const pathParts = modPath.split('/');
  return pathParts[pathParts.length - 1];
}

/**
 * Extract mod name - fetches from Steam Workshop as primary, falls back to local file
 */
export async function extractModName(modPath: string, workshopId?: string): Promise<string> {
  if (workshopId) {
    const workshopName = await fetchModTitleFromWorkshop(workshopId);
    if (workshopName) {
      return workshopName;
    }
  }
  
  const possiblePaths = [
    path.join(modPath, 'mods', 'mod.info'),
    path.join(modPath, 'mod.info'),
  ];
  
  for (const infoPath of possiblePaths) {
    if (await fileExists(infoPath)) {
      const content = await fs.readFile(infoPath, 'utf-8');
      const nameMatch = content.match(/^name=(.+)$/m);
      if (nameMatch && nameMatch[1]) {
        return nameMatch[1].trim();
      }
    }
  }
  
  const pathParts = modPath.split('/');
  return pathParts[pathParts.length - 1];
}

/**
 * Add a mod to a server's INI configuration
 */
export async function addModToServer(
  serverName: string,
  workshopId: string,
  modId: string,
  modName: string
): Promise<ModEntry> {
  const iniPath = getServerIniPath(serverName);
  
  if (!await fileExists(iniPath)) {
    throw new Error(`Server configuration file not found: ${iniPath}`);
  }
  
  const content = await fs.readFile(iniPath, 'utf-8');
  
  let newContent = content;
  const workshopEntry = `${workshopId}=${modName}`;
  
  const workshopMatch = content.match(/^WorkshopItems=(.*)$/m);
  if (workshopMatch) {
    const existing = workshopMatch[1].trim();
    if (existing.includes(workshopId)) {
      throw new Error('This mod is already added to this server.');
    }
    const newWorkshopItems = existing ? `${existing};${workshopEntry}` : workshopEntry;
    newContent = newContent.replace(/^WorkshopItems=.*$/m, `WorkshopItems=${newWorkshopItems}`);
  } else {
    newContent += `\nWorkshopItems=${workshopEntry}`;
  }
  
  const modsMatch = content.match(/^Mods=(.*)$/m);
  if (modsMatch) {
    const existing = modsMatch[1].trim();
    const newMods = existing ? `${existing},${modId}` : modId;
    newContent = newContent.replace(/^Mods=.*$/m, `Mods=${newMods}`);
  } else {
    newContent += `\nMods=${modId}`;
  }
  
  await fs.writeFile(iniPath, newContent, 'utf-8');
  
  const modsConfig = await getServerMods(serverName);
  const order = modsConfig.workshopItems.findIndex(w => w.workshopId === workshopId);
  
  return {
    workshopId,
    modId,
    name: modName,
    order,
    isValid: true,
    validationMessage: 'Mod added successfully'
  };
}

/**
 * Update mod order in server INI configuration
 */
export async function updateModOrder(serverName: string, mods: ModEntry[]): Promise<void> {
  const iniPath = getServerIniPath(serverName);
  
  if (!await fileExists(iniPath)) {
    throw new Error(`Server configuration file not found: ${iniPath}`);
  }
  
  const content = await fs.readFile(iniPath, 'utf-8');
  
  const sortedMods = [...mods].sort((a, b) => a.order - b.order);
  const newModsOrder = sortedMods.map(m => m.modId).join(',');
  
  const modsMatch = content.match(/^Mods=(.*)$/m);
  let newContent = content;
  
  if (modsMatch) {
    newContent = newContent.replace(/^Mods=.*$/m, `Mods=${newModsOrder}`);
  }
  
  await fs.writeFile(iniPath, newContent, 'utf-8');
}

/**
 * Remove a mod from a server's INI configuration
 */
export async function removeModFromServer(serverName: string, workshopId: string): Promise<void> {
  const iniPath = getServerIniPath(serverName);
  
  if (!await fileExists(iniPath)) {
    throw new Error(`Server configuration file not found: ${iniPath}`);
  }
  
  const content = await fs.readFile(iniPath, 'utf-8');
  let newContent = content;
  
  const workshopMatch = content.match(/^WorkshopItems=(.*)$/m);
  if (workshopMatch) {
    const items = workshopMatch[1].split(';').map(item => item.trim()).filter(Boolean);
    const filteredItems = items.filter(item => !item.startsWith(`${workshopId}=`));
    const newWorkshopItems = filteredItems.join(';');
    newContent = newContent.replace(/^WorkshopItems=.*$/m, `WorkshopItems=${newWorkshopItems}`);
  }
  
  const modsMatch = content.match(/^Mods=(.*)$/m);
  if (modsMatch) {
    const mods = modsMatch[1].split(',').map(m => m.trim()).filter(Boolean);
    
    const modsConfig = await getServerMods(serverName);
    const modToRemove = modsConfig.workshopItems.find(w => w.workshopId === workshopId);
    const filteredMods = mods.filter(m => m !== modToRemove?.name);
    const newMods = filteredMods.join(',');
    newContent = newContent.replace(/^Mods=.*$/m, `Mods=${newMods}`);
  }
  
  await fs.writeFile(iniPath, newContent, 'utf-8');
}

/**
 * Get all mods with their order for a server
 */
export async function getServerModEntries(serverName: string): Promise<ModEntry[]> {
  const config = await getServerMods(serverName);
  
  const entries: ModEntry[] = config.workshopItems.map((item, index) => ({
    workshopId: item.workshopId,
    modId: config.mods[index] || item.workshopId,
    name: item.name,
    order: index,
    isValid: true
  }));
  
  return entries;
}
