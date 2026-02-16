import fs from 'fs/promises';
import { existsSync } from 'fs';
import { getSandboxVarsPath } from './paths';
import { SandboxVars, createDefaultSandboxVars } from './sandbox-vars-types';
import { parseSandboxVars, generateSandboxVarsContent } from './sandbox-vars-utils';

export async function readSandboxVars(serverName: string): Promise<SandboxVars> {
  const filePath = getSandboxVarsPath(serverName);

  if (!existsSync(filePath)) {
    return createDefaultSandboxVars();
  }

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return parseSandboxVars(content);
  } catch (error) {
    console.error('Failed to read SandboxVars:', { serverName, error });
    return createDefaultSandboxVars();
  }
}

export async function writeSandboxVars(
  serverName: string,
  config: SandboxVars
): Promise<void> {
  const filePath = getSandboxVarsPath(serverName);
  const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));

  try {
    await fs.mkdir(dirPath, { recursive: true });
    const content = generateSandboxVarsContent(config);
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    console.error('Failed to write SandboxVars:', { serverName, error });
    throw error;
  }
}

export async function updateSandboxVars(
  serverName: string,
  updates: Partial<SandboxVars>
): Promise<SandboxVars> {
  const currentConfig = await readSandboxVars(serverName);

  const mergedConfig: SandboxVars = {
    ...currentConfig,
    ...updates,
    ZombieLore: {
      ...currentConfig.ZombieLore,
      ...(updates.ZombieLore || {}),
    },
    ZombieConfig: {
      ...currentConfig.ZombieConfig,
      ...(updates.ZombieConfig || {}),
    },
  };

  await writeSandboxVars(serverName, mergedConfig);
  return mergedConfig;
}

export async function applyPreset(
  serverName: string,
  presetConfig: SandboxVars
): Promise<SandboxVars> {
  await writeSandboxVars(serverName, presetConfig);
  return presetConfig;
}

export async function resetSandboxVars(serverName: string): Promise<SandboxVars> {
  const defaultConfig = createDefaultSandboxVars();
  await writeSandboxVars(serverName, defaultConfig);
  return defaultConfig;
}

export async function sandboxVarsExists(serverName: string): Promise<boolean> {
  const filePath = getSandboxVarsPath(serverName);
  return existsSync(filePath);
}

export function getSandboxVarsFilePath(serverName: string): string {
  return getSandboxVarsPath(serverName);
}
