# AGENTS.md

This file provides guidance to agentic coding agents working with this Zomboid Server Manager web application.

## Build/Lint/Test Commands

```bash
# Development server with hot reload (binds to 127.0.0.1)
npm run dev

# Production build
npm run build

# Start production server (binds to 127.0.0.1)
npm start

# Run ESLint
npm run lint

# No test framework configured - add tests if needed
```

## Project Overview

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5 (strict mode enabled)
- **UI**: React 19, Tailwind CSS v4
- **State Management**: TanStack Query (React Query) v5
- **Styling**: Tailwind CSS with CSS variables for theming

## Code Style Guidelines

### TypeScript

- **Strict mode**: Enabled - always define types explicitly
- **Target**: ES2017, Module: ESNext
- **Path aliases**: Use `@/` for imports (e.g., `@/components/sidebar`)
- **No `any`**: Avoid `any` type; use `unknown` with type guards when necessary

### Imports

```typescript
// 1. External dependencies first
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NextRequest, NextResponse } from 'next/server';

// 2. Next.js built-ins
import Link from 'next/link';
import { Metadata } from 'next';

// 3. Internal imports with @/ alias
import { Server, Snapshot, ApiResponse } from '@/types';
import { Sidebar } from '@/components/sidebar';
import { useServers, useAddServer } from '@/hooks/use-api';
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `snapshot-manager.ts`, `page.tsx` |
| Components | PascalCase | `Sidebar`, `DashboardPage`, `StatCard` |
| Functions | camelCase | `getServers`, `useQuery`, `formatTimeUntil` |
| Variables | camelCase | `serverName`, `isLoading`, `firstServer` |
| Types/Interfaces | PascalCase | `Server`, `BackupConfig`, `RestoreJob` |
| Constants | UPPERCASE | `API_BASE`, `SAVES_PATH` |

### React Components

- Use functional components with hooks
- Add `'use client'` directive for client components
- Destructure props in function parameters
- Define prop interfaces before components

```typescript
'use client';

interface Props {
  title: string;
  value: string | number;
  icon: React.ElementType;
  loading?: boolean;
}

export function MyComponent({ title, value, icon: Icon, loading }: Props) {
  const [state, setState] = useState<string>('');
  
  return <div>{value}</div>;
}
```

### API Routes

- Use typed request/response with `NextRequest`/`NextResponse`
- Return consistent `ApiResponse<T>` format: `{ success: boolean, data?: T, error?: string }`
- Handle errors with try-catch, return appropriate status codes (400 for bad input, 500 for server errors)
- Log errors with context: `console.error('Failed to add server:', error)`
- Use type guards: `const message = error instanceof Error ? error.message : 'Failed to add server'`

```typescript
export async function GET() {
  try {
    const data = await fetchData();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to fetch data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
```

### React Query Hooks

- Define query keys as arrays: `['servers']`, `['snapshots', serverName, schedule]`
- Use `enabled` option to conditionally fetch: `enabled: !!serverName`
- Use `useMutation` with `useQueryClient` for data mutations
- Invalidate related queries after mutations using `queryClient.invalidateQueries()`
- Use `refetchInterval` for polling: `refetchInterval: (query) => data?.status === 'running' ? 3000 : false`

```typescript
export function useServers() {
  return useQuery({
    queryKey: ['servers'],
    queryFn: api.getServers
  });
}

export function useAddServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.addServer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    }
  });
}
```

### Tailwind CSS

- Use semantic color names from globals.css: `bg-card`, `text-foreground`, `border-border`
- Prefer utility classes over inline styles
- Use `className` for conditional classes
- Access theme colors via CSS variables defined in globals.css

```tsx
<div className="bg-card rounded-lg border border-border p-6">
  <h1 className="text-2xl font-bold text-foreground">Title</h1>
  <p className="text-muted-foreground mt-2">Description</p>
</div>
```

### API Client (`lib/api.ts`)

- Use centralized `fetchApi<T>` helper for all API calls
- Include `credentials: 'include'` for session-based auth
- Set `Content-Type: application/json` header
- Throw errors from `fetchApi` when `!data.success`

### Environment Variables

Required in `.env.local`:
```bash
ADMIN_PASSWORD_HASH=      # bcrypt hash
SESSION_SECRET=           # Random secret
ZOMBOID_PATH=/root/Zomboid
BACKUP_CONFIG_PATH=/root/Zomboid/backup-system/config/backup-config.json
SNAPSHOTS_PATH=/root/Zomboid/backup-system/snapshots
```

## File Structure

```
app/                    # Next.js App Router
├── api/               # API routes (auth, config, servers, jobs)
├── dashboard/         # Dashboard page
├── servers/           # Server management page
├── backups/           # Backup browser page
├── rollback/          # Rollback wizard page
├── schedules/         # Schedule management page
├── settings/          # Settings page
├── logs/              # Logs page
├── layout.tsx         # Root layout with providers
├── page.tsx           # Login page
└── globals.css        # Global styles and CSS variables
components/            # React components
├── providers/         # Context providers (react-query, sidebar)
├── sidebar.tsx        # Navigation sidebar
└── top-header.tsx     # Top header component
hooks/                 # Custom React Query hooks
lib/                   # Utility functions
├── api.ts            # API client with fetchApi helper
├── auth.ts           # Authentication utilities
├── config-manager.ts # Config file operations
├── file-utils.ts     # File system utilities
└── snapshot-manager.ts # Backup operations
types/                 # TypeScript definitions
└── index.ts          # All type interfaces (Server, Snapshot, ApiResponse, etc.)
```

## Important Notes

- **No test framework** is currently configured
- Application runs on `127.0.0.1:3000` by default
- Requires read/write access to Zomboid backup system files
- Uses session-based authentication with bcrypt
- Tailwind v4 uses `@import "tailwindcss"` in CSS (not @tailwind directives)
- Path mapping: `"@/*": ["./*"]` in tsconfig.json
- Next.js config: `serverExternalPackages: ['bcryptjs']` for bcryptjs
