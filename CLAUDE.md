# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Zomboid Web Manager** is a Next.js 16 web application providing a browser-based interface for managing Project Zomboid server backups, configurations, and server runtime (start/stop). It is part of a larger Zomboid server environment that includes:

- **Backup System** - Bash-based automated backup with systemd timers (`/root/Zomboid/backup-system/`)
- **Rollback CLI** - Node.js/React Ink terminal UI (`/root/Zomboid/rollback-cli/`)
- **Zomboid Web Manager** - This Next.js web application

## Development Commands

```bash
# Navigate to project directory
cd /root/Zomboid/zomboid-web-manager

# Install dependencies
npm install

# Development mode (http://localhost:3001)
npm run dev

# Production build
npm run build

# Production server (http://127.0.0.1:3000)
npm start

# Linting
npm run lint

# Testing
npm test                  # Run tests in watch mode
npm run test:run          # Run tests once
npm run test:ui           # Run tests with UI
npm run test:coverage     # Run tests with coverage

# Database (TimescaleDB via Docker)
npm run db:start          # Start database container
npm run db:stop           # Stop database container
npm run db:reset          # Reset database (deletes data)
npm run db:migrate        # Run admin migration
npm run db:seed           # Seed database with test data
```

### Production Deployment

Use the included setup script for automated deployment:

```bash
./setup.sh
```

This script:
1. Installs Node.js, npm, and cloudflared
2. Generates bcrypt password hash
3. Creates `.env.local` with secure SESSION_SECRET
4. Builds production bundle
5. Installs to `/opt/zomboid-web-manager/`
6. Creates systemd service at `/etc/systemd/system/zomboid-web-manager.service`
7. Guides Cloudflare Tunnel setup for HTTPS access

### Systemd Service Commands

```bash
# Start/Stop/Restart
systemctl start zomboid-web-manager
systemctl stop zomboid-web-manager
systemctl restart zomboid-web-manager

# Enable on boot
systemctl enable zomboid-web-manager

# View logs
journalctl -u zomboid-web-manager -f
```

## Architecture Overview

### Technology Stack
- **Next.js 16.1.6** with App Router (Server Components)
- **React 19.2.3** - Latest React with Server/Client Components
- **TypeScript 5** - Full type safety
- **Tailwind CSS 4** - Modern utility-first styling
- **TanStack React Query 5** - Server state management with caching
- **PostgreSQL with TimescaleDB** - Primary database for users, roles, sessions, audit logs
- **bcryptjs** - Password hashing (10 salt rounds)
- **Session-based auth** with HTTP-only cookies and database-backed sessions
- **recharts** - Data visualization charts
- **tmux** - Server session management for start/stop operations
- **Vitest** - Unit testing with pg-mem for database mocking

### Directory Structure

