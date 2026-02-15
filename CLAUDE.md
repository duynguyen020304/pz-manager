# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Zomboid Web Manager** is a Next.js 16 web application providing a browser-based interface for managing Project Zomboid server backups, configurations, runtime (start/stop), and Steam Workshop mods.

**Deployment:**
- **Development**: `/root/zomboid-web-manager/`
- **Production**: `/opt/zomboid-web-manager/`
- **Deploy**: `./scripts/deploy.sh` - Copies code, builds, restarts systemd service
- **Setup**: `./setup.sh` - First-time installation with systemd service and Cloudflare Tunnel

**Related Systems:**
- **Backup System**: `/opt/zomboid-backups/` - Bash scripts with systemd timers (34GB of snapshots)
- **Rollback CLI**: `/root/Zomboid/rollback-cli/` - Terminal UI for restores (archived)
- **Server Cache**: `/root/server-cache/{serverName}/` - CACHEDIR isolation for all servers

## Quick Start Commands

```bash
# Development
cd /root/zomboid-web-manager
npm install
npm run dev          # http://localhost:3001
npm test             # Run tests (watch mode)
npm run test:run     # Tests (CI mode)
npm run test:ui      # Tests with UI
npm run lint         # Run ESLint

# Single test file
npx vitest run __tests__/unit/lib/user-manager.test.ts
npx vitest run --grep "pattern"  # Tests matching pattern

# Production
systemctl start zomboid-web-manager
systemctl status zomboid-web-manager
journalctl -u zomboid-web-manager -f

# Database
npm run db:start     # Start TimescaleDB container
npm run db:stop      # Stop container
npm run db:reset     # Reset database
```

## Technology Stack

- **Next.js 16.1.6** with App Router
- **React 19.2.3** - Server/Client Components
- **TypeScript 5** - Full type safety
- **Tailwind CSS 4** - Utility-first styling
- **TanStack React Query 5** - Server state management
- **PostgreSQL with TimescaleDB** - Users, roles, sessions, audit logs, time-series data
- **bcryptjs** - Password hashing (10 rounds)
- **tmux** - Server session management
- **steamcmd** - Workshop mod downloads
- **@dnd-kit** - Drag-and-drop mod ordering UI
- **Vitest** - Unit testing with pg-mem

## Architecture

### Key Patterns

**Component Split:**
- **Server Components** (default): API routes, data fetching
- **Client Components** (`'use client'`): Interactive UI, forms
- All `app/(authenticated)/` pages are client components using React Query hooks

**Data Flow:**
```
Component → useQuery/useMutation → lib/api.ts → API route → lib/business-logic → File system/Scripts
```

**API Response Format:**
```typescript
{ success: boolean; data?: T; error?: string }
```

**Authentication:**
- Session-based with HTTP-only cookies (24-hour expiry)
- No middleware file - validation at API route level
- `getUserByUsernameWithRole()` for authentication

### Directory Structure

```
zomboid-web-manager/
├── app/                     # Next.js App Router (API routes + pages)
├── components/               # React components (providers, UI)
├── hooks/                    # React Query hooks (use-api.ts, use-api-users.ts)
├── lib/                      # Business logic (server-manager, parsers, etc.)
├── scripts/
│   ├── backup/               # Bash backup scripts (paths-config.sh, backup.sh)
│   ├── deploy.sh             # Production deployment
│   └── setup.sh              # Initial setup
├── __tests__/                # Vitest tests (pg-mem for unit tests)
└── types/index.ts            # TypeScript definitions
```

## Centralized Path Management

### TypeScript (`lib/paths.ts`)

All paths support environment variable override:

```typescript
// Base (legacy reference, rarely used)
const ZOMBOID_BASE = process.env.ZOMBOID_PATH || '/root/Zomboid';

// Backup system (independent location)
const BACKUP_SYSTEM_BASE = process.env.BACKUP_SYSTEM_ROOT || '/opt/zomboid-backups';
export const BACKUP_CONFIG_PATH = process.env.BACKUP_CONFIG_PATH ||
  `${BACKUP_SYSTEM_BASE}/config/backup-config.json`;
export const SNAPSHOTS_PATH = process.env.SNAPSHOTS_PATH ||
  `${BACKUP_SYSTEM_BASE}/snapshots`;

// Server cache directories (CACHEDIR isolation)
export const SERVER_CACHE_BASE = process.env.SERVER_CACHE_BASE || '/root/server-cache';
export const SERVER_CACHE_DIR = (serverName: string) =>
  `${SERVER_CACHE_BASE}/${serverName}`;
export const SERVER_LOGS_PATH = (serverName: string) =>
  `${SERVER_CACHE_DIR(serverName)}/Logs`;
```

