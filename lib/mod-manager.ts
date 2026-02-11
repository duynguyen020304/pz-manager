import fs from 'fs/promises';
import path from 'path';
import { fileExists } from './file-utils';
import type { ServerModsConfig, ServerMod } from '@/types/index.js';

const ZOMBOID_PATH = process.env.ZOMBOID_PATH || '/root/Zomboid';

/**
 * Parse a server INI file to extract mod configuration
 */
export async function getServerMods(serverName: string): Promise<ServerModsConfig> {
  const iniPath = path.join(ZOMBOID_PATH, 'Server', `${serverName}.ini`);
  
  if (!await fileExists(iniPath)) {
    throw new Error(`Server configuration file not found: ${iniPath}`);
  }
  
  const content = await fs.readFile(iniPath, 'utf-8');
  
  // Parse Mods (comma-separated)
  const modsMatch = content.match(/^Mods=(.+)$/m);
  const mods = modsMatch && modsMatch[1].trim() 
    ? modsMatch[1].split(',').map(m => m.trim()).filter(Boolean)
    : [];
  
  // Parse WorkshopItems (semicolon-separated)
  const workshopMatch = content.match(/^WorkshopItems=(.+)$/m);
  const workshopItems: ServerMod[] = [];
  
  if (workshopMatch && workshopMatch[1].trim()) {
    const items = workshopMatch[1].split(';').map(item => item.trim()).filter(Boolean);
    // Each item is in format: workshopId=modName
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
  
  // Parse Map (comma-separated, can be multiple maps)
  const mapMatch = content.match(/^Map=(.+)$/m);
  const maps = mapMatch && mapMatch[1].trim()
    ? mapMatch[1].split(',').map(m => m.trim()).filter(Boolean)
    : ['Muldraugh, KY']; // Default map
  
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