```
zomboid-web-manager/
├── app/                              # Next.js App Router
│   ├── api/                          # API Routes (Server-side)
│   │   ├── auth/route.ts             # POST login, DELETE logout
│   │   ├── servers/                  # Server management endpoints
│   │   │   ├── route.ts              # GET list, POST add, DELETE remove
│   │   │   ├── detect/route.ts       # Auto-detect servers
│   │   │   ├── status/route.ts       # GET all server statuses
│   │   │   └── [name]/
│   │   │       ├── snapshots/route.ts # GET list, DELETE snapshot
│   │   │       ├── stats/route.ts    # Server statistics
│   │   │       ├── restore/route.ts  # Start restore
│   │   │       ├── status/route.ts   # GET single server status
│   │   │       ├── start/route.ts    # POST start server
│   │   │       ├── stop/route.ts     # POST stop server
│   │   │       ├── abort/route.ts    # POST abort server start
│   │   │       ├── console/route.ts  # SSE console streaming
│   │   │       └── mods/route.ts     # GET server mods
│   │   ├── users/route.ts            # GET list, POST create user
│   │   ├── users/[id]/route.ts       # GET, PATCH, DELETE user
│   │   ├── roles/route.ts            # GET list, POST create role
│   │   ├── roles/[id]/route.ts       # GET, PATCH, DELETE role
│   │   ├── sessions/route.ts         # GET current session info
│   │   ├── audit-logs/route.ts       # GET audit log entries
│   │   ├── installations/route.ts    # GET PZ installations
│   │   ├── snapshots/route.ts        # GET all snapshots (rich/paginated)
│   │   ├── config/route.ts           # GET/PATCH/POST config
│   │   └── jobs/[id]/route.ts        # Poll restore/job status
│   ├── page.tsx                      # Login page
│   ├── (authenticated)/              # Protected route group
│   │   ├── dashboard/page.tsx        # Dashboard overview
│   │   ├── servers/page.tsx          # Server management (with start/stop)
│   │   ├── accounts/page.tsx         # User management (CRUD)
│   │   ├── roles/page.tsx            # Role management (CRUD)
│   │   ├── schedules/page.tsx        # Schedule management (full CRUD)
│   │   ├── backups/page.tsx          # Backup browser (not in sidebar nav)
│   │   ├── rollback/page.tsx         # 5-step restore wizard (not in sidebar nav)
│   │   ├── settings/page.tsx         # Settings with tabs
│   │   ├── logs/page.tsx             # Logs viewer (uses mock data)
│   │   └── layout.tsx               # Layout for authenticated pages (includes sidebar)
│   ├── layout.tsx                    # Root layout
│   └── globals.css                   # Global styles
├── components/
│   ├── providers/                    # React Query, Sidebar providers
│   ├── sidebar.tsx                   # Navigation sidebar
│   ├── top-header.tsx                # Header component
│   ├── ServerStatusBadge.tsx         # Status indicator component
│   ├── ServerStartModal.tsx          # Start server options modal
│   ├── StopConfirmModal.tsx          # Stop server confirmation
│   ├── ConsoleModal.tsx              # Console viewing modal
│   ├── ConsoleViewer.tsx             # Console log viewer
│   └── ModList.tsx                   # Server mods display
├── hooks/
│   ├── use-api.ts                    # React Query hooks for server/backup APIs
│   └── use-api-users.ts              # React Query hooks for user/role APIs
├── lib/                              # Business logic
│   ├── api.ts                        # API client functions
│   ├── auth.ts                       # Authentication utilities
│   ├── db.ts                         # PostgreSQL connection and query helpers
│   ├── user-manager.ts               # User CRUD operations
│   ├── role-manager.ts               # Role CRUD and permission checking
│   ├── config-manager.ts             # Config file operations (5s cache)
│   ├── console-manager.ts            # Console capture via tmux pipe-pane
│   ├── file-utils.ts                 # File system utilities
│   ├── mod-manager.ts                # Server mod configuration parsing
│   ├── snapshot-manager.ts           # Backup operations, restore job tracking
│   └── server-manager.ts             # Server start/stop, status, job tracking
├── scripts/
│   ├── init-db.sql                   # Database schema and seed data
│   └── migrate-admin.js              # Admin user migration script
├── __tests__/
│   ├── setup/setup.ts                # Test setup (pg-mem or real DB)
│   ├── setup/test-db.ts              # pg-mem test database factory
│   ├── mocks/data.ts                 # Test mock data
│   └── unit/lib/                     # Unit tests for lib modules
├── types/index.ts                    # TypeScript definitions
├── vitest.config.ts                  # Vitest configuration
├── docker-compose.yml                # TimescaleDB container config
└── tsconfig.json                     # @/* path alias maps to project root
```

## Key Architecture Patterns

### Client/Server Component Split

- **Server Components** (default): API routes, data fetching
- **Client Components** (`'use client'` directive): Interactive UI, forms, stateful components

All pages in `app/(authenticated)/` are client components that use React Query hooks for data fetching.

### Authentication Flow

1. **Login** (`/api/auth`, POST): User submits password → bcrypt verification → session cookie created
2. **No middleware file**: Session validation is handled at the API route level
3. **Session Storage**: HTTP-only cookies with SameSite strict, 24-hour expiry

**Password Generation:**
```bash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('your-password', 10));"
```

### React Query Data Flow

