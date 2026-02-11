# Zomboid Web Manager - Start Server Feature Plan

## Context

The zomboid-web-manager currently provides a web interface for backup management, server configuration, and rollback operations. To become a complete server management solution, it needs the ability to start and stop Project Zomboid servers directly from the web interface.

## Goals

### Primary Goals

1. **Web-Based Server Control** - Enable users to start and stop Project Zomboid servers without SSH access
2. **Real-Time Status Monitoring** - Display which servers are running, their uptime, PID, and port bindings
3. **Multi-Server Support** - Manage multiple servers simultaneously with proper port allocation
4. **Async Job Tracking** - Provide progress feedback for server start/stop operations
5. **Multi-Version Support** - Support running different PZ versions from different installations

### User Experience Goals

1. **One-Click Operations** - Start/stop servers with single button click
2. **Clear Visual Feedback** - Status indicators, progress bars, and success/error states
3. **Safe Operations** - Confirmation dialogs for destructive operations (stop server)
4. **Accessibility** - View server status from dashboard without navigating away

## Problem Statement

| Problem | Impact |
|---------|--------|
| Users must manually SSH into the server and use tmux to start servers | High friction, requires technical knowledge |
| No web-based control over server lifecycle | Cannot manage from mobile/web UI |
| No visibility into which servers are running | Unclear state, potential conflicts |
| Cannot manage multiple servers or versions from a single interface | Fragmented management experience |
| Port conflicts prevent running multiple servers simultaneously | Servers fail to start when ports overlap |

## Solution Overview

Add comprehensive server start/stop functionality through:
1. Server status monitoring (running/stopped)
2. Start/Stop controls via web UI
3. Job-based async execution with progress tracking
4. Support for multiple PZ installations (different versions)
5. Port management to prevent conflicts
6. Tmux session integration for persistence

## UI/UX Design

### Dashboard Enhancements

**Server Status Cards:**
- Visual indicator showing number of running servers vs total configured
- Color-coded status (green = running, gray = stopped)
- Quick-start buttons for stopped servers

**Server List Widget:**
- Table showing all servers with status
- Columns: Server Name, Status (Running/Stopped), PID, Uptime, Ports
- Inline start/stop buttons
- Status updates every 10 seconds via polling

### Servers Page Enhancements

**Server Cards:**
- Add status badge to each server card (Running/Stopped)
- Show live PID and uptime when running
- Show port configuration (default, UDP, RCON)
- Add Play/Stop button icon (color-coded)

**Start Server Modal:**
- Triggered when clicking Play button on stopped server
- Options:
  - Select PZ installation (dropdown)
  - Enable debug mode (optional toggle)
- Progress display:
  - Progress bar (0-100%)
  - Status messages at each stage
  - Success state with session name
  - Error state with failure reason

**Stop Server Confirmation:**
- Confirmation dialog requiring explicit confirmation
- Warning about unsaved game state
- Graceful shutdown with save operation

### Status Indicators

**Running State:**
- Green dot/badge
- Activity icon
- Display PID, uptime, session name
- Show port bindings

**Stopped State:**
- Gray badge
- Server icon (inactive)
- "Not running" message

**Starting/Stopping State:**
- Loading spinner
- Progress bar for start operations
- "Starting..." or "Stopping..." text

### Progress Stages (Start Server)

| Stage | Progress | Message |
|-------|----------|---------|
| Initialization | 0% | "Initializing server start..." |
| Checking existing | 10% | "Checking if server is already running..." |
| Starting tmux session | 20% | "Starting server in tmux session..." |
| Waiting for init | 40% | "Waiting for server to initialize..." |
| Verifying process | 60% | "Verifying server process..." |
| Checking port binding | 80% | "Checking port binding..." |
| Complete | 100% | "Server started successfully!" |

## Technical Architecture

### Type Definitions

**ServerStartJob:**
- Job ID for tracking
- Server name
- Status (pending, running, completed, failed)
- Progress percentage
- Status message
- Timestamps (started, completed)
- Error details (if failed)
- PID and tmux session name (on success)

**ServerStatus:**
- Server name
- Running state (boolean)
- PID (if running)
- Tmux session name
- Uptime (human-readable)
- Port configuration
- PZ version
- Installation path

**PZInstallation:**
- Installation ID
- Display name
- File system path
- Version string

**ServerConfig:**
- Server name
- Installation ID mapping
- Port configuration (default, UDP, RCON)

### Business Logic

