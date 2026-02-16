# Project Zomboid Server Manager - Configuration Options Analysis & Implementation Plan

## Executive Summary

After thorough exploration of the codebase, external documentation research, and web searches, I've identified all configuration options across three categories: **INI Config Options**, **RAM/JVM Options**, and **Steam Options**. 

**Current State:**
- The web manager only manages a **subset** of INI options (Mods, WorkshopItems, Map, AdminPassword)
- **NO RAM/JVM options** are exposed through the web UI - must be configured directly in server files
- Steam integration is primarily for **Workshop mod management** and **SteamCMD downloads**

**Key Gap:** RAM/JVM memory settings cannot be configured through the web manager and must be edited directly in `/opt/pzserver/start-server.sh` or `ProjectZomboid64.json`.

---

## 1. INI CONFIGURATION OPTIONS

### 1.1 Currently Managed by Web Manager

These options are actively parsed and modified by the web manager:

| Option | Type | Format | Managed In | Description |
|--------|------|--------|------------|-------------|
| `Mods` | string | comma-separated | `lib/mod-manager.ts` | Active mod IDs loaded by server |
| `WorkshopItems` | string | semicolon-separated (workshopId=modName) | `lib/mod-manager.ts` | Steam Workshop item mappings |
| `Map` | string | comma-separated | `lib/mod-manager.ts` | Map locations enabled |
| `AdminPassword` | string | plain text | Migration scripts | Admin access password |

**File Location:** `{SERVER_CACHE_DIR}/{serverName}/Server/{serverName}.ini`

### 1.2 Available but NOT Managed by Web Manager

Based on PZwiki documentation and game files, these INI options exist but are NOT exposed through the web interface:

#### Network & Connection

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `DefaultPort` | integer | 16261 | Main game port (auto-calculated as 16261 + index*10) |
| `UDPPort` | integer | 16262 | UDP communication port (auto-calculated) |
| `RCONPort` | integer | 27015 | RCON admin port (auto-calculated) |
| `SteamPort1` | integer | 8766 | Steam networking port 1 |
| `SteamPort2` | integer | 8767 | Steam networking port 2 |
| `PingFrequency` | integer | 10 | How often server checks player connections |
| `PingLimit` | integer | 250 | Ping limit before kick (ms, 100=disabled) |
| `UseTCPForMapDownloads` | boolean | false | Use TCP instead of UDP for map downloads |

#### Server Identity & Visibility

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `Public` | boolean | true | Server visible on Steam server browser |
| `PublicName` | string | "" | Server name shown publicly |
| `PublicDescription` | string | "" | Server description for public listing |
| `ServerWelcomeMessage` | string | "Welcome to Project Zomboid..." | Message shown to connecting players |
| `ServerPlayerID` | integer | (auto) | Identifies characters from other servers |
| `ResetID` | integer | (auto) | Removing resets world zombies/loot |

#### Player Management

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `MaxPlayers` | integer | 16 | Maximum concurrent players |
| `MaxAccountsPerUser` | integer | 0 | Max accounts per Steam user (0=unlimited) |
| `Password` | string | "" | Server join password |
| `AutoCreateUserInWhiteList` | boolean | false | Auto-add new users to whitelist |
| `DropOffWhiteListAfterDeath` | boolean | false | Remove from whitelist on death |
| `Open` | boolean | true | Open to all (no whitelist required) |

#### Game Mechanics

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `PVP` | boolean | true | Enable player vs player combat |
| `PauseEmpty` | boolean | true | Pause when no players online |
| `GlobalChat` | boolean | true | Enable /all global chat |
| `ChatStreams` | string | "s,r,a,w,y,sh,f,all" | Enabled chat channels |
| `DisplayUserName` | boolean | true | Show usernames above characters |
| `ShowFirstAndLastName` | boolean | false | Show character names instead of usernames |
| `SpawnPoint` | string | "0,0,0" | Custom spawn coordinates (X,Y,Z) |
| `SpawnItems` | string | "" | Items new players spawn with |
| `MinutesPerPage` | float | 1.0 | Minutes to read one page |
| `SaveWorldEveryMinutes` | integer | 0 | Auto-save interval (0=never) |
| `PlayerRespawnWithSelf` | boolean | false | Respawn at death location |
| `PlayerRespawnWithOther` | boolean | false | Respawn at splitscreen partner |
| `FastForwardMultiplier` | float | 40.0 | Fast-forward speed multiplier |