```
Component → useQuery/useMutation hook → lib/api.ts → API route → lib/business-logic → File system/Scripts
```

All hooks are in `hooks/use-api.ts` and `hooks/use-api-users.ts`:

**Server/Backup hooks** (`use-api.ts`):
- `useServers()`, `useAddServer()`, `useRemoveServer()`, `useDetectServers()`
- `useSnapshots(serverName, schedule?)`, `useDeleteSnapshot()`
- `useAllSnapshots(server?, schedule?, dateFrom?, dateTo?)` - Rich snapshots with pagination
- `useServerStats(serverName)`
- `useRestore()`, `useRestoreJob(jobId)`
- `useConfig()`, `useSaveConfig()`, `useUpdateSchedule()`, `useUpdateCompression()`, `useUpdateIntegrity()`, `useUpdateAutoRollback()`
- `useServerStatus(serverName)`, `useAllServerStatus()` - 10-second polling
- `useStartServer()`, `useStopServer()`, `useAbortServerStart()`
- `useInstallations()`, `useServerMods(serverName)`
- `useConsoleStream(serverName, enabled)` - SSE-based console streaming

**User/Role hooks** (`use-api-users.ts`):
- `useUsers(params?)`, `useUser(id)`, `useCreateUser()`, `useUpdateUser()`, `useDeleteUser()`
- `useRoles()`, `useRole(id)`, `useCreateRole()`, `useUpdateRole()`, `useDeleteRole()`
- `useCurrentUser()` - Returns logged-in user with role

### API Response Format

All API responses use consistent `ApiResponse<T>` type:
```typescript
{
  success: boolean;
  data?: T;
  error?: string;
}
```

## Database Layer (PostgreSQL/TimescaleDB)

The application uses PostgreSQL with TimescaleDB for user management, sessions, and audit logging.

### Database Schema

| Table | Purpose |
|-------|---------|
| `roles` | RBAC role definitions with JSONB permissions |
| `users` | User accounts with foreign key to roles |
| `sessions` | Server-side session storage with tokens |
| `audit_logs` | Time-series audit log (TimescaleDB hypertable) |

### Database Manager (lib/db.ts)

Query helpers with automatic test mode detection:
- `query<T>(sql, params)` - Execute query with auto client release
- `queryOne<T>(sql, params)` - Returns first row or null
- `transaction(callback)` - Execute with auto commit/rollback
- `checkConnection()` - Health check

**Test Mode:** When `NODE_ENV=test` and `USE_REAL_DATABASE != true`, uses pg-mem in-memory database. For integration tests, set `USE_REAL_DATABASE=true`.

### User Management (lib/user-manager.ts)

CRUD operations for users:
- `createUser(input)` - Hashes password with bcrypt, validates uniqueness
- `updateUser(id, input)` - Partial updates, password hashing if provided
- `deleteUser(id)` - Prevents deletion of last superadmin
- `listUsers({ page, limit, roleId, isActive, search })` - Paginated with filters
- `getUserByUsernameWithRole(username)` - For authentication

### Role Management (lib/role-manager.ts)

RBAC with permission checking:
- `hasPermission(role, resource, action)` - Superadmin has all, wildcard support
- `createRole(input)` - Custom roles with JSONB permissions
- `updateRole(id, input)` - Cannot rename system roles
- `deleteRole(id)` - Cannot delete system roles, nulls user role_ids

**Default Roles:** superadmin, admin, operator, viewer (system roles, cannot be deleted)

### Permission Format

Permissions stored as JSONB: `{ "resource": ["action1", "action2"] }`

Example:
```json
{
  "servers": ["view", "start", "stop"],
  "backups": ["view", "restore"],
  "logs": ["view"]
}
```

Wildcard: `{ "*": ["*"] }` grants all permissions.

### Audit Logging

Audit logs use TimescaleDB hypertable with 1-day chunks:
- `time` - Timestamp (primary partition key)
- `user_id`, `username` - Actor identification
- `action` - Action type (e.g., "user.login", "server.start")
- `resource_type`, `resource_id` - Target resource
- `details` - JSONB for additional context
- `ip_address` - Client IP

