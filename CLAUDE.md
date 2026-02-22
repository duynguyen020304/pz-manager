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
npm run lint         # Run ESLint

# Production
systemctl start zomboid-web-manager
systemctl status zomboid-web-manager
journalctl -u zomboid-web-manager -f

# Database
npm run db:start     # Start TimescaleDB container
npm run db:stop      # Stop container
npm run db:reset     # Reset database volumes only (down -v + up -d)
npm run db:migrate   # Run migrations and seed data
```

## Technology Stack

- **Next.js 16.1.6** with App Router
- **React 19.2.3** - Server/Client Components
- **TypeScript 5** - Full type safety
- **Tailwind CSS 4** - Utility-first styling
- **TanStack React Query 5** - Server state management
- **PostgreSQL with TimescaleDB** - Users, roles, sessions, audit logs, time-series data
- **bcryptjs** - Password hashing (10 rounds)
- **next-intl** - Internationalization (i18n) for multi-language support
- **next-themes** - Dark/light theme switching
- **tmux** - Server session management
- **steamcmd** - Workshop mod downloads
- **@dnd-kit** - Drag-and-drop mod ordering UI
- **Recharts** - Data visualization charts
- **EventSource** - Server-Sent Events for real-time log streaming

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
- API Token (PAT) authentication for programmatic access
- No middleware file - validation at API route level
- `getUserByUsernameWithRole()` for authentication

### Directory Structure

```
zomboid-web-manager/
├── app/                     # Next.js App Router (API routes + pages)
├── components/               # React components (providers, UI)
├── hooks/                    # React Query hooks (use-api.ts, use-api-users.ts)
├── lib/                      # Business logic (server-manager, parsers, etc.)
├── i18n/                     # Internationalization config (next-intl)
├── messages/                 # Translation files (en.json, vi.json, zh.json)
├── scripts/
│   ├── backup/               # Bash backup scripts (paths-config.sh, backup.sh)
│   ├── deploy.sh             # Production deployment
│   └── setup.sh              # Initial setup
└── types/index.ts            # TypeScript definitions
```

## Internationalization (i18n)

**Configuration:**
- **Config**: `i18n/config.ts` - Locale definitions (en, zh, vi)
- **Request**: `i18n/request.ts` - Request-level i18n setup
- **Translations**: `messages/{locale}.json` - Translation files

**Usage:**
```typescript
// Server Component
import { getTranslations } from 'next-intl/server';
const t = await getTranslations('namespace');