#### Safety & PVP System

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `SafetySystem` | boolean | true | Enable PVP safety toggle |
| `ShowSafety` | boolean | true | Show skull icon when safety off |
| `SafetyToggleTimer` | integer | 2 | Time to toggle PVP (seconds) |
| `SafetyCooldownTimer` | integer | 3 | Cooldown between toggles (seconds) |
| `PVPMeleeWhileHitReaction` | boolean | false | Allow melee while hit reaction |
| `PVPMeleeDamageModifier` | float | 30.0 | Melee damage modifier (%) |
| `PVPFirearmDamageModifier` | float | 50.0 | Firearm damage modifier (%) |

#### Safehouse System

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `PlayerSafehouse` | boolean | true | Players can claim safehouses |
| `AdminSafehouse` | boolean | false | Admins can claim safehouses |
| `SafehouseAllowTrepass` | boolean | true | Allow non-members to enter |
| `SafehouseAllowFire` | boolean | true | Fire can damage safehouses |
| `SafehouseAllowLoot` | boolean | true | Non-members can loot safehouses |
| `SafehouseAllowRespawn` | boolean | false | Respawn in owned safehouse |
| `SafehouseDaySurvivedToClaim` | integer | 0 | Days survived required to claim |
| `SafeHouseRemovalTime` | integer | 144 | Hours before removal for inactivity |
| `DisableSafehouseWhenPlayerConnected` | boolean | false | Disable safehouse when owner online |

#### Loot & World Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `HoursForLootRespawn` | integer | 0 | Hours before loot respawns (0=never) |
| `MaxItemsForLootRespawn` | integer | 4 | Max items in container before respawn |
| `ConstructionPreventsLootRespawn` | boolean | true | Player constructions block respawn |
| `HoursForWorldItemRemoval` | float | 0.0 | Hours before world items removed |
| `WorldItemRemovalList` | string | "Base.Vest,Base.Shirt..." | Items to remove from ground |
| `ItemNumbersLimitPerContainer` | integer | 0 | Max items per container (0=unlimited) |

#### Anti-Cheat & Security

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `SteamVAC` | boolean | true | Enable Valve Anti-Cheat |
| `KickFastPlayers` | boolean | false | Kick players moving too fast |
| `DenyLoginOnOverloadedServer` | boolean | true | Deny login when overloaded |
| `DoLuaChecksum` | boolean | true | Verify Lua checksums |
| `MouseOverToSeeDisplayName` | boolean | true | Must mouseover to see names |
| `HidePlayersBehindYou` | boolean | true | Hide players behind your character |

#### Voice Chat

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `VoiceEnable` | boolean | true | Enable in-game voice chat |
| `VoiceComplexity` | integer | 5 | Voice codec complexity |
| `VoicePeriod` | integer | 20 | Voice packet period (ms) |
| `VoiceSampleRate` | integer | 24000 | Voice sample rate (Hz) |
| `VoiceBuffering` | integer | 8000 | Voice buffer size (ms) |
| `VoiceMinDistance` | float | 10.0 | Minimum voice distance |
| `VoiceMaxDistance` | float | 300.0 | Maximum voice distance |
| `Voice3D` | boolean | true | 3D positional voice |

#### Factions & Trading

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `Faction` | boolean | true | Enable factions |
| `FactionDaySurvivedToCreate` | integer | 0 | Days survived to create faction |
| `FactionPlayersRequiredForTag` | integer | 1 | Players needed for faction tag |
| `AllowTradeUI` | boolean | true | Allow direct player trading |

#### Discord Integration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `DiscordEnable` | boolean | false | Enable Discord integration |
| `DiscordToken` | string | "" | Discord bot token |
| `DiscordChannel` | string | "" | Discord channel name |
| `DiscordChannelID` | string | "" | Discord channel ID |

#### RCON Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `RCONPort` | integer | 27015 | RCON listening port |
| `RCONPassword` | string | "" | RCON access password |

#### Performance & Physics

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `PhysicsDelay` | integer | 500 | Physics simulation delay |
| `SpeedLimit` | float | 70.0 | Server speed limit |
| `CarEngineAttractionModifier` | float | 0.5 | Car engine zombie attraction |
| `PlayerBumpPlayer` | boolean | false | Players can bump each other |
| `ZombieUpdateMaxHighPriority` | integer | 50 | Max high-priority zombie updates |
| `ZombieUpdateRadiusHighPriority` | float | 10.0 | High-priority update radius |
| `ZombieUpdateRadiusLowPriority` | float | 45.0 | Low-priority update radius |

