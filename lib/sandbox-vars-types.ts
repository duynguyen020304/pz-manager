export interface ZombieLore {
  Speed?: number;
  Strength?: number;
  Toughness?: number;
  Transmission?: number;
  Mortality?: number;
  Reanimate?: number;
  Cognition?: number;
  Memory?: number;
  Decomp?: number;
  Sight?: number;
  Hearing?: number;
  Smell?: number;
  ThumpNoChasing?: boolean;
  ThumpOnConstruction?: boolean;
  ActiveOnly?: number;
  TriggerHouseAlarm?: boolean;
  ZombiesDragDown?: boolean;
  ZombiesFenceLunge?: boolean;
}

export interface ZombieConfig {
  PopulationMultiplier?: number;
  PopulationStartMultiplier?: number;
  PopulationPeakMultiplier?: number;
  PopulationPeakDay?: number;
  RespawnHours?: number;
  RespawnUnseenHours?: number;
  RespawnMultiplier?: number;
  RedistributeHours?: number;
  FollowSoundDistance?: number;
  RallyGroupSize?: number;
  RallyTravelDistance?: number;
  RallyGroupSeparation?: number;
  RallyGroupRadius?: number;
}

export interface SandboxVars {
  VERSION?: number;
  Zombies?: number;
  Distribution?: number;
  DayLength?: number;
  StartYear?: number;
  StartMonth?: number;
  StartDay?: number;
  StartTime?: number;
  WaterShut?: number;
  ElecShut?: number;
  WaterShutModifier?: number;
  ElecShutModifier?: number;
  FoodLoot?: number;
  WeaponLoot?: number;
  OtherLoot?: number;
  Temperature?: number;
  Rain?: number;
  ErosionSpeed?: number;
  XpMultiplier?: number;
  Farming?: number;
  StatsDecrease?: number;
  NatureAbundance?: number;
  Alarm?: number;
  LockedHouses?: number;
  StarterKit?: boolean;
  Nutrition?: boolean;
  FoodRotSpeed?: number;
  FridgeFactor?: number;
  LootRespawn?: number;
  TimeSinceApo?: number;
  PlantResilience?: number;
  PlantAbundance?: number;
  EndRegen?: number;
  ZombieLore?: ZombieLore;
  ZombieConfig?: ZombieConfig;
}

export type DifficultyPresetId = 'apocalypse' | 'survivor' | 'builder' | 'custom';

export interface DifficultyPreset {
  id: DifficultyPresetId;
  label: string;
  description: string;
  config: SandboxVars;
}

export interface SandboxOptionMeta {
  key: string;
  category: OptionCategory;
  label: string;
  description: string;
  type: 'number' | 'boolean' | 'select';
  min?: number;
  max?: number;
  options?: { value: number; label: string }[];
  nested?: boolean;
  nestedKey?: string;
}

export type OptionCategory =
  | 'population'
  | 'time'
  | 'world'
  | 'nature'
  | 'character'
  | 'zombie_lore'
  | 'zombie_config'
  | 'meta'
  | 'loot'
  | 'vehicle';

export interface SandboxVarsUpdateRequest {
  config?: SandboxVars;
  updates?: Partial<SandboxVars>;
  applyPreset?: DifficultyPresetId;
}

export interface SandboxVarsResponse {
  serverName: string;
  config: SandboxVars;
  filePath: string;
  exists: boolean;
}

export function createDefaultSandboxVars(): SandboxVars {
  return {
    VERSION: 4,
    Zombies: 4,
    Distribution: 1,
    DayLength: 3,
    StartYear: 1,
    StartMonth: 7,
    StartDay: 9,
    StartTime: 2,
    WaterShut: 2,
    ElecShut: 2,
    WaterShutModifier: 500,
    ElecShutModifier: 480,
    FoodLoot: 4,
    WeaponLoot: 2,
    OtherLoot: 3,
    Temperature: 3,
    Rain: 3,
    ErosionSpeed: 5,
    XpMultiplier: 1.0,
    Farming: 3,
    StatsDecrease: 4,
    NatureAbundance: 3,
    Alarm: 6,
    LockedHouses: 6,
    StarterKit: false,
    Nutrition: true,
    FoodRotSpeed: 5,
    FridgeFactor: 5,
    LootRespawn: 2,
    TimeSinceApo: 1,
    PlantResilience: 3,
    PlantAbundance: 3,
    EndRegen: 3,
    ZombieLore: {
      Speed: 3,
      Strength: 2,
      Toughness: 2,
      Transmission: 1,
      Mortality: 6,
      Reanimate: 1,
      Cognition: 3,
      Memory: 2,
      Decomp: 1,
      Sight: 2,
      Hearing: 2,
      Smell: 2,
      ThumpNoChasing: true,
      ThumpOnConstruction: true,
      ActiveOnly: 1,
      TriggerHouseAlarm: false,
      ZombiesDragDown: true,
      ZombiesFenceLunge: true,
    },
    ZombieConfig: {
      PopulationMultiplier: 1.0,
      PopulationStartMultiplier: 1.0,
      PopulationPeakMultiplier: 1.5,
      PopulationPeakDay: 28,
      RespawnHours: 72.0,
      RespawnUnseenHours: 16.0,
      RespawnMultiplier: 0.1,
      RedistributeHours: 12.0,
      FollowSoundDistance: 100,
      RallyGroupSize: 20,
      RallyTravelDistance: 20,
      RallyGroupSeparation: 15,
      RallyGroupRadius: 3,
    },
  };
}
