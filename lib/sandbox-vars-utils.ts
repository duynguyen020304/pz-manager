import { SandboxVars, ZombieLore, ZombieConfig } from './sandbox-vars-types';

function stripComments(content: string): string {
  let result = '';
  let i = 0;
  let inString = false;
  let stringChar = '';
  let inLongString = false;
  let longStringLevel = 0;

  while (i < content.length) {
    if (inLongString) {
      if (content.slice(i, i + 2) === ']]') {
        longStringLevel--;
        if (longStringLevel === 0) {
          inLongString = false;
        }
        result += content[i];
        i++;
      } else {
        result += content[i];
      }
      i++;
      continue;
    }

    if (inString) {
      if (content[i] === '\\' && i + 1 < content.length) {
        result += content[i] + content[i + 1];
        i += 2;
        continue;
      }
      if (content[i] === stringChar) {
        inString = false;
      }
      result += content[i];
      i++;
      continue;
    }

    if (content[i] === '"' || content[i] === "'") {
      inString = true;
      stringChar = content[i];
      result += content[i];
      i++;
      continue;
    }

    if (content.slice(i, i + 2) === '--[[') {
      inLongString = true;
      longStringLevel = 1;
      i += 2;
      continue;
    }

    if (content.slice(i, i + 2) === '--') {
      while (i < content.length && content[i] !== '\n') {
        i++;
      }
      continue;
    }

    result += content[i];
    i++;
  }

  return result;
}

function parseValue(content: string, start: number): { value: unknown; end: number } {
  let i = start;
  while (i < content.length && /\s/.test(content[i])) i++;

  if (i >= content.length) return { value: undefined, end: i };

  const char = content[i];

  if (char === '{') {
    return parseTable(content, i);
  }

  if (char === '"' || char === "'") {
    return parseString(content, i);
  }

  if (char === 't' && content.slice(i, i + 4) === 'true') {
    return { value: true, end: i + 4 };
  }

  if (char === 'f' && content.slice(i, i + 5) === 'false') {
    return { value: false, end: i + 5 };
  }

  if (char === 'n' && content.slice(i, i + 4) === 'nil') {
    return { value: null, end: i + 3 };
  }

  return parseNumber(content, i);
}

function parseString(content: string, start: number): { value: string; end: number } {
  const quote = content[start];
  let i = start + 1;
  let result = '';

  while (i < content.length) {
    if (content[i] === '\\' && i + 1 < content.length) {
      const escaped = content[i + 1];
      switch (escaped) {
        case 'n': result += '\n'; break;
        case 't': result += '\t'; break;
        case 'r': result += '\r'; break;
        case '\\': result += '\\'; break;
        case quote: result += quote; break;
        default: result += escaped;
      }
      i += 2;
      continue;
    }
    if (content[i] === quote) {
      return { value: result, end: i + 1 };
    }
    result += content[i];
    i++;
  }

  return { value: result, end: i };
}

function parseNumber(content: string, start: number): { value: number; end: number } {
  let i = start;
  let hasDot = false;

  if (content[i] === '-') {
    i++;
  }

  while (i < content.length) {
    if (/\d/.test(content[i])) {
      i++;
      continue;
    }
    if (content[i] === '.' && !hasDot) {
      hasDot = true;
      i++;
      continue;
    }
    break;
  }

  const numStr = content.slice(start, i);
  const value = parseFloat(numStr);
  return { value: isNaN(value) ? 0 : value, end: i };
}