## Testing

Tests use Vitest with jsdom environment. Database tests can use either pg-mem (unit) or real TimescaleDB (integration).

### Test Structure

```
__tests__/
├── setup/
│   ├── setup.ts              # Global setup, chooses pg-mem or real DB
│   └── test-db.ts            # pg-mem factory with schema bootstrapping
├── mocks/
│   └── data.ts               # Test fixtures (roles, users)
└── unit/lib/
    ├── role-manager.test.ts  # Role CRUD and permission tests
    └── user-manager.test.ts  # User CRUD tests
```

### Running Tests

```bash
# Unit tests (pg-mem, fast)
npm test

# Single run (CI mode)
npm run test:run

# Integration tests (requires running TimescaleDB)
USE_REAL_DATABASE=true npm test
```

### Test Database Setup

Unit tests use pg-mem with in-memory PostgreSQL emulation. The test setup:
1. Creates pg-mem database instance
2. Runs init-db.sql schema
3. Seeds default roles
4. Stores in globalThis for access by lib/db.ts

## Server Management (lib/server-manager.ts)

This library manages Project Zomboid server runtime operations using tmux sessions.

### Server Status Detection

Servers are detected by:
1. **tmux session**: Named `pz-{serverName}` - indicates session exists
2. **Process PID**: Found via `pgrep -f "ProjectZomboid64.*-servername {serverName}"`
3. **Port binding**: Checks if ports are bound via `ss -ulnp`

**Status states**: `stopped` | `starting` | `running` | `stopping`

**Status caching**: 5-second TTL to reduce system calls

### Port Calculation

Ports use smart calculation:
- First tries default ports (16261/16262/27015) if available
- Falls back to index-based calculation (+10 per server index)
- Example: Server at index 1 → 16271/16272/27025

### Starting a Server

The `startServer()` function:
1. Creates a detached tmux session: `tmux new-session -d -s pz-{serverName}`
2. Sends start command: `{installation.path}/start-server.sh -servername {name} -nosteam`
3. Waits up to 1 hour (3600s) for process to spawn
4. Verifies port binding (up to 1 hour)
5. Returns jobId for progress tracking
6. Can be aborted via `/api/servers/[name]/abort` before completion

**Start options**:
- `debug?: boolean` - Adds `-debug` flag
- `installationId?: string` - Select PZ installation (future feature)

### Stopping a Server

The `stopServer()` function:
1. Sends `save` command to tmux session (allows 5 seconds)
2. Sends `quit` command to tmux session
3. Waits up to 15 seconds for graceful shutdown
4. Falls back to SIGTERM if still running
5. Kills tmux session

### Job Tracking

Server start/stop operations use job system:
- In-memory Map store (lost on restart)
- Job ID format: `{start|stop}-{timestamp}-{random}`
- Progress stages: 10% → 20% → ... → 100%
- Status: `pending` | `running` | `completed` | `failed`

The `/api/jobs/[id]` endpoint returns either `RestoreJob` or `ServerJob` type.

## Console Manager (lib/console-manager.ts)

This library manages live server console output streaming using tmux pipe-pane:

**Console Capture:**
- Uses `tmux pipe-pane` to capture console output to `/tmp/pz-console-{server}.log`
- Reference counting for multiple clients - capture only stops when last client disconnects
- Initial buffer capture (100 lines) on first connect via `tmux capture-pane`
- Auto-cleanup after 1 minute of no clients
- Active capture state tracking via in-memory Map

**Console State:**
- `startConsoleCapture(serverName)` - Starts capture, returns log path
- `stopConsoleCapture(serverName)` - Decrements client count, stops when 0
- `getConsoleSnapshot(serverName, lines)` - Gets N lines from tmux buffer
- `isCapturing(serverName)` - Check if currently capturing

**SSE Streaming:**
- `/api/servers/[name]/console/route.ts` provides Server-Sent Events stream
- Uses `tail -f` to follow log file changes
- Event types: `connected`, `init`, `log`, `error`
- Auto-reconnect handling in client hooks
- File position tracking for incremental updates