#### Blood & Corpses

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `BloodSplatLifespanDays` | integer | 0 | Days blood splats last (0=forever) |
| `RemovePlayerCorpsesOnCorpseRemoval` | boolean | false | Remove player corpses |
| `NoFire` | boolean | false | Disable all fires (except campfires) |
| `AnnounceDeath` | boolean | false | Announce deaths server-wide |

#### Admin & Moderation

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `DisableRadioStaff` | boolean | false | Disable radio for staff |
| `DisableRadioAdmin` | boolean | true | Disable radio for admins |
| `DisableRadioGM` | boolean | true | Disable radio for GMs |
| `DisableRadioOverseer` | boolean | false | Disable radio for overseers |
| `DisableRadioModerator` | boolean | false | Disable radio for moderators |
| `DisableRadioInvisible` | boolean | true | Disable radio for invisible admins |
| `BanKickGlobalSound` | boolean | true | Play sound on ban/kick |

#### Misc Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `AllowNonAsciiUsername` | boolean | false | Allow non-ASCII usernames |
| `ClientCommandFilter` | string | "-vehicle.*;+vehicle..." | Client command whitelist |
| `SteamScoreboard` | string | "true" | Steam usernames in scoreboard |
| `UPnP` | boolean | true | Enable UPnP port forwarding |
| `UPnPLeaseTime` | integer | 86400 | UPnP lease time (seconds) |
| `UPnPZeroLeaseTimeFallback` | boolean | true | UPnP fallback on zero lease |
| `UPnPForce` | boolean | true | Force UPnP even if disabled |
| `server_browser_announced_ip` | string | "" | Custom IP for server browser |
| `TrashDeleteAll` | boolean | false | Allow trash delete all command |
| `AllowDestructionBySledgehammer` | boolean | true | Allow sledgehammer destruction |
| `PlayerSaveOnDamage` | boolean | true | Save player on damage |
| `SaveTransactionID` | boolean | false | Save transaction IDs |

### 1.3 Associated Configuration Files

These companion files are also managed per-server:

| File | Location | Purpose |
|------|----------|---------|
| `{serverName}_SandboxVars.lua` | `{SERVER_CACHE_DIR}/Server/` | Sandbox game variables |
| `{serverName}_spawnpoints.lua` | `{SERVER_CACHE_DIR}/Server/` | Player spawn point configuration |
| `{serverName}_spawnregions.lua` | `{SERVER_CACHE_DIR}/Server/` | Spawn region definitions |
| `options.ini` | `{SERVER_CACHE_DIR}/` | Client options |
| `db/{serverName}.db` | `{SERVER_CACHE_DIR}/db/` | Player database (accounts, whitelist, bans) |

---

## 2. RAM/JVM OPTIONS

### 2.1 Current State: NOT EXPOSED IN WEB MANAGER

**Critical Finding:** The web manager does **NOT** expose any RAM or JVM memory configuration options through the UI or API.

### 2.2 How RAM is Currently Configured

RAM must be configured directly in the server installation files:

**Location:** `/opt/pzserver/start-server.sh`
**Alternative:** `/opt/pzserver/ProjectZomboid64.json`

**Default Configuration (from PZwiki):**
```bash
".\jre64\bin\java.exe" \
  -Djava.awt.headless=true \
  -Dzomboid.steam=1 \
  -Dzomboid.znetlog=1 \
  -XX:+UseZGC \
  -XX:-CreateCoredumpOnCrash \
  -XX:-OmitStackTraceInFastThrow \
  -Xms16g \
  -Xmx16g \
  -Djava.library.path=natives/;natives/win64/;. \
  -cp %PZ_CLASSPATH% zombie.network.GameServer \
  -statistic 0
```

### 2.3 Available JVM Options (from PZwiki)

**Note:** JVM arguments must be provided **first** and end with `--` even if there are no game arguments.

#### Memory Management

| Option | Type | Description | Example |
|--------|------|-------------|---------|
| `-Xms{size}{unit}` | memory | Initial heap size | `-Xms4096m` or `-Xms4g` |
| `-Xmx{size}{unit}` | memory | Maximum heap size | `-Xmx8192m` or `-Xmx8g` |

**Important:** Setting `-Xmx` above physical RAM causes virtual memory (swap) usage.

#### GC & Performance Options

| Option | Description |
|--------|-------------|
| `-XX:+UseZGC` | Use Z Garbage Collector (low latency) |
| `-XX:-CreateCoredumpOnCrash` | Disable core dump on crash |
| `-XX:-OmitStackTraceInFastThrow` | Always show stack traces |