function parseTable(content: string, start: number): { value: unknown; end: number } {
  let i = start + 1;
  const obj: Record<string, unknown> = {};
  let arrayIndex = 1;

  while (i < content.length) {
    while (i < content.length && /\s/.test(content[i])) i++;
    if (i >= content.length || content[i] === '}') {
      return { value: obj, end: i + 1 };
    }

    let key: string | number | undefined;

    if (content[i] === '[') {
      const keyResult = parseTableKey(content, i);
      if (keyResult) {
        key = keyResult.key;
        i = keyResult.end;
        while (i < content.length && /\s/.test(content[i])) i++;
        if (content[i] === ']') i++;
        while (i < content.length && /\s/.test(content[i])) i++;
        if (content[i] === '=') i++;
      }
    } else if (/[a-zA-Z_]/.test(content[i])) {
      const keyStart = i;
      while (i < content.length && /[a-zA-Z0-9_]/.test(content[i])) i++;
      const potentialKey = content.slice(keyStart, i);
      while (i < content.length && /\s/.test(content[i])) i++;
      if (content[i] === '=') {
        key = potentialKey;
        i++;
      } else {
        key = arrayIndex++;
        i = keyStart;
      }
    }

    if (key === undefined) {
      i++;
      continue;
    }

    while (i < content.length && /\s/.test(content[i])) i++;
    const valueResult = parseValue(content, i);
    i = valueResult.end;

    if (key !== undefined) {
      if (typeof key === 'number') {
        obj[String(key)] = valueResult.value;
      } else {
        obj[key] = valueResult.value;
      }
    }

    while (i < content.length && /\s/.test(content[i])) i++;
    if (content[i] === ',') i++;
  }

  return { value: obj, end: i };
}

function parseTableKey(content: string, start: number): { key: string | number; end: number } | null {
  let i = start + 1;
  while (i < content.length && /\s/.test(content[i])) i++;

  if (content[i] === '"' || content[i] === "'") {
    const strResult = parseString(content, i);
    return { key: strResult.value as string, end: strResult.end };
  }

  if (/\d/.test(content[i])) {
    const numResult = parseNumber(content, i);
    return { key: numResult.value as number, end: numResult.end };
  }

  return null;
}

function convertLegacyArrayToObject(obj: Record<string, unknown>): void {
  const zombieLore = obj.ZombieLore;
  if (Array.isArray(zombieLore)) {
    const loreObj: Record<string, unknown> = {};
    for (let i = 0; i < zombieLore.length; i += 2) {
      const key = zombieLore[i];
      const value = zombieLore[i + 1];
      if (typeof key === 'string') {
        loreObj[key] = value;
      }
    }
    obj.ZombieLore = loreObj as ZombieLore;
  }

  const zombieConfig = obj.ZombieConfig;
  if (Array.isArray(zombieConfig)) {
    const configObj: Record<string, unknown> = {};
    for (let i = 0; i < zombieConfig.length; i += 2) {
      const key = zombieConfig[i];
      const value = zombieConfig[i + 1];
      if (typeof key === 'string') {
        configObj[key] = value;
      }
    }
    obj.ZombieConfig = configObj as ZombieConfig;
  }
}

export function parseSandboxVars(content: string): SandboxVars {
  const cleanContent = stripComments(content);
  const tableStartIndex = cleanContent.indexOf('{');

  if (tableStartIndex === -1) {
    return {} as SandboxVars;
  }

  const { value } = parseTable(cleanContent, tableStartIndex);

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const parsedObject = value as Record<string, unknown>;

    const sandboxVars = parsedObject.SandboxVars && typeof parsedObject.SandboxVars === 'object'
      ? parsedObject.SandboxVars as Record<string, unknown>
      : parsedObject;

    convertLegacyArrayToObject(sandboxVars);
    return sandboxVars as unknown as SandboxVars;
  }

  return {} as SandboxVars;
}

