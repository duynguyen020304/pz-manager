# Project Zomboid Server Manager

## Complete Feature List

### Server Management

| Feature | Description |
|---------|-------------|
| **Multi-Server Support** | Manage multiple Project Zomboid servers from a single dashboard |
| **Auto-Server Detection** | Automatically detect existing server installations on your system |
| **Server Lifecycle Control** | Start, stop, and abort server operations with real-time status monitoring |
| **Live Console Access** | Real-time console streaming with Server-Sent Events (SSE) for live server output |
| **Port Management** | Configure and manage server ports (default, UDP, RCON) per server |
| **Multi-Version Support** | Support for multiple Project Zomboid installations/versions |
| **CACHEDIR Isolation** | Each server runs with isolated cache directories for clean separation |

### Configuration Management

| Feature | Description |
|---------|-------------|
| **Visual INI Editor** | Edit server configuration files with a user-friendly interface including 80+ settings |
| **SandboxVars Editor** | Configure game difficulty and world settings across 9 categories with 40+ options |
| **Difficulty Presets** | Quick presets for Apocalypse, Survivor, and Builder game modes |
| **Quick Config Panel** | Rapid server setup with RAM sliders, player limits, and essential toggles |
| **Advanced Settings** | Full access to all server INI configuration options with search and filter |
| **Dynamic Input Types** | Automatic detection of boolean, number, and string configuration values |

### Backup & Restore

| Feature | Description |
|---------|-------------|
| **Automated Backups** | Schedule automatic backups with customizable intervals and retention policies |
| **Snapshot Management** | Browse, filter, and manage backup snapshots with detailed metadata |
| **Integrity Verification** | Automatic checksum verification ensures backup integrity |
| **Compression** | Configurable compression settings with ratio statistics |
| **5-Step Rollback Wizard** | Guided restoration process with preview and confirmation |
| **Schedule Filtering** | Filter backups by schedule, server, and date ranges |
| **Auto-Rollback** | Automatic rollback on failed server starts with cooldown protection |

### Mod Management

| Feature | Description |
|---------|-------------|
| **Steam Workshop Integration** | Download and install mods directly from Steam Workshop URLs |
| **Drag-and-Drop Ordering** | Reorder mod load order with intuitive drag-and-drop interface |
| **Mod Validation** | Automatic validation of downloaded mod structure and files |
| **Workshop Item Tracking** | Track workshop IDs and mod metadata |
| **Load Order Management** | Visual management of mod load priorities |
| **Map Mod Support** | Special handling for map-based workshop items |

### User Management & RBAC

| Feature | Description |
|---------|-------------|
| **Role-Based Access Control** | Granular permissions system with 7 resource types and 9 action types |
| **Default Roles** | Pre-configured Superadmin, Admin, Operator, and Viewer roles |
| **Custom Role Creation** | Create custom roles with specific permission combinations |
| **Permission Matrix** | Visual permission editor with preset shortcuts |
| **User CRUD** | Create, edit, activate, deactivate, and delete user accounts |
| **Session Management** | Secure session-based authentication with HTTP-only cookies |
| **Audit Trail** | Complete audit logging of all user actions with timestamps |

### Logging & Monitoring

| Feature | Description |
|---------|-------------|
| **Unified Log Viewer** | Single interface for all log types (server, player, chat, PVP, backup) |
| **Real-Time Log Streaming** | Live log updates via Server-Sent Events |
| **Multiple Log Sources** | Support for 6+ log types with source filtering |
| **Log Statistics** | Dashboard showing total events, unique players, errors, logins, deaths, and chat |
| **Player Activity Tracking** | Track player logins, deaths, chat messages, and session duration |
| **PVP Combat Logs** | Detailed combat and damage event tracking |
| **Advanced Filtering** | Filter by server, date range, event type, log level, and username |
| **Log Detail View** | Detailed inspection of individual log entries |

### System Monitoring

| Feature | Description |
|---------|-------------|
| **Real-Time Metrics** | Live CPU, memory, swap, and network usage monitoring |
| **Historical Data** | Time-series storage of system metrics with configurable retention |
| **Resource Spike Detection** | Automatic detection of CPU and memory spikes with severity levels |
| **Configurable Thresholds** | Customize spike detection sensitivity and polling intervals |
| **Metrics Dashboard** | Visual charts and graphs for system performance |
| **Network Monitoring** | Track network I/O with per-interface statistics |
| **Alert System** | Notification triggers for critical resource usage |

### Security & Access

| Feature | Description |
|---------|-------------|
| **bcrypt Password Hashing** | Secure password storage with industry-standard hashing |
| **Session-Based Authentication** | Secure HTTP-only cookie sessions |
| **IP & User-Agent Tracking** | Audit logging includes client information |
| **Permission Enforcement** | API-level permission checks on all protected routes |
| **Secure Console Access** | Protected server console streaming |
| **Role Protection** | System roles cannot be deleted or modified |

### Technical Features

| Feature | Description |
|---------|-------------|
| **Next.js 16 App Router** | Modern React framework with server components |
| **TypeScript 5** | Full type safety with strict mode enabled |
| **TimescaleDB Integration** | PostgreSQL with time-series extensions for efficient log/metrics storage |
| **React Query v5** | Powerful server state management with caching and synchronization |
| **Tailwind CSS v4** | Modern utility-first styling with dark theme |
| **Responsive Design** | Mobile-friendly interface with collapsible sidebar |
| **Accessibility** | ARIA labels, keyboard navigation, and screen reader support |
| **Real-Time Updates** | Live data synchronization across all connected clients |
| **Dark Theme Only** | Optimized dark interface for server management |

### Additional Capabilities

| Feature | Description |
|---------|-------------|
| **Public Schedule Viewer** | Share backup schedules publicly without authentication |
| **Job Tracking** | Asynchronous operation tracking for long-running tasks |
| **File System Watcher** | Real-time log file monitoring and ingestion |
| **Backup Notifications** | Success/failure notifications for backup operations |
| **Performance Optimization** | Parallel backup operations with configurable job limits |
| **Disk Space Monitoring** | Low disk space alerts with configurable thresholds |

## Technology Stack

- **Frontend**: Next.js 16.1.6, React 19, TypeScript 5
- **Styling**: Tailwind CSS v4, Lucide React icons
- **State**: TanStack Query v5
- **Database**: TimescaleDB (PostgreSQL)
- **Authentication**: bcryptjs, HTTP-only cookies
- **Monitoring**: systeminformation
- **Testing**: Vitest v3, @testing-library/react

## Database Features

- **TimescaleDB Hypertables**: Efficient time-series storage for logs and metrics
- **Automatic Partitioning**: Time-based chunking for optimal query performance
- **JSONB Permissions**: Flexible role permission storage
- **Audit Logging**: Complete action history with metadata
- **Session Management**: Server-side session storage with expiration

## API Endpoints

40+ RESTful API endpoints covering:
- Authentication & Sessions
- Server Management (CRUD, start/stop, console)
- Configuration (INI, SandboxVars)
- Mod Management (Workshop integration)
- Snapshots & Backups
- User & Role Management
- System Monitoring & Metrics
- Comprehensive Logging
- Audit Trail

## Getting Started

```bash
# Development
npm run dev          # Start dev server on 0.0.0.0:3001

# Production
npm run build        # Build for production
npm start            # Start production server on 127.0.0.1:3000

# Database
npm run db:start     # Start TimescaleDB container
npm run db:migrate   # Run migrations
npm run db:seed      # Seed initial data

# Testing
npm test             # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```