#### System Properties

| Option | Description | Example |
|--------|-------------|---------|
| `-Dzomboid.steam={0\|1}` | Enable/disable Steam | `-Dzomboid.steam=0` |
| `-Dzomboid.znetlog={0\|1}` | Enable network logging | `-Dzomboid.znetlog=1` |
| `-Dzomboid.ConsoleDotTxtSizeKB={size}` | Max console.txt size | `-Dzomboid.ConsoleDotTxtSizeKB=512000` |
| `-Ddeployment.user.cachedir={path}` | Cache directory (Linux only) | `-Ddeployment.user.cachedir="/home/user/zomboid"` |
| `-Dsoftreset` | Force soft reset (currently broken) | `-Dsoftreset` |
| `-Ddebug` | Debug mode | `-Ddebug` |

### 2.4 Current Web Manager Launch Command

**File:** `lib/server-manager.ts:391-394`

```typescript
const startScript = `${installation.path}/start-server.sh`;
const debugFlag = options?.debug ? ' -debug' : '';
const cachedirFlag = `-cachedir=${cacheDir}`;
const command = `${startScript} -servername ${serverName} ${cachedirFlag} -nosteam${debugFlag}`;
```

**Resulting Command:**
```bash
/opt/pzserver/start-server.sh \
  -servername {serverName} \
  -cachedir=/root/server-cache/{serverName} \
  -nosteam \
  [-debug]  # optional
```

### 2.5 Game Arguments (from PZwiki)

These can be passed after the JVM arguments:

#### Client & Server

| Argument | Description | Example |
|----------|-------------|---------|
| `-console_dot_txt_size_kb={size}` | Max console.txt size (KB) | `-console_dot_txt_size_kb=512000` |
| `-cachedir={path}` | Cache directory path | `-cachedir="/root/server-cache"` |
| `-nosteam` | Disable Steam (equivalent to `-Dzomboid.steam=0`) | `-nosteam` |

#### Server-Specific

| Argument | Description | Example |
|----------|-------------|---------|
| `-servername {name}` | Server name (affects save files) | `-servername MyServer` |
| `-adminusername {name}` | Default admin username | `-adminusername Admin` |
| `-adminpassword {pass}` | Default admin password | `-adminpassword secret123` |
| `-ip {ip}` | Bind to specific IP | `-ip 192.168.1.100` |
| `-port {port}` | Override DefaultPort | `-port 16261` |
| `-udpport {port}` | Override UDPPort | `-udpport 16262` |
| `-steamvac {true\|false}` | Enable/disable VAC | `-steamvac false` |
| `-disablelog={types}` | Disable log filters | `-disablelog=All` |
| `-debuglog={types}` | Enable log filters | `-debuglog=Network,Sound` |
| `-statistic {seconds}` | Enable statistics | `-statistic 10` |
| `-gui` | Launch server GUI (unfinished) | `-gui` |
| `-coop` | Run coop server (not dedicated) | `-coop` |

### 2.6 Recommended Memory Configurations

Based on player count (from community recommendations):

| Players | Recommended RAM | JVM Arguments |
|---------|-----------------|---------------|
| 1-4 | 4-6 GB | `-Xms4g -Xmx4g` |
| 5-10 | 6-8 GB | `-Xms6g -Xmx6g` |
| 11-20 | 8-12 GB | `-Xms8g -Xmx8g` |
| 21-32 | 12-16 GB | `-Xms12g -Xmx12g` |
| 32+ | 16+ GB | `-Xms16g -Xmx16g` |

---

## 3. STEAM OPTIONS

### 3.1 Steam Integration Overview

**Key Point:** The server runs with `-nosteam` flag for dedicated server operation, but Steam is used for:
1. **SteamCMD** - Downloading Workshop mods
2. **Workshop Integration** - Managing mod subscriptions

### 3.2 SteamCMD Configuration

**Path:** Configurable via `STEAM_CMD_PATH` environment variable
**Default:** `/root/Steam/steamcmd.sh`

**Command Format:**
```bash
${STEAM_CMD_PATH} +login anonymous +workshop_download_item ${STEAM_APP_ID} ${workshopId} +quit
```

**Constants:**
- `STEAM_APP_ID`: `"108600"` (Project Zomboid)
- `STEAM_WORKSHOP_REGEX`: `/steamcommunity\.com\/sharedfiles\/filedetails\/\?id=(\d+)/`

### 3.3 Steam Workshop Integration