function formatValue(value: unknown, indent: number): string {
  const spaces = '    '.repeat(indent);

  if (value === null) {
    return 'nil';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  if (typeof value === 'string') {
    const needsQuotes = value.includes('\n') || value.includes('"') || value.includes("'");
    if (needsQuotes) {
      const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
      return `"${escaped}"`;
    }
    return `"${value}"`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '{}';
    const items = value.map(v => `${spaces}    ${formatValue(v, indent + 1)}`);
    return `{\n${items.join(',\n')}\n${spaces}}`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '{}';

    const items = entries.map(([k, v]) => {
      const formattedValue = formatValue(v, indent + 1);
      return `${spaces}    ${k} = ${formattedValue}`;
    });
    return `{\n${items.join(',\n')}\n${spaces}}`;
  }

  return 'nil';
}

export function generateSandboxVarsContent(config: SandboxVars): string {
  const lines: string[] = [
    'function getSandboxVars()',
    '    return {',
  ];

  const topLevelKeys = [
    'VERSION', 'Zombies', 'Distribution', 'DayLength', 'StartYear', 'StartMonth',
    'StartDay', 'StartTime', 'WaterShut', 'ElecShut', 'WaterShutModifier',
    'ElecShutModifier', 'FoodLoot', 'WeaponLoot', 'OtherLoot', 'Temperature',
    'Rain', 'ErosionSpeed', 'XpMultiplier', 'Farming', 'StatsDecrease',
    'NatureAbundance', 'Alarm', 'LockedHouses', 'StarterKit', 'Nutrition',
    'FoodRotSpeed', 'FridgeFactor', 'LootRespawn', 'TimeSinceApo',
    'PlantResilience', 'PlantAbundance', 'EndRegen'
  ];

  for (const key of topLevelKeys) {
    if (key in config) {
      const value = (config as Record<string, unknown>)[key];
      if (value !== undefined) {
        lines.push(`        ${key} = ${formatValue(value, 1)},`);
      }
    }
  }

  if (config.ZombieLore) {
    lines.push('        ZombieLore = {');
    const loreKeys = [
      'Speed', 'Strength', 'Toughness', 'Transmission', 'Mortality',
      'Reanimate', 'Cognition', 'Memory', 'Decomp', 'Sight', 'Hearing',
      'Smell', 'ThumpNoChasing', 'ThumpOnConstruction', 'ActiveOnly',
      'TriggerHouseAlarm', 'ZombiesDragDown', 'ZombiesFenceLunge'
    ];
    for (const key of loreKeys) {
      if (key in config.ZombieLore) {
        const value = (config.ZombieLore as Record<string, unknown>)[key];
        if (value !== undefined) {
          lines.push(`            ${key} = ${formatValue(value, 2)},`);
        }
      }
    }
    lines.push('        },');
  }

  if (config.ZombieConfig) {
    lines.push('        ZombieConfig = {');
    const configKeys = [
      'PopulationMultiplier', 'PopulationStartMultiplier', 'PopulationPeakMultiplier',
      'PopulationPeakDay', 'RespawnHours', 'RespawnUnseenHours', 'RespawnMultiplier',
      'RedistributeHours', 'FollowSoundDistance', 'RallyGroupSize',
      'RallyTravelDistance', 'RallyGroupSeparation', 'RallyGroupRadius'
    ];
    for (const key of configKeys) {
      if (key in config.ZombieConfig) {
        const value = (config.ZombieConfig as Record<string, unknown>)[key];
        if (value !== undefined) {
          lines.push(`            ${key} = ${formatValue(value, 2)},`);
        }
      }
    }
    lines.push('        },');
  }

  if (config.MultiplierConfig) {
    lines.push('        MultiplierConfig = {');
    const multiplierKeys = [
      'Global', 'GlobalToggle', 'Fitness', 'Strength', 'Sprinting',
      'Lightfoot', 'Nimble', 'Sneak', 'Axe', 'Blunt', 'SmallBlunt',
      'LongBlade', 'SmallBlade', 'Spear', 'Maintenance', 'Woodwork',
      'Cooking', 'Farming', 'Doctor', 'Electricity', 'MetalWelding',
      'Mechanics', 'Tailoring', 'Aiming', 'Reloading', 'Fishing',
      'Trapping', 'PlantScavenging', 'FlintKnapping', 'Masonry', 'Pottery',
      'Carving', 'Husbandry', 'Tracking', 'Blacksmith', 'Butchering',
      'Glassmaking'
    ];
    for (const key of multiplierKeys) {
      if (key in config.MultiplierConfig) {
        const value = (config.MultiplierConfig as Record<string, unknown>)[key];
        if (value !== undefined) {
          lines.push(`            ${key} = ${formatValue(value, 2)},`);
        }
      }
    }
    lines.push('        },');
  }

  lines.push('    }');
  lines.push('end');

  return lines.join('\n');
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;

  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);

  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (!bKeys.includes(key)) return false;
    if (!deepEqual(aObj[key], bObj[key])) return false;
  }

  return true;
}