### Bash (`scripts/backup/paths-config.sh`)

```bash
# Zomboid path (legacy reference)
ZOMBOID_PATH="${ZOMBOID_PATH:-/root/Zomboid}"

# Backup system (independent location)
BACKUP_SYSTEM_ROOT="${BACKUP_SYSTEM_ROOT:-/opt/zomboid-backups}"
CONFIG_DIR="${BACKUP_SYSTEM_ROOT}/config"
SNAPSHOTS_DIR="${BACKUP_SYSTEM_ROOT}/snapshots"

# Server cache (CACHEDIR isolation)
SERVER_CACHE_BASE="${SERVER_CACHE_BASE:-/root/server-cache}"
```

## Database Schema

| Table | Purpose |
|-------|---------|
| `roles` | RBAC with JSONB permissions |
| `users` | User accounts (bcrypt passwords) |
| `sessions` | Server-side session storage |
| `audit_logs` | Audit trail (TimescaleDB hypertable) |
| `backup_logs` | Backup/restore operations (TimescaleDB) |
| `pz_player_events` | Player login/logout/death |
| `pz_server_events` | Server startup/shutdown/errors |
| `pz_skill_snapshots` | Player skill progression |
| `pz_chat_messages` | In-game chat |
| `pz_pvp_events` | PvP combat events |
| `log_file_positions` | File read positions for incremental parsing |
| `system_metrics` | Performance metrics (TimescaleDB hypertable) |
| `system_spikes` | Detected spike events (TimescaleDB hypertable) |
| `monitor_config` | Monitoring settings (single row) |

**Database Manager** (`lib/db.ts`):
- `query<T>(sql, params)` - Auto-release client
- `queryOne<T>(sql, params)` - First row or null
- `transaction(callback)` - Auto commit/rollback
- Test mode: Uses pg-mem when `NODE_ENV=test` and `USE_REAL_DATABASE != true`

**User Management** (`lib/user-manager.ts`):
- CRUD operations with bcrypt password hashing
- Prevents deleting last superadmin
- Paginated list with filters

**Role Management** (`lib/role-manager.ts`):
- `hasPermission(role, resource, action)` - Superadmin has all
- Custom roles with JSONB permissions
- System roles (superadmin, admin, operator, viewer) protected

**Permission Format:**
```json
{ "servers": ["view", "start", "stop"], "backups": ["view", "restore"] }
```
Wildcard: `{ "*": ["*"] }` grants all permissions.

## Per-Server Isolation (CACHEDIR)

**Status**: ✅ **All servers migrated to CACHEDIR isolation** (as of 2026-02-15)

**Previous Problem**: All servers wrote to `/root/Zomboid/Logs/`, making log attribution impossible. Backup system was backing up stale data from legacy paths.

**Solution**: Use `-cachedir` parameter to isolate each server's data. All servers now use CACHEDIR by default.

### How It Works

**Startup Command:**
```bash
/opt/pzserver/start-server.sh -servername {serverName} \
  -cachedir=/root/server-cache/{serverName} -nosteam
```

**Directory Structure:**
```
/root/server-cache/{serverName}/
├── Logs/           # Server-specific logs (isolated!)
├── Saves/          # World saves
├── Server/         # Server configs
├── db/             # Player databases
├── Mods/           # Mod installations
└── steamapps/      # Workshop downloads
```

**Migrated Servers**:
- ✅ `servertest` - 83MB (5,535 world files)
- ✅ `duypzserver` - 982MB (206,716 world files)

**Legacy Data**: Archived to `/root/Zomboid-archive/` (35GB) - can be deleted after verification period

### Implementation

**lib/paths.ts**: `SERVER_CACHE_DIR(serverName)`, `SERVER_LOGS_PATH(serverName)` - CACHEDIR only, no legacy fallback
**lib/server-manager.ts**: Creates cache dir, adds `-cachedir` to startup
**lib/parsers/base-parser.ts**: `getLogPaths(serverName)` for server-specific paths, `getParserConfigs(serverName)` for parsers
**lib/log-watcher.ts**: Uses `getLogPaths(serverName)` per server, `getBackupSystemParserConfigs()` for global logs

**Benefits**:
1. Complete log isolation per server
2. Accurate log attribution in database
3. Backups now target current data (not stale)
4. Independent mod/workshop installations
5. Clean separation for debugging

## Log Management System

### Parsers (`lib/parsers/`)