## Mod Manager (lib/mod-manager.ts)

Parses server INI files to extract mod configuration:

**Functions:**
- `getServerMods(serverName)` - Returns full mod configuration
- `getServerModSummary(serverName)` - Returns counts only

**Parsed Data:**
- `mods[]`: Array of local mod names (comma-separated in INI)
- `workshopItems[]`: Array of `{workshopId, name}` objects (semicolon-separated, format: `id=name`)
- `maps[]`: Array of map names (comma-separated, defaults to `Muldraugh, KY`)

**INI Location:** `/root/Zomboid/Server/{servername}.ini`

## Snapshot API (app/api/snapshots/route.ts)

Rich snapshots endpoint with advanced filtering and metadata:

**Query Parameters:**
- `server?: string` - Filter by server name
- `schedule?: string` - Filter by schedule type
- `dateFrom?: ISO8601` - Filter snapshots after date
- `dateTo?: ISO8601` - Filter snapshots before date
- `offset?: number` - Pagination offset (default: 0)
- `limit?: number` - Results per page (default: 50)

**Response includes:**
- Snapshots with metadata: status, integrity, compression stats, restore options, age
- Pagination info: total, offset, limit, hasMore
- Summary: total size, average size, compression ratio
- Applied filters

## External System Integration

### File System Paths

| Purpose | Path |
|---------|------|
| Backup config | `/root/Zomboid/backup-system/config/backup-config.json` |
| Snapshots | `/root/Zomboid/backup-system/snapshots/` |
| Server saves | `/root/Zomboid/Saves/Multiplayer/` |
| Restore script | `/root/Zomboid/backup-system/bin/restore.sh` |
| Backup script | `/root/Zomboid/backup-system/bin/backup.sh` |
| Server INI configs | `/root/Zomboid/Server/{servername}.ini` |
| Server databases | `/root/Zomboid/db/{servername}.db` |
| PZ Installation | `/opt/pzserver/` (default) |
| Console logs | `/tmp/pz-console-{servername}.log` |

### Server Validation Criteria

Servers are validated by checking required files/directories:
- **Required**: `map_meta.bin`, `map/`, `chunkdata/`
- **Optional detection**: `.ini` config files, `.db` database files

### Backup Config Schema

The config contains (see `types/index.ts`):
- `schedules[]`: Array of schedule objects with name, interval (cron), enabled, retention
- `servers[]`: Array of server name strings
- `compression`: { enabled, algorithm, level, extension }
- `integrity`: { enabled, algorithm, verifyAfterBackup, verifyAfterRestore }
- `notifications`: { enabled, onSuccess, onFailure, onLowDisk, diskThreshold }
- `performance`: { parallelBackup, maxParallelJobs, nice, ionice }
- `autoRollback`: { enabled, schedule, cooldownMinutes, notifyPlayers }

## API Endpoints

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users (supports `?page&limit&roleId&isActive&search`) |
| POST | `/api/users` | Create user |
| GET | `/api/users/[id]` | Get user by ID |
| PATCH | `/api/users/[id]` | Update user |
| DELETE | `/api/users/[id]` | Delete user |

### Roles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/roles` | List all roles |
| POST | `/api/roles` | Create custom role |
| GET | `/api/roles/[id]` | Get role by ID |
| PATCH | `/api/roles/[id]` | Update role (cannot rename system roles) |
| DELETE | `/api/roles/[id]` | Delete role (system roles protected) |

### Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sessions` | Get current session/user info |

### Audit Logs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audit-logs` | List audit entries (supports `?userId&action&resourceType&from&to`) |

## Pages and Navigation

### Sidebar Navigation

The sidebar navigation (`components/sidebar.tsx`) includes:
- **Dashboard** (`/dashboard`) - Overview with server status, quick actions
- **Servers** (`/servers`) - Server detection, validation, add/remove, **start/stop controls**
- **Accounts** (`/accounts`) - User management with CRUD operations
- **Roles** (`/roles`) - Role management with CRUD operations
- **Schedules** (`/schedules`) - Full CRUD for backup schedules
- **Logs** (`/logs`) - Operation history viewer (currently mock data)
- **Settings** (`/settings`) - Tabbed interface (Schedules/Servers/Settings)