**Core Functions:**
- `startServer(serverName, options)` - Initiates async server start
- `stopServer(serverName)` - Initiates graceful server shutdown
- `getServerStatus(serverName)` - Returns current status with caching
- `getAllServerStatus()` - Returns status for all configured servers
- `getServerStartJobStatus(jobId)` - Polls job progress

**Server Start Flow:**
1. Check if server already running (tmux session + PID check)
2. Create tmux session with name `pz-{servername}`
3. Execute start-server.sh script with server name flag
4. Wait for process to spawn (3-10 second delay)
5. Verify PID exists
6. Verify port binding
7. Update status cache

**Server Stop Flow:**
1. Send "save" command via tmux
2. Wait 5 seconds for save to complete
3. Send "quit" command via tmux
4. Wait 10 seconds for graceful shutdown
5. Kill tmux session
6. Clear status cache

**Status Detection:**
- Check tmux session existence
- Find PID via process name matching (servername pattern)
- Get process uptime via ps command
- Verify port binding via ss command

**Caching Strategy:**
- Status cache with 5-second TTL
- Reduces system calls for frequent polling
- Invalidated on start/stop operations

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/servers/{name}/start` | Start server, returns job ID |
| POST | `/api/servers/{name}/stop` | Stop server, returns job ID |
| GET | `/api/servers/{name}/start` | Get server status |
| GET | `/api/servers/status` | Get all server statuses |
| GET | `/api/installations` | List available PZ installations |
| GET | `/api/jobs/{id}` | Poll job status |

**Authentication:** All endpoints require valid session cookie

### React Query Hooks

**Mutations:**
- `useStartServer()` - Initiates server start
- `useStopServer()` - Initiates server stop

**Queries:**
- `useServerStatus(serverName)` - Single server status, 10s polling
- `useAllServerStatus()` - All servers status, 10s polling
- `useServerStartJob(jobId)` - Job progress, 2s polling when running
- `useInstallations()` - Available PZ installations

### Configuration Files

**PZ Installations Config** (`/root/Zomboid/backup-system/config/pz-installations.json`):
```json
{
  "installations": {
    "default": {
      "id": "default",
      "name": "Default (v42.13)",
      "path": "/opt/pzserver",
      "version": "42.13.1"
    }
  },
  "servers": {
    "servertest": {
      "installationId": "default",
      "ports": {
        "defaultPort": 16261,
        "udpPort": 16262,
        "rconPort": 27015
      }
    }
  }
}
```

### Port Allocation Scheme

To run multiple servers simultaneously, each needs unique ports:

| Server | DefaultPort | UDPPort | RCONPort |
|--------|-------------|---------|----------|
| servertest | 16261 | 16262 | 27015 |
| duypzserver | 16271 | 16272 | 27025 |
| duypzserver_duytung | 16281 | 16282 | 27035 |
| newserver | 16291 | 16292 | 27045 |

**Port increment pattern:** +10 for default, +10 for UDP, +10 for RCON per server

### Multi-Instance Architecture (Single User)

**Important:** Multiple PZ instances do NOT require separate Linux users. All servers can run under the same user (currently `root`, or a dedicated `zomboid` user).

```
┌─────────────────────────────────────────────────────┐
│  User: root (or dedicated zomboid user)              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│
│  │ servertest  │  │ duypzserver │  │ newserver   ││
│  │ PID: 12345  │  │ PID: 12346  │  │ PID: 12347  ││
│  │ Ports:      │  │ Ports:      │  │ Ports:      ││
│  │ 16261/16262 │  │ 16271/16272 │  │ 16281/16282 ││
│  └─────────────┘  └─────────────┘  └─────────────┘│
│         │                │                │         │
│         ▼                ▼                ▼         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│
│  │ Saves/      │  │ Saves/      │  │ Saves/      ││
│  │ Multiplayer/│  │ Multiplayer/│  │ Multiplayer/││
│  │ servertest/ │  │ duypzserver/│  │ newserver/  ││
│  └─────────────┘  └─────────────┘  └─────────────┘│
└─────────────────────────────────────────────────────┘
```

**What Each Instance Needs (Unique vs Shared):**

| Requirement | Unique Per Server | Shared Across All |
|-------------|-------------------|-------------------|
| Server name | ✅ `-servername <name>` | ❌ |
| Ports | ✅ Different ports in INI | ❌ |
| Save directory | ✅ Auto-created by servername | ❌ |
| INI file | ✅ `<servername>.ini` | ❌ |
| **System user** | ❌ | ✅ Same user (root/zomboid) |
| **PZ installation** | ❌ | ✅ Can share same `/opt/pzserver` |

**Save File Locations (Automatic):**

The `-servername` parameter automatically determines save location:
- Without `-servername` → defaults to `servertest`
- With `-servername MyServer` → creates/uses `~/Zomboid/Saves/Multiplayer/MyServer/`

**Startup Commands:**

```bash
# Terminal 1 - Start servertest
/opt/pzserver/start-server.sh -servername servertest -nosteam

