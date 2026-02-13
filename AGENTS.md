# AGENTS.md

Guidance for agentic coding agents working with this Zomboid Server Manager web application.

## Build/Lint/Test Commands

```bash
# Development server (binds to 0.0.0.0:3001)
npm run dev

# Production build
npm run build

# Start production server (binds to 127.0.0.1)
npm start

# Run ESLint on all files
npm run lint

# Run ESLint on specific file
npx eslint app/api/servers/route.ts

# Run tests (watch mode)
npm test

# Run tests once (CI mode)
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run a single test file
npx vitest run __tests__/unit/lib/user-manager.test.ts

# Run tests matching a pattern
npx vitest run --grep "user manager"

# Database commands
npm run db:start    # Start TimescaleDB container
npm run db:stop     # Stop container
npm run db:reset    # Reset database
npm run db:migrate  # Run migrations
```

## Project Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5 (strict mode)
- **UI**: React 19, Tailwind CSS v4
- **State**: TanStack Query (React Query) v5
- **Database**: TimescaleDB (PostgreSQL)
- **Auth**: Session-based with bcryptjs
- **Testing**: Vitest with jsdom

## Code Style Guidelines

### TypeScript
- Strict mode enabled - always define explicit types
- Target: ES2017, Module: ESNext
- Path alias: `@/` for all imports
- Avoid `any`; use `unknown` with type guards
- No unused variables (prefix with `_` to ignore: `_unusedParam`)

### Import Order
```typescript
// 1. External dependencies
import { useQuery, useMutation } from '@tanstack/react-query';

// 2. Next.js built-ins
import { NextRequest, NextResponse } from 'next/server';

// 3. Internal types
import { Server, ApiResponse } from '@/types';

// 4. Internal components/hooks/lib
import { Sidebar } from '@/components/sidebar';
import { useServers } from '@/hooks/use-api';
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `snapshot-manager.ts` |
| Components | PascalCase | `ServerCard` |
| Functions | camelCase | `getServers` |
| Types/Interfaces | PascalCase | `Server` |
| Constants | UPPER_SNAKE | `SAVES_PATH` |
| Hooks | camelCase + 'use' prefix | `useServers` |

### React Components
- Functional components with hooks only
- Add `'use client'` for client components
- Destructure props, define interfaces before component

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
- Return consistent `ApiResponse<T>` format
- Log errors with context using console.error
- Use type guards for error messages

```typescript
export async function GET() {
  try {
    const data = await fetchData();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to fetch:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
```

### React Query
- Query keys as arrays: `['servers']`, `['snapshots', serverName]`
- Use `enabled: !!serverName` for conditional fetching
- Invalidate queries after mutations

```typescript
export function useServers() {
  return useQuery({ queryKey: ['servers'], queryFn: api.getServers });
}
```

### Tailwind CSS
- Use semantic color variables: `bg-card`, `text-foreground`, `border-border`
- Tailwind v4 uses `@import "tailwindcss"` in CSS

```tsx
<div className="bg-card rounded-lg border border-border p-6">
  <h1 className="text-2xl font-bold text-foreground">Title</h1>
</div>
```

### API Client (`lib/api.ts`)
- Use `fetchApi<T>` helper for all API calls
- Include `credentials: 'include'` for auth
- Throw error when `!data.success`

## File Structure

```
app/                    # Next.js App Router
├── (authenticated)/    # Protected pages
│   ├── dashboard/
│   ├── servers/
│   ├── backups/
│   ├── rollback/
│   ├── settings/
│   └── logs/
├── api/                # API routes
├── schedules/          # Public page
├── globals.css
components/             # React components
├── providers/
├── servers/
├── rollback/
└── ui/
hooks/                  # React Query hooks
lib/                    # Utilities (api, auth, server-manager, etc.)
types/                  # TypeScript definitions
public/
```

## Environment Variables

```bash
ADMIN_PASSWORD_HASH=          # bcrypt hash
SESSION_SECRET=               # Random secret (32+ chars)
ZOMBOID_PATH=/root/Zomboid
BACKUP_CONFIG_PATH=/root/Zomboid/backup-system/config/backup-config.json
SNAPSHOTS_PATH=/root/Zomboid/backup-system/snapshots
```

## Key Technical Details

- Dev server: port 3001 (0.0.0.0) | Prod: port 3000 (127.0.0.1)
- Vitest with jsdom environment, single-threaded tests
- Always run `npm run lint` after changes
- Dark theme only
- Session auth with HTTP-only cookies