// Client Component
import { useTranslations } from 'next-intl';
const t = useTranslations('namespace');
```

**Supported Locales:**
- `en` - English (default)
- `zh` - Chinese
- `vi` - Vietnamese

**Components:**
- `LanguageSwitcher` - Dropdown to change locale
- `locale` cookie stores user preference

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
| `api_tokens` | Personal Access Tokens for API auth |
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

## API Token Authentication (PAT)

**Token Format:** `zomboid_{32-char-hex}_{8-char-checksum}`

**Features:**
- Scoped tokens with granular permissions (JSONB scopes)
- Expiration support (optional)
- Last used tracking with IP address
- Max 10 active tokens per user
- SHA-256 hashed storage (only shown once on creation)

**API Token Manager** (`lib/api-token-manager.ts`):
- `generateApiToken()` - Creates new token
- `createApiToken(userId, input)` - Store token with metadata
- `getTokenWithUser(tokenHash)` - Validate and get user info
- `updateTokenLastUsed(tokenId, ip)` - Update usage tracking
- `revokeApiToken(tokenId, userId)` - Soft delete (deactivate)

**API Endpoints:**
- `GET /api/tokens` - List user's tokens
- `POST /api/tokens` - Create new token
- `PATCH /api/tokens/[id]` - Update token (name, desc, scopes, expiry)
- `DELETE /api/tokens/[id]` - Revoke token

**Authentication Header:** `Authorization: Bearer {token}`

## Per-Server Isolation (CACHEDIR)

**Status**: All servers migrated to CACHEDIR isolation

**Previous Problem**: All servers wrote to `/root/Zomboid/Logs/`, making log attribution impossible. Backup system was backing up stale data from legacy paths.

**Solution**: Use `-cachedir` parameter to isolate each server's data.

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

**Implementation:**
- `lib/paths.ts`: `SERVER_CACHE_DIR(serverName)`, `SERVER_LOGS_PATH(serverName)`
- `lib/server-manager.ts`: Creates cache dir, adds `-cachedir` to startup
- `lib/parsers/base-parser.ts`: `getLogPaths(serverName)` for server-specific paths

## Server Configuration Management

**Server INI Configuration** (`lib/ini-config-manager.ts`, `lib/ini-utils.ts`):
- `readIniFile(serverName)` - Parse `{SERVER_CACHE_DIR}/Server/{serverName}.ini`
- `writeIniFile(serverName, config)` - Write config, preserving comments
- `updateIniValues(serverName, updates)` - Partial update of specific keys

**INI Utilities** (`lib/ini-utils.ts`):
- `parseIniContent(content)` - Parse INI string to config object
- `generateIniContent(config, existingContent)` - Generate INI preserving comments
- `getDefaultIniConfig()` - Default config template for new servers

**API Endpoint**: `GET/POST/DELETE /api/servers/[name]/config`

**UI Components:**
- `QuickConfigPanel` - RAM sliders, max players, common toggles
- `AdvancedSettingsDrawer` - Full 80+ searchable settings
- `DynamicIniInput` - Auto-detects input type from key names

## Log Management System

### Real-Time Log Streaming

**Log Stream Manager** (`lib/log-stream-manager.ts`):
- Singleton service using EventEmitter for pub/sub
- Batches log entries (200ms interval, max 50 entries)
- Server-specific subscriptions with client tracking

**SSE API** (`/api/logs/stream/route.ts`):
- `GET /api/logs/stream?server={name}&types={csv}&since={iso}`
- Event types: `initial`, `batch`, `heartbeat`, `error`
- 5-second heartbeat to keep connections alive

**React Hooks:**
- `useLogStream` - SSE connection with exponential backoff reconnection
- `useUnifiedLogs` - Combines initial query + real-time streaming

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

## Server Management (`lib/server-manager.ts`)

**Status Detection** (5-second TTL cache):
- tmux session: `pz-{serverName}`
- Process PID: `pgrep -f "ProjectZomboid64.*-servername {serverName}"`
- Port binding: `ss -ulnp`
- States: `stopped`, `starting`, `running`, `stopping`

**Port Calculation:**
- Default (16261/16262/27015) if available
- Index-based: Server at index 1 → 16271/16272/27025

**Starting a Server:**
1. Create cache directory: `{SERVER_CACHE_BASE}/{serverName}`
2. Create detached tmux session: `tmux new-session -d -s pz-{serverName}`
3. Send start command with `-cachedir={cacheDir}`
4. Wait up to 1 hour for process spawn and port binding
5. Return jobId for progress tracking (can be aborted)

**Stopping a Server:**
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

## Mod Management (`lib/mod-manager.ts`)

**Steam Workshop Integration:**
- `fetchModTitleFromWorkshop(workshopId)` - Scrapes Steam Workshop for mod title
- `downloadMod(serverName, workshopId)` - Uses steamcmd to download workshop items
- Steam App ID: 108600
- Workshop items stored at `{SERVER_CACHE_DIR}/steamapps/workshop/content/108600/{workshopId}/`

**Server INI Management:**
- `getServerMods(serverName)` - Parses Mods=, WorkshopItems=, Map= lines
- `addModToServer()` - Adds workshopId to WorkshopItems, modId to Mods
- `updateModOrder()` - Reorders Mods= line (drag-and-drop UI via @dnd-kit)
- `removeModFromServer()` - Removes from both WorkshopItems and Mods

## System Monitoring (`lib/system-monitor.ts`)

**SystemMonitor Service** (singleton):
- Always-on monitoring when enabled in config
- Configurable polling interval (default: 5s)
- Smart spike detection optimized for PZ game engine
- Auto-cleanup based on retention settings

**Spike Detection** (`lib/spike-detector.ts`):
- CPU/Memory/Swap: Critical threshold (absolute) + relative spike
- Network: Relative spike only
- Sustained detection avoids false positives

**Monitor Configuration** (database, `lib/monitor-manager.ts`):
| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | true | Enable/disable monitoring |
| `pollingIntervalSeconds` | 5 | Sample frequency |
| `retentionHours` | 24 | Metric data retention |
| `cpuCriticalThreshold` | 90 | Absolute CPU % for critical |
| `cpuSpikeThresholdPercent` | 50 | Relative CPU spike % |

## Key API Endpoints

**Servers:**
- `GET/POST /api/servers` - List/add servers
- `DELETE /api/servers?name=` - Remove server
- `GET /api/servers/detect` - Auto-detect
- `GET /api/servers/status` - All statuses
- `POST /api/servers/[name]/start` - Start server
- `POST /api/servers/[name]/stop` - Stop server
- `GET /api/servers/[name]/console` - SSE console stream
- `GET/POST/DELETE /api/servers/[name]/config` - Server INI configuration
- `GET/POST/PATCH/DELETE /api/servers/[name]/mods` - Mod management

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
- `GET/PATCH/DELETE /api/roles/[id]` - Manage role

**API Tokens:**
- `GET /api/tokens` - List tokens
- `POST /api/tokens` - Create token
- `PATCH /api/tokens/[id]` - Update token
- `DELETE /api/tokens/[id]` - Revoke token

**Logs:**
- `GET /api/logs?source&server&eventType&username&level&from&to&limit&offset` - Unified query
- `GET /api/logs/stream?server&types&since` - SSE real-time log streaming

**Metrics & Monitoring:**
- `GET /api/metrics?type=current` - Current metrics
- `GET /api/metrics/history?hours&interval` - Time series data
- `GET /api/metrics/spikes?hours&limit` - Spike events
- `GET /api/metrics/status` - Monitor service status

## Pages & Navigation

**Sidebar:**
- `/dashboard` - Overview with server status, quick actions
- `/servers` - Server management (grid/list view, start/stop, quick config)
- `/monitor` - System performance monitoring
- `/schedules` - Backup schedule CRUD
- `/logs` - Unified log viewer with filtering and real-time streaming
- `/accounts` - User CRUD
- `/roles` - Role CRUD with permission matrix
- `/tokens` - API token management (PAT)
- `/settings` - Tabs: Schedules, Servers, Settings

**Not in Sidebar:**
- `/backups` - Backup browser with filtering
- `/rollback` - 5-step restore wizard

## Important Implementation Notes

**Path Alias**: `@/*` maps to project root (tsconfig.json)

**Config Manager**: 5-second TTL cache to avoid excessive file I/O

**Route Groups**: `(authenticated)` folder creates protected route group with shared layout

**Theme System**: Uses `next-themes` with class-based dark mode. Components use `dark:` prefix for dark mode styles.

**UI Component Patterns:**
- **Slide-out Panels/Drawers**: Fixed right-side overlays with backdrop
- **View Mode Toggles**: Segmented control for grid/list view switching
- **Dynamic Input Types**: Auto-detection from key names (bool/number/string)
- **Real-Time Updates**: SSE streaming pattern used for console logs and unified log streaming

**Rollback Wizard Flow:**
1. Select Server (dropdown with badges)
2. Select Backup (filterable list with tabs)
3. Preview (snapshot details + warnings)
4. Confirm (type server name to prevent accidents)
5. Progress (3-second polling)

**Error Handling:**
- API routes: Try/catch with structured responses
- Client hooks: React Query error state
- File ops: Graceful null returns for missing files

## Bun Support

Bun is configured as an alternative runtime/package manager:
- **Config**: `bunfig.toml` - Bun-specific settings
- **Lockfile**: `bun.lock` - Bun lockfile
- **Install**: `bun install`
- **Run**: `bun run dev`

Note: npm is the primary package manager. Bun support is experimental.

## Code Style Guidelines

**TypeScript:**
- Strict mode enabled - always define explicit types
- Path alias: `@/` for all imports (configured in tsconfig.json)
- Avoid `any`; use `unknown` with type guards
- Prefix unused variables with `_` to ignore

**Import Order:**
1. External dependencies (`@tanstack/react-query`, `lucide-react`, `next-intl`)
2. Next.js built-ins (`next/server`, `next/navigation`)
3. Internal types (`@/types`)
4. Internal components/hooks/lib (`@/components`, `@/hooks`, `@/lib`)

**Naming Conventions:**
| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `mod-manager.ts` |
| Components | PascalCase | `ServerCard` |
| Functions | camelCase | `getServerMods` |
| Types/Interfaces | PascalCase | `ServerModsConfig` |
| Constants | UPPER_SNAKE | `STEAM_APP_ID` |
| Hooks | camelCase + 'use' prefix | `useServers` |

**React Components:**
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
- **Theme**: `next-themes` with `dark` class on html element

## Known Limitations

- **Job Storage**: In-memory Map, lost on restart (restore/server jobs)
- **Multi-installation**: Only `/opt/pzserver` fully supported
- **Console Streaming**: In-memory capture state, lost on restart
- **Log Watcher**: Must be started manually/integrated for real-time ingestion
- **Log Stream Manager**: In-memory batch buffers and subscriptions, lost on restart
- **System Monitor**: In-memory state, lost on restart (auto-restarts in layout)