# Terminal 2 - Start duypzserver (same user, different name/ports)
/opt/pzserver/start-server.sh -servername duypzserver -nosteam

# Terminal 3 - Start newserver (same user, different name/ports)
/opt/pzserver/start-server.sh -servername newserver -nosteam
```

**When Separate Users Would Be Needed:**
- Production environments requiring security isolation
- Different owners/administrators needing permission separation
- Per-user resource limiting (CPU/memory via cgroups)
- Web hosting where each customer gets their own user

**For Zomboid Web Manager:** All instances run as the same user (root or dedicated `zomboid` user). The web UI manages multiple servers through unique server names and port allocation only.

### Tmux Integration

**Session Naming:** `pz-{servername}`

**Session Management:**
- Create new detached session for server start
- Send commands via `tmux send-keys`
- Check session existence via `tmux has-session`
- Kill session via `tmux kill-session`

**Process Persistence:**
- Server runs inside tmux session
- Survives SSH disconnect
- Attachable for console access: `tmux attach -t pz-{servername}`

## Implementation Phases

### Phase 1: Type Definitions
Add TypeScript types for jobs, status, installations, and configs

### Phase 2: Business Logic
Implement start/stop/status functions in `lib/snapshot-manager.ts`

### Phase 3: API Endpoints
Create REST API routes for server control

### Phase 4: API Client
Add client functions and React Query hooks

### Phase 5: UI Components
Build start modal, status indicators, and dashboard widgets

### Phase 6: Dashboard Integration
Add server status overview and quick actions

## Verification Checklist

- [ ] Start server from web UI (/servers page)
- [ ] Verify tmux session created (`tmux ls`)
- [ ] Verify server process running (`ps aux | grep ProjectZomboid64`)
- [ ] Verify port binding (`ss -ulnp | grep 16261`)
- [ ] Check server status endpoint returns correct data
- [ ] Stop server from web UI
- [ ] Verify graceful shutdown (save then quit)
- [ ] Verify tmux session terminated
- [ ] Verify process killed
- [ ] Test with multiple servers simultaneously
- [ ] Test port conflict detection
- [ ] Test progress polling during start

## Future Enhancements

1. **Server Console View** - Stream tmux session output to web browser
2. **RCON Integration** - Send admin commands to running servers
3. **Auto-Restart** - Automatically restart crashed servers
4. **Resource Monitoring** - CPU, memory usage per server
5. **Player List** - Show connected players via RCON
6. **Systemd Integration** - Alternative to tmux for service management
7. **Server Logs Viewer** - View server console logs from web UI
8. **Cron-Based Starts** - Scheduled server restarts

## Technical Notes

- **Multi-instance:** All servers run as same Linux user (root or dedicated `zomboid` user). Separate users NOT required.
- **Save separation:** Automatic via `-servername` parameter (creates `~/Zomboid/Saves/Multiplayer/{servername}/`)
- All servers start with `-nosteam` flag (Steam disabled for dedicated servers)
- Tmux session naming convention: `pz-{servername}`
- Status cache TTL: 5 seconds to reduce system load
- Job polling interval: 2 seconds while running/pending
- Server status polling: 10 seconds for UI updates
- Process detection uses pgrep with pattern matching on servername
- Port verification uses `ss -ulnp` command

## Files to Modify

| File | Changes |
|------|---------|
| `types/index.ts` | Add ServerStartJob, ServerStatus, PZInstallation types |
| `lib/snapshot-manager.ts` | Add start/stop/status functions and job tracking |
| `lib/api.ts` | Add server control API client functions |
| `hooks/use-api.ts` | Add useStartServer, useStopServer, useServerStatus hooks |
| `app/api/servers/[name]/start/route.ts` | NEW - Start server endpoint |
| `app/api/servers/[name]/stop/route.ts` | NEW - Stop server endpoint |
| `app/api/servers/status/route.ts` | NEW - Get all server statuses |
| `app/api/installations/route.ts` | NEW - List PZ installations |
| `app/(authenticated)/servers/page.tsx` | Add start/stop buttons and status display |
| `app/(authenticated)/dashboard/page.tsx` | Add server status overview |
| `components/ServerStartModal.tsx` | NEW - Start server confirmation modal |