### Pages Not in Sidebar Navigation

- **Backups** (`/backups`) - Backup browser with filtering
- **Rollback** (`/rollback`) - 5-step restore wizard

### Page Details

**Dashboard** (`/dashboard`):
- Stats row: Total Servers, Running Servers, Active Schedules, Storage Used, Retention Count
- Server table with status indicators and last/next backup times
- Running servers count via `useAllServerStatus()`
- Quick action buttons

**Servers Page** (`/servers`):
- Server cards with status badges
- Start/Stop buttons (disabled during starting/stopping)
- Displays PID, uptime, ports when running
- Auto-detect and manual server add
- Console button (opens modal with live console stream)

**Schedules Page** (`/schedules`):
- Full CRUD operations for schedules
- Add new schedule with custom name, interval, retention
- Delete existing schedules
- Toggle enable/disable schedules

**Settings Page** (`/settings`):
- **Schedules Tab**: Quick toggle and retention adjustment
- **Servers Tab**: View configured servers
- **Settings Tab**: Compression toggle/level, integrity verification toggles

**Accounts Page** (`/accounts`):
- User table with username, email, role, status, last login
- Create user modal with role selection
- Edit user modal with password change option
- Delete user with confirmation (prevents deleting last superadmin)

**Roles Page** (`/roles`):
- Role cards showing permissions by resource
- Create custom roles with permission matrix
- Edit role permissions (cannot rename system roles)
- Delete custom roles (system roles protected)

## Important Implementation Notes

### Path Alias Resolution

The `@/*` alias maps to project root (`tsconfig.json`):
```typescript
import { Server } from '@/types';
import { api } from '@/lib/api';
```

### Config Manager Caching

`lib/config-manager.ts` uses a 5-second (5000ms) TTL cache for config reads to avoid excessive file I/O.

### Route Groups

The `(authenticated)` folder creates a route group that doesn't appear in URLs but allows for shared layouts and organization.

### Rollback Wizard Flow

5-step process (`app/(authenticated)/rollback/page.tsx`):
1. Select Server - Dropdown with validation badges
2. Select Backup - Filterable list with schedule tabs
3. Preview - Shows snapshot details and warnings
4. Confirm - Type server name to confirm (prevents accidents)
5. Progress - Real-time progress monitoring with 3-second polling

### Error Handling Patterns

- **API routes**: Try/catch with structured error responses
- **Client hooks**: React Query error handling via mutation error state
- **File operations**: Graceful null returns for missing files

## Environment Configuration

Required `.env.local` variables:

```bash
# Database (required for user management)
DATABASE_URL=postgresql://zomboid_admin:password@localhost:5432/zomboid_manager

# Authentication
SESSION_SECRET=random_secret_key    # Random secret for session signing

# Zomboid paths
ZOMBOID_PATH=/root/Zomboid
BACKUP_CONFIG_PATH=/root/Zomboid/backup-system/config/backup-config.json
SNAPSHOTS_PATH=/root/Zomboid/backup-system/snapshots

NODE_ENV=production
```

**Development database:** Run `npm run db:start` to start TimescaleDB container via docker-compose.

## Styling Conventions

- **Dark theme**: Uses slate color palette via Tailwind CSS
- **CSS Variables**: Primary colors use CSS custom properties
- **Responsive**: Mobile-first approach with `lg:` breakpoints
- **Icons**: Lucide React icon library
- **Components**: Card-based layouts with `bg-card border border-border rounded-lg`
- **Sidebar**: Collapsible with icon-only mode, hover tooltips

## Known Limitations

- **Logs Page**: Currently uses mock data. Real API integration pending.
- **Job Storage**: Restore and server jobs are stored in-memory (Map) and will be lost on server restart.
- **Multi-installation**: Only default installation at `/opt/pzserver` is fully supported.
- **Console Streaming**: Console capture state is in-memory and lost on server restart.
- **Audit Logs**: API route exists but frontend integration pending.