Each extends `BaseParser`:

| Parser | Source | Output |
|--------|--------|--------|
| `BackupLogParser` | backup.log, restore.log | BackupLogEntry |
| `UserLogParser` | user.txt | PZPlayerEvent |
| `ChatLogParser` | chat.txt | PZChatMessage |
| `PerkLogParser` | PerkLog.txt | PZSkillSnapshot |
| `ServerLogParser` | {date}/server.txt | PZServerEvent |
| `PVPLogParser` | pvp.txt | PZPVPEvent |

**Path Resolution** (`lib/parsers/base-parser.ts`):
- Server-specific: `getLogPaths(serverName)` function (using CACHEDIR)
- Backup system logs: `getBackupSystemParserConfigs()` for global backup/restore logs
- Parser configs: `getParserConfigs(serverName)` - always requires serverName

### Log Manager (`lib/log-manager.ts`)

- `parseAndIngestFile(filePath, parserType, serverName)` - Parse and insert
- `getUnifiedLogs(filters)` - Query logs from any source
- `getFilePosition()` / `updateFilePosition()` - Track for incremental parsing

### Log Watcher (`lib/log-watcher.ts`)

- `watchLogFile(filePath, parserType, serverName)` - Watch single file
- `startWatchingAll(servers)` - Watch all servers (uses `getLogPaths(serverName)`)
- `startWatchingRunning()` - Auto-detect running servers
- Debounced ingestion (1s delay), handles log rotation

## Server Management (`lib/server-manager.ts`)

**Status Detection** (5-second TTL cache):
- tmux session: `pz-{serverName}`
- Process PID: `pgrep -f "ProjectZomboid64.*-servername {serverName}"`
- Port binding: `ss -ulnp`
- States: `stopped`, `starting`, `running`, `stopping`

**Port Calculation**:
- Default (16261/16262/27015) if available
- Index-based: Server at index 1 → 16271/16272/27025

**Starting a Server**:
1. Create cache directory: `{SERVER_CACHE_BASE}/{serverName}`
2. Create detached tmux session: `tmux new-session -d -s pz-{serverName}`
3. Send start command with `-cachedir={cacheDir}`
4. Wait up to 1 hour for process spawn and port binding
5. Return jobId for progress tracking (can be aborted)

**Stopping a Server**:
1. Send `save` command (5 second wait)
2. Send `quit` command
3. Wait up to 15 seconds for graceful shutdown
4. Fallback to SIGTERM if needed
5. Kill tmux session

**Job Tracking**: In-memory Map, job ID format: `{start|stop}-{timestamp}-{random}`

## Console Manager (`lib/console-manager.ts`)

**Console Capture** via tmux pipe-pane:
- Output to `/tmp/pz-console-{server}.log`
- Reference counting for multiple clients
- Initial buffer capture (100 lines) on first connect
- Auto-cleanup after 1 minute of no clients

**SSE Streaming**: `/api/servers/[name]/console/route.ts`
- Event types: `connected`, `init`, `log`, `error`
- Uses `tail -f` for file updates
- File position tracking for incremental updates

## Mod Management (`lib/mod-manager.ts`)

**Steam Workshop Integration:**
- `fetchModTitleFromWorkshop(workshopId)` - Scrapes Steam Workshop for mod title
- `downloadMod(serverName, workshopId)` - Uses steamcmd to download workshop items
- Steam App ID: 108600
- Workshop items stored at `{SERVER_CACHE_DIR}/steamapps/workshop/content/108600/{workshopId}/` (per-server CACHEDIR)

**Server INI Management** (`{SERVER_CACHE_DIR}/Server/{serverName}.ini`):
- `getServerMods(serverName)` - Parses Mods=, WorkshopItems=, Map= lines
- `addModToServer()` - Adds workshopId=name to WorkshopItems, modId to Mods
- `updateModOrder()` - Reorders Mods= line (drag-and-drop UI via @dnd-kit)
- `removeModFromServer()` - Removes from both WorkshopItems and Mods

**Mod Validation:**
- `validateMod(modPath)` - Checks for server/client/shared Lua code
- `extractModId(modPath)` - Reads from mod.info or infers from directory
- `extractModName(modPath, workshopId?)` - Fetches from Workshop (primary) or local file

**Drag-and-Drop UI:**
- Uses `@dnd-kit/core` and `@dnd-kit/sortable`
- Client components in `/components/servers/`
- API routes: `/api/servers/[name]/mods`

## System Monitoring (`lib/system-monitor.ts`)

