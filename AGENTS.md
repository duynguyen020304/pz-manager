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
npx eslint components/ui/button.tsx

# No test framework configured - do not add tests
```

## Project Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5 (strict mode)
- **UI**: React 19, Tailwind CSS v4
- **State**: TanStack Query (React Query) v5
- **Auth**: Session-based with bcryptjs
- **Package Manager**: npm

## Code Style Guidelines

### TypeScript
- Strict mode enabled - always define explicit types
- Target: ES2017, Module: ESNext
- Path alias: `@/` for all imports
- Avoid `any`; use `unknown` with type guards
- No unused variables or parameters

### Import Order
```typescript
// 1. External dependencies (React, TanStack Query)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';

// 2. Next.js built-ins
import { NextRequest, NextResponse } from 'next/server';
import Link from 'next/link';

// 3. Internal types
import { Server, ApiResponse } from '@/types';

// 4. Internal components/hooks/lib
import { Sidebar } from '@/components/sidebar';
import { useServers } from '@/hooks/use-api';
import * as api from '@/lib/api';
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `snapshot-manager.ts` |
| Components | PascalCase | `ServerCard`, `RollbackModal` |
| Functions | camelCase | `getServers`, `useQuery` |
| Types/Interfaces | PascalCase | `Server`, `BackupConfig` |
| Constants | UPPER_SNAKE | `SAVES_PATH`, `API_BASE` |
| Hooks | camelCase starting with 'use' | `useServers`, `useMutation` |

### React Components
- Functional components with hooks only
- Add `'use client'` directive for client components
- Destructure props in function parameters
- Define interfaces before components
- Use semantic Tailwind classes

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

### API Routes Pattern
- Use `NextRequest`/`NextResponse` from next/server
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
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
```

### React Query Hooks
- Query keys as arrays: `['servers']`, `['snapshots', serverName]`
- Use `enabled: !!serverName` for conditional fetching
- Invalidate queries after mutations
- Use `refetchInterval` for polling

```typescript
export function useServers() {
  return useQuery({ queryKey: ['servers'], queryFn: api.getServers });
}

export function useAddServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.addServer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['servers'] })
  });
}
```

### Tailwind CSS
- Use semantic color variables from globals.css
- Prefer: `bg-card`, `text-foreground`, `border-border`, `text-muted-foreground`
- Tailwind v4 uses `@import "tailwindcss"` (not @tailwind directives)
- Use `@apply` in CSS files for reusable utilities

```tsx
<div className="bg-card rounded-lg border border-border p-6">
  <h1 className="text-2xl font-bold text-foreground">Title</h1>
  <p className="text-muted-foreground">Description</p>
</div>
```

### API Client (`lib/api.ts`)
- Use `fetchApi<T>` helper for all API calls
- Include `credentials: 'include'` for auth
- Throw error when `!data.success`
- Encode URI components in URLs

## File Structure

```
app/                          # Next.js App Router
├── (authenticated)/          # Protected pages (group route)
│   ├── dashboard/
│   ├── servers/
│   ├── backups/
│   ├── rollback/
│   ├── settings/
│   └── logs/
├── api/                      # API routes
│   ├── auth/
│   ├── servers/
│   └── config/
├── schedules/                # Public schedules page
├── layout.tsx                # Root layout
├── page.tsx                  # Login page
└── globals.css               # CSS variables & Tailwind
components/                   # React components
├── providers/                # Context providers
├── servers/                  # Server-related components
├── rollback/                 # Rollback wizard components
├── ui/                       # Reusable UI components
└── *.tsx                    # Top-level components
hooks/                        # React Query hooks
└── use-api.ts               # All API hooks
lib/                          # Utilities
├── api.ts                   # API client
├── auth.ts                  # Authentication
├── config-manager.ts        # Config operations
├── server-manager.ts        # Server operations
├── snapshot-manager.ts      # Snapshot operations
├── console-manager.ts       # Console operations
├── mod-manager.ts           # Mod operations
└── file-utils.ts           # File utilities
types/                        # TypeScript definitions
└── index.ts                # All type interfaces
public/                       # Static assets
```

## Environment Variables

Required in `.env.local`:
```bash
ADMIN_PASSWORD_HASH=          # bcrypt hash
SESSION_SECRET=               # Random secret (32+ chars)
ZOMBOID_PATH=/root/Zomboid
BACKUP_CONFIG_PATH=/root/Zomboid/backup-system/config/backup-config.json
SNAPSHOTS_PATH=/root/Zomboid/backup-system/snapshots
```

## Key Technical Details

- Development server runs on port 3001
- Production server binds to 127.0.0.1 (port 3000)
- Requires read/write access to Zomboid backup system
- Next.js config: `serverExternalPackages: ['bcryptjs']`
- Path mapping: `"@/*": ["./*"]` in tsconfig.json
- No test framework - do not add tests
- Always run `npm run lint` after making changes
- Dark theme only (defined in globals.css)
- Session-based authentication with HTTP-only cookies