**WorkshopItems INI Format:**
```ini
WorkshopItems=workshopId1=Mod Name 1;workshopId2=Mod Name 2
```

**URL Parsing:**
- **Valid Format:** `https://steamcommunity.com/sharedfiles/filedetails/?id=1234567890`
- **Anonymous Login:** Uses `+login anonymous` (no Steam account required)

**Download Behavior:**
- Downloads always go to global workshop location first
- Per-server workshop directories are created but steamcmd has limitations
- Timeout: 300 seconds (5 minutes)

### 3.4 Steam-Related INI Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `Public` | boolean | true | Server visible on Steam |
| `SteamPort1` | integer | 8766 | Steam networking port |
| `SteamPort2` | integer | 8767 | Steam networking port |
| `SteamVAC` | boolean | true | Valve Anti-Cheat enabled |
| `SteamScoreboard` | string | "true" | Steam usernames in scoreboard |
| `WorkshopItems` | string | "" | Semicolon-separated workshop IDs |

### 3.5 Steam vs NoSteam Modes

**Dedicated Server (Current Implementation):**
- Uses `-nosteam` flag
- No Steam authentication required
- Can still download Workshop mods via SteamCMD
- Players can connect with Steam or non-Steam clients

**Steam Mode (Not Used):**
- Would use Steam authentication
- Required for some Steam features
- Not typically used for dedicated servers

### 3.6 File Paths

**Global Workshop Path (SteamCMD limitation):**
```
${ZOMBOID_PATH}/steamapps/workshop/content/108600/{workshopId}/
```

**Per-Server Workshop Path:**
```
${SERVER_CACHE_DIR}/{serverName}/steamapps/workshop/content/108600/
```

**Mods Path:**
```
${SERVER_CACHE_DIR}/{serverName}/Mods/
```

---

## 4. IMPLEMENTATION RECOMMENDATIONS

### 4.1 Priority 1: RAM/JVM Configuration UI

**Why:** Currently requires server file access - biggest usability gap

**Implementation:**
1. **Extend types** (`types/index.ts`):
   ```typescript
   interface ServerStartOptions {
     debug?: boolean;
     installationId?: string;
     maxHeapSize?: string;      // "8g" or "8192m"
     initialHeapSize?: string;  // "4g" or "4096m"
     additionalJvmArgs?: string[];
   }
   ```

2. **Modify server manager** (`lib/server-manager.ts`):
   - Parse existing `start-server.sh` to extract current JVM options
   - Allow overriding via command line or environment variables
   - Support setting JAVA_OPTS before calling start-server.sh

3. **Update UI** (`components/ServerStartModal.tsx`):
   - Add memory slider/input (4GB, 6GB, 8GB, 12GB, 16GB presets)
   - Show current/default JVM options
   - Advanced mode for custom JVM args

4. **Alternative Approach:**
   - Modify `start-server.sh` template to read from environment variables
   - Set `JAVA_OPTS` or `SERVER_MEMORY` before execution
   - Example: `SERVER_MEMORY=8g ./start-server.sh`

### 4.2 Priority 2: Expanded INI Configuration UI

**Why:** Many useful options not exposed (MaxPlayers, Password, PublicName, etc.)

**High-Value Options to Add:**
1. **Server Identity:** PublicName, PublicDescription, Password
2. **Player Limits:** MaxPlayers, MaxAccountsPerUser
3. **Game Mechanics:** PVP, PauseEmpty, GlobalChat
4. **Safehouse:** PlayerSafehouse, SafehouseAllowRespawn, etc.
5. **Anti-Cheat:** SteamVAC, KickFastPlayers
6. **Voice Chat:** VoiceEnable, Voice3D, distance settings

**Implementation:**
1. Create INI editor component with categorized sections
2. Read/Write full INI files (not just managed fields)
3. Preserve formatting and comments
4. Validate values before saving
5. Add "Reload Options" button to apply changes without restart

### 4.3 Priority 3: Steam Configuration Options

**Why:** Currently hardcoded or not exposed

**Options to Add:**
1. Steam visibility toggle (`Public`)
2. VAC toggle (`SteamVAC`)
3. Steam port configuration (`SteamPort1`, `SteamPort2`)
4. Scoreboard visibility (`SteamScoreboard`)

### 4.4 Implementation Architecture

**Recommended Approach for RAM Options:**

Since the web manager calls `start-server.sh`, which then launches Java, we have two options:

**Option A: Environment Variable Override (Recommended)**
1. Modify `start-server.sh` to check for environment variables:
   ```bash
   # In start-server.sh
   if [ -n "$PZ_MAX_HEAP" ]; then
     JAVA_OPTS="$JAVA_OPTS -Xmx${PZ_MAX_HEAP}"
   fi
   if [ -n "$PZ_INITIAL_HEAP" ]; then
     JAVA_OPTS="$JAVA_OPTS -Xms${PZ_INITIAL_HEAP}"
   fi
   ```

2. Web manager sets environment variables before execution:
   ```typescript
   const env = {
     ...process.env,
     PZ_MAX_HEAP: options.maxHeapSize,
     PZ_INITIAL_HEAP: options.initialHeapSize,
     PZ_JVM_ARGS: options.additionalJvmArgs?.join(' ')
   };
   ```

**Option B: Custom Launch Script**
1. Web manager generates custom launch command with JVM args
2. Bypass `start-server.sh` entirely
3. Requires maintaining Java classpath and library paths

**Option C: ProjectZomboid64.json Override**
1. Parse and modify JSON config file
2. Set `vmArgs` array with memory options
3. Use `-pzexeconfig` parameter to use custom config

### 4.5 Security Considerations

1. **JVM Arguments:** Validate/sanitize to prevent command injection
2. **INI Values:** Escape special characters properly
3. **Passwords:** Don't log sensitive values
4. **File Permissions:** Ensure web manager can read/write config files

---

## 5. FILE REFERENCES

### Core Configuration Files

| File | Lines | Purpose |
|------|-------|---------|
| `lib/config-manager.ts` | Full | INI file reading/writing |
| `lib/server-manager.ts` | 277-394 | Server launch logic |
| `lib/mod-manager.ts` | Full | Workshop mod management |
| `lib/paths.ts` | Full | Path constants and helpers |
| `types/index.ts` | 157-163 | PZInstallation interface |
| `types/index.ts` | 481-496 | SystemMetric memory tracking |

### API & UI Files

| File | Lines | Purpose |
|------|-------|---------|
| `app/api/config/route.ts` | Full | Config API endpoints |
| `app/api/servers/[name]/start/route.ts` | 9-32 | Server start endpoint |
| `components/ServerStartModal.tsx` | 29-180 | Server start UI |
| `components/servers/mod-manager-modal.tsx` | Full | Mod management UI |
| `hooks/use-api.ts` | 121-133 | startServer hook |
| `lib/api.ts` | 157-165 | startServer API client |

### External Configuration

| File | Location | Purpose |
|------|----------|---------|
| `start-server.sh` | `/opt/pzserver/` | Server launch script with JVM args |
| `ProjectZomboid64.json` | `/opt/pzserver/` | Launcher configuration |
| `{serverName}.ini` | `{SERVER_CACHE_DIR}/{serverName}/Server/` | Server INI config |

---

## 6. SUMMARY

### What's Currently Implemented

✅ **INI Options (Partial):** Mods, WorkshopItems, Map, AdminPassword  
✅ **SteamCMD:** Workshop mod downloads  
✅ **Launch Options:** Debug mode, server name, cache directory  
❌ **RAM/JVM:** Not exposed - must edit server files directly  
❌ **Most INI Options:** Not exposed through web UI  

### Key Gaps

1. **Memory Configuration:** No way to set -Xmx/-Xms through web UI
2. **Server Identity:** Can't set PublicName, PublicDescription, Password
3. **Player Limits:** Can't configure MaxPlayers through UI
4. **Game Mechanics:** Most gameplay options require manual INI editing
5. **Steam Options:** Limited Steam configuration exposed

### Recommended Implementation Order

1. **Phase 1:** Add RAM/JVM configuration to server start modal
2. **Phase 2:** Add high-value INI options (MaxPlayers, Password, PublicName)
3. **Phase 3:** Full INI editor with categories
4. **Phase 4:** Steam configuration options
5. **Phase 5:** Advanced JVM argument management

### Estimated Effort

- **Phase 1 (RAM/JVM):** 2-3 days
- **Phase 2 (Basic INI):** 3-4 days  
- **Phase 3 (Full INI Editor):** 5-7 days
- **Phase 4 (Steam Config):** 1-2 days
- **Phase 5 (Advanced JVM):** 2-3 days

**Total:** ~2-3 weeks for full implementation

---

**Prepared by:** OpenCode Agent  
**Date:** 2025-01-09  
**Sources:** Codebase analysis, PZwiki (pzwiki.net), Context7 documentation, Steam Community