**SystemMonitor Service** (singleton):
- Always-on monitoring when enabled in config
- Configurable polling interval (default: 5s)
- Smart spike detection optimized for PZ game engine
- Auto-cleanup based on retention settings
- Starts in authenticated layout

**Spike Detection** (`lib/spike-detector.ts`):
- CPU/Memory/Swap: Critical threshold (absolute) + relative spike
- Network: Relative spike only
- Sustained detection avoids false positives (2 samples for critical, 15s for warning)

**Monitor Configuration** (database, `lib/monitor-manager.ts`):
| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | true | Enable/disable monitoring |
| `pollingIntervalSeconds` | 5 | Sample frequency |
| `retentionHours` | 24 | Metric data retention |
| `cpuCriticalThreshold` | 90 | Absolute CPU % for critical |
| `cpuSpikeThresholdPercent` | 50 | Relative CPU spike % |
| `cpuSpikeSustainedSeconds` | 15 | Seconds above threshold |
| (Similar for memory, swap, network) | | |

## Key API Endpoints

**Servers:**
- `GET/POST /api/servers` - List/add servers
- `DELETE /api/servers?name=` - Remove server
- `GET /api/servers/detect` - Auto-detect
- `GET /api/servers/status` - All statuses
- `POST /api/servers/[name]/start` - Start server
- `POST /api/servers/[name]/stop` - Stop server
- `GET /api/servers/[name]/console` - SSE console stream
- `GET /api/servers/[name]/mods` - Get server mods
- `POST /api/servers/[name]/mods` - Add mod (workshop URL or ID)
- `PATCH /api/servers/[name]/mods/order` - Update mod load order
- `DELETE /api/servers/[name]/mods` - Remove mod

**Backups:**
- `GET /api/servers/[name]/snapshots?schedule=` - List snapshots
- `POST /api/servers/[name]/restore` - Start restore
- `GET /api/snapshots` - Rich snapshots (server, schedule, date range, pagination)

**Users & Roles:**
- `GET /api/users?page&limit&roleId&isActive&search` - List users
- `POST /api/users` - Create user
- `GET/PATCH/DELETE /api/users/[id]` - Manage user
- `GET /api/roles` - List all roles
- `POST /api/roles` - Create custom role
- `GET/PATCH/DELETE /api/roles/[id]` - Manage role (system roles protected)

**Logs:**
- `GET /api/logs?source&server&eventType&username&level&from&to&limit&offset` - Unified query

**Metrics & Monitoring:**
- `GET /api/metrics?type=current` - Current metrics
- `GET /api/metrics/history?hours&interval` - Time series data
- `GET /api/metrics/spikes?hours&limit` - Spike events
- `GET /api/metrics/status` - Monitor service status

## Pages & Navigation

**Sidebar:**
- `/dashboard` - Overview with server status, quick actions
- `/servers` - Server management (start/stop controls, auto-detect)
- `/monitor` - System performance monitoring
- `/schedules` - Backup schedule CRUD
- `/logs` - Unified log viewer with filtering
- `/accounts` - User CRUD
- `/roles` - Role CRUD with permission matrix
- `/settings` - Tabs: Schedules, Servers, Settings

**Not in Sidebar:**
- `/backups` - Backup browser with filtering
- `/rollback` - 5-step restore wizard

## Important Implementation Notes

**Path Alias**: `@/*` maps to project root (tsconfig.json)

**Config Manager**: 5-second TTL cache to avoid excessive file I/O

**Route Groups**: `(authenticated)` folder creates protected route group with shared layout

**Rollback Wizard Flow**:
1. Select Server (dropdown with badges)
2. Select Backup (filterable list with tabs)
3. Preview (snapshot details + warnings)
4. Confirm (type server name to prevent accidents)
5. Progress (3-second polling)

**Error Handling**:
- API routes: Try/catch with structured responses
- Client hooks: React Query error state
- File ops: Graceful null returns for missing files

## Testing

**Framework**: Vitest with jsdom (single-threaded mode)

**Test Database** (`__tests__/setup/test-db.ts`):
- Uses `pg-mem` for in-memory PostgreSQL
- Full schema mirroring production database
- Custom `gen_random_uuid()` function registration
- Auto-seeds system roles (superadmin, admin, operator, viewer)

**Usage**:
```bash
npx vitest run __tests__/unit/lib/user-manager.test.ts  # Single file
npx vitest run --grep "pattern"  # Tests matching pattern
```

**Important**:
- Set `USE_REAL_DATABASE=true` to use real database in tests
- `lib/db.ts` checks `NODE_ENV=test` to use pg-mem adapter
- Always reset test state in `beforeEach` hooks

