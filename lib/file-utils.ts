import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

export async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export async function getDirectorySize(dirPath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(`du -sb "${dirPath}"`);
    return parseInt(stdout.split('\t')[0], 10);
  } catch {
    return 0;
  }
}

export function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

export function formatTimestamp(timestamp: string): string {
  // Convert YYYYMMDD_HHMMSS to YYYY-MM-DD HH:MM:SS
  if (timestamp.length !== 15 || timestamp[8] !== '_') {
    return timestamp;
  }
  
  const year = timestamp.substring(0, 4);
  const month = timestamp.substring(4, 6);
  const day = timestamp.substring(6, 8);
  const hour = timestamp.substring(9, 11);
  const minute = timestamp.substring(11, 13);
  const second = timestamp.substring(13, 15);
  
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

export async function listDirectories(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
  } catch {
    return [];
  }
}

export async function getFileStats(filePath: string) {
  try {
    const stat = await fs.stat(filePath);
    return {
      size: stat.size,
      created: stat.birthtime,
      modified: stat.mtime,
      isDirectory: stat.isDirectory()
    };
  } catch {
    return null;
  }
}

export async function validateServer(serverPath: string): Promise<boolean> {
  try {
    const requiredFiles = ['map_meta.bin'];
    const requiredDirs = ['map', 'chunkdata'];
    
    for (const file of requiredFiles) {
      if (!await fileExists(path.join(serverPath, file))) {
        return false;
      }
    }
    
    for (const dir of requiredDirs) {
      if (!await directoryExists(path.join(serverPath, dir))) {
        return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
}

export async function hasServerIni(serverName: string): Promise<boolean> {
  const iniPath = `/root/Zomboid/Server/${serverName}.ini`;
  return fileExists(iniPath);
}

export async function hasServerDb(serverName: string): Promise<boolean> {
  const dbPath = `/root/Zomboid/db/${serverName}.db`;
  return fileExists(dbPath);
}

export async function detectAvailableServers(savesPath: string): Promise<Array<{
  name: string;
  valid: boolean;
  hasIni: boolean;
  hasDb: boolean;
  path: string;
}>> {
  const servers: Array<{
    name: string;
    valid: boolean;
    hasIni: boolean;
    hasDb: boolean;
    path: string;
  }> = [];
  
  try {
    const entries = await listDirectories(savesPath);
    
    for (const name of entries) {
      const serverPath = path.join(savesPath, name);
      const valid = await validateServer(serverPath);
      const hasIni = await hasServerIni(name);
      const hasDb = await hasServerDb(name);
      
      servers.push({
        name,
        valid,
        hasIni,
        hasDb,
        path: serverPath
      });
    }
  } catch (error) {
    console.error('Error detecting servers:', error);
  }
  
  return servers;
}
