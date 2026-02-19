# GEMINI.md - Zomboid Web Manager

This file provides context and instructions for AI agents working on the Zomboid Web Manager project.

## Project Overview

**Zomboid Web Manager** is a modern Next.js 16 application designed to manage Project Zomboid servers. It provides a web interface for server lifecycle management (start/stop/restart), configuration editing (INI files), Steam Workshop mod management, and a robust backup/rollback system.

### Key Technologies
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4.
- **State Management**: TanStack React Query 5.
- **Backend**: Next.js API Routes (Serverless functions).
- **Database**: PostgreSQL with TimescaleDB (RBAC, sessions, audit logs, metrics).
- **Real-time Communication**: Server-Sent Events (SSE) for log streaming and console output.
- **Process Management**: `tmux` for server session isolation.
- **Testing**: Vitest with `pg-mem` (in-memory Postgres) and MSW.

### Core Architecture: CACHEDIR Isolation
The project implements a strict isolation pattern where each Project Zomboid server runs with its own `-cachedir`.
- **Location**: `/root/server-cache/{serverName}/`
- **Contents**: Logs, Saves, Server configs, db, and Mods are all isolated per server.
- **Legacy Path**: `/root/Zomboid` is largely deprecated in favor of isolated cache directories.

---

## Building and Running

### Development Environment
```bash
# Install dependencies
npm install

# Start database (TimescaleDB)
npm run db:start

# Run development server (accessible at http://localhost:3001)
npm run dev

# Run tests
npm test             # Watch mode
npm run test:run     # CI mode
```

### Production Deployment
The application is typically deployed via a systemd service.
- **Binary Path**: `/opt/zomboid-web-manager/`
- **Service Name**: `zomboid-web-manager.service`
- **Deployment Script**: `./scripts/deploy.sh`

---

## Development Conventions

### Code Style & Architecture
- **Server Components**: Default for API routes and data fetching logic.
- **Client Components**: Used for interactive UI and forms (marked with `'use client'`).
- **Path Aliases**: Use `@/` to refer to the project root (e.g., `@/lib/db`, `@/components/ui/button`).
- **API Responses**: Always return the format `{ success: boolean; data?: T; error?: string }`.

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `snapshot-manager.ts` |
| Components | PascalCase | `ServerCard` |
| Functions | camelCase | `getServers` |
| Types/Interfaces | PascalCase | `Server`, `UserWithRole` |
| Constants | UPPER_SNAKE | `SAVES_PATH`, `API_BASE` |
| Hooks | camelCase + 'use' prefix | `useServers`, `useQueryClient` |

### React Components
- Functional components with hooks only.
- Add `'use client'` for client components (no server components in client tree).
- Destructure props, define interfaces before component.
- Props interface named `[Component]Props`.

```typescript
'use client';
import { Server } from '@/types';

interface ServerCardProps {
  server: Server;
  onDelete: () => void;
}

export function ServerCard({ server, onDelete }: ServerCardProps) {
  return <div className="bg-card rounded-lg border border-border">{server.name}</div>;
}
```

### API Routes
- Return consistent `ApiResponse<T>` format: `{ success: boolean, data?: T, error?: string }`.
- Log errors with context: `console.error('Failed:', { userId }, error)`.
- Use type guards: `error instanceof Error`.
- Validate request body with manual validation (no Zod currently).
- Use `requireAuth(request)` for protected routes.

### React Query (TanStack Query v5)
- Query keys as arrays: `['servers']`, `['snapshots', serverName]`.
- Use `enabled: !!serverName` for conditional fetching.
- Invalidate queries after mutations using `queryClient.invalidateQueries()`.
- Use `useMutation` for POST/PUT/DELETE operations.

### Tailwind CSS v4
- Use `@import "tailwindcss"` in globals.css (not directives).
- Use `@theme inline` for custom theme variables.
- Use semantic colors: `bg-card`, `text-foreground`, `border-border`.
- Custom CSS variables in `:root` for theming.

### Anti-Patterns
- **Don't use `any`**: Strict TypeScript; use `unknown` with type guards.
- **Don't throw raw errors**: Wrap in user-friendly messages.
- **Don't read files synchronously**: Use `fs/promises`.
- **Don't bypass fetchApi**: Always use the wrapper in `lib/api.ts`.

### Testing Strategy
- **Unit Tests**: Located in `__tests__/unit/`. Use `pg-mem` for database operations to avoid side effects.
- **E2E Tests**: Located in `__tests__/e2e/`.
- **Mocks**: Use `msw` for API mocking and `mock-fs` for file system simulations.
- **Database**: `lib/db.ts` detects test environment and uses pg-mem automatically unless `USE_REAL_DATABASE=true`.

### Path Management
Never hardcode paths. Use `lib/paths.ts` for centralized path resolution.
- `SERVER_CACHE_DIR(serverName)`: Root of server isolation.
- `BACKUP_CONFIG_PATH`: Path to the backup system configuration.

### Log Management
- Real-time logs are streamed via `lib/log-stream-manager.ts` using SSE.
- Log files are incrementally parsed and ingested into the database for search and audit.

---

## Key Directories and Files
- `app/`: Next.js pages and API routes.
- `components/`: Reusable React components.
- `hooks/`: Custom React hooks (mostly TanStack Query wrappers).
- `lib/`: Core business logic (server-manager, db, parsers, mod-manager).
  - `api.ts`: API client with `fetchApi<T>` wrapper.
  - `auth.ts`: Session management.
  - `db.ts`: Database connection.
  - `config-manager.ts`: Backup config CRUD.
  - `server-manager.ts`: Server lifecycle.
  - `snapshot-manager.ts`: Backup/Restore logic.
- `scripts/`: Bash scripts for backups, database initialization, and deployment.
- `__tests__/`: Comprehensive test suite.

## Important Implementation Details
- **TMUX**: Servers run in detached tmux sessions named `pz-{serverName}`.
- **INI Files**: Managed via `lib/ini-config-manager.ts` which preserves comments during writes.
- **Permissions**: RBAC is enforced at the API route level; there is no global middleware for auth.

## Environment Variables
```bash
DATABASE_URL=           # PostgreSQL connection string (required)
SESSION_SECRET=         # Random secret (32+ chars) for session encryption
ZOMBOID_PATH=/root/Zomboid
BACKUP_CONFIG_PATH=/root/Zomboid/backup-system/config/backup-config.json
SNAPSHOTS_PATH=/root/Zomboid/backup-system/snapshots
USE_REAL_DATABASE=true  # Set to run tests against real TimescaleDB
```