## Code Style Guidelines

**TypeScript**:
- Strict mode enabled - always define explicit types
- Path alias: `@/` for all imports (configured in tsconfig.json)
- Avoid `any`; use `unknown` with type guards
- Prefix unused variables with `_` to ignore

**Import Order**:
1. External dependencies (`@tanstack/react-query`, `lucide-react`)
2. Next.js built-ins (`next/server`, `next/navigation`)
3. Internal types (`@/types`)
4. Internal components/hooks/lib (`@/components`, `@/hooks`, `@/lib`)

**Naming Conventions**:
| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `mod-manager.ts` |
| Components | PascalCase | `ServerCard` |
| Functions | camelCase | `getServerMods` |
| Types/Interfaces | PascalCase | `ServerModsConfig` |
| Constants | UPPER_SNAKE | `STEAM_APP_ID` |
| Hooks | camelCase + 'use' prefix | `useServers` |

**React Components**:
- Functional components with hooks only
- Add `'use client'` directive for client components
- Destructure props, define interfaces before component
- Use TanStack Query for server state (prefetch in Server Components, `useQuery` in Client Components)

## Environment Configuration

**Required .env.local variables:**
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/zomboid_manager
SESSION_SECRET=random_secret_key
```

**Optional (all have defaults):**
```bash
ZOMBOID_PATH=/root/Zomboid
BACKUP_SYSTEM_ROOT=/opt/zomboid-backups
BACKUP_CONFIG_PATH=/opt/zomboid-backups/config/backup-config.json
SNAPSHOTS_PATH=/opt/zomboid-backups/snapshots
SERVER_CACHE_BASE=/root/server-cache
STEAM_CMD_PATH=/usr/games/steamcmd
NODE_ENV=production
```

## Styling Conventions

- **Dark theme**: Slate color palette via Tailwind CSS
- **CSS Variables**: Primary colors with custom properties
- **Responsive**: Mobile-first with `lg:` breakpoints
- **Icons**: Lucide React
- **Components**: `bg-card border border-border rounded-lg`
- **Sidebar**: Collapsible with icon-only mode and hover tooltips

## Known Limitations

- **Job Storage**: In-memory Map, lost on restart (restore/server jobs)
- **Multi-installation**: Only `/opt/pzserver` fully supported
- **Console Streaming**: In-memory capture state, lost on restart
- **Log Watcher**: Must be started manually/integrated for real-time ingestion
- **System Monitor**: In-memory state, lost on restart (auto-restarts in layout)

## Migration History

### 2026-02-15: CACHEDIR Migration & Backup System Relocation

**Problem Discovered**: Backup system was backing up stale/old data from legacy paths for CACHEDIR servers.

**Changes Made**:
1. **All servers migrated to CACHEDIR**: `servertest`, `duypzserver` now use `-cachedir` parameter
2. **Backup system relocated**: `/root/Zomboid/backup-system/` → `/opt/zomboid-backups/` (34GB)
3. **Legacy data archived**: 35GB of old Saves, Logs, Server, db moved to `/root/Zomboid-archive/`
4. **Code simplified**: Removed backward compatibility, all paths now CACHEDIR-only
5. **Parser configs updated**: Now require `serverName` parameter, separated backup system configs

**Files Modified**:
- `scripts/backup/backup.sh` - Always use CACHEDIR save paths
- `scripts/backup/restore.sh` - Always restore to CACHEDIR location
- `scripts/backup/paths-config.sh` - Updated `BACKUP_SYSTEM_ROOT`, `SERVER_CACHE_BASE`
- `lib/paths.ts` - Removed legacy path fallbacks, updated backup paths
- `lib/parsers/base-parser.ts` - `getParserConfigs(serverName)`, `getBackupSystemParserConfigs()`
- `lib/log-watcher.ts` - Use new parser config functions
- `backup-config.json` - Updated `snapshotsPath`

**Current State**:
- All servers use CACHEDIR isolation at `/root/server-cache/{serverName}/`
- Backup system operates independently at `/opt/zomboid-backups/`
- Legacy paths archived at `/root/Zomboid-archive/` (safe to delete after verification period)
- `/root/Zomboid/` now empty (except `.claude` settings)

**Testing Performed**:
- ✅ Backup script creates snapshots from CACHEDIR location
- ✅ Restore script restores to CACHEDIR location
- ✅ Database integrity verification (players.db, vehicles.db)
- ✅ Checksum verification
- ✅ Emergency backup creation
