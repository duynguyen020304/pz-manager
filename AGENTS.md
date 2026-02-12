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

# Run ESLint
npm run lint

# Run lint on specific file
npx eslint app/api/servers/route.ts

# No test framework configured
```

## Project Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5 (strict mode)
- **UI**: React 19, Tailwind CSS v4
- **State**: TanStack Query (React Query) v5
- **Auth**: Session-based with bcryptjs

## Code Style

### TypeScript
- Strict mode enabled - always define types explicitly
- Target: ES2017, Module: ESNext
- Path alias: `@/` for all imports
- Avoid `any`; use `unknown` with type guards

### Import Order
```typescript
// 1. External dependencies
import { useQuery } from '@tanstack/react-query';
import { NextRequest, NextResponse } from 'next/server';

// 2. Next.js built-ins
import Link from 'next/link';
import { Metadata } from 'next';

// 3. Internal imports
import { Server, ApiResponse } from '@/types';
import { Sidebar } from '@/components/sidebar';
import { useServers } from '@/hooks/use-api';
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `snapshot-manager.ts` |
| Components | PascalCase | `Sidebar`, `StatCard` |
| Functions | camelCase | `getServers`, `useQuery` |
| Types/Interfaces | PascalCase | `Server`, `BackupConfig` |
| Constants | UPPERCASE | `API_BASE`, `SAVES_PATH` |

### React Components
- Functional components with hooks
- Add `'use client'` for client components
- Destructure props in parameters
- Define prop interfaces before components

```typescript
'use client';

interface Props {
  title: string;
  value: string | number;
  loading?: boolean;
}

export function StatCard({ title, value, loading }: Props) {
  const [state, setState] = useState<string>('');
  return <div>{value}</div>;
}
```

### API Routes Pattern
- Use `NextRequest`/`NextResponse`
- Return `ApiResponse<T>`: `{ success: boolean, data?: T, error?: string }`
- Log errors with context, use type guards for messages

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
- Use semantic colors from globals.css
- Prefer `bg-card`, `text-foreground`, `border-border`
- Tailwind v4 uses `@import "tailwindcss"` (not @tailwind directives)

```tsx
<div className="bg-card rounded-lg border border-border p-6">
  <h1 className="text-2xl font-bold text-foreground">Title</h1>
</div>
```

### API Client (`lib/api.ts`)
- Use `fetchApi<T>` helper for all calls
- Include `credentials: 'include'` for auth
- Throw when `!data.success`

## File Structure

```
app/                   # Next.js App Router
├── api/              # API routes
├── (authenticated)/  # Protected pages
├── layout.tsx        # Root layout
└── globals.css       # CSS variables & Tailwind
components/           # React components
├── providers/        # Context providers
└── *.tsx            # UI components
hooks/                # React Query hooks
lib/                  # Utilities
├── api.ts           # API client
├── auth.ts          # Authentication
└── *-manager.ts     # Domain managers
types/                # TypeScript definitions
└── index.ts         # All interfaces
```

## Environment Variables

Required in `.env.local`:
```bash
ADMIN_PASSWORD_HASH=          # bcrypt hash
SESSION_SECRET=               # Random secret
ZOMBOID_PATH=/root/Zomboid
BACKUP_CONFIG_PATH=/root/Zomboid/backup-system/config/backup-config.json
SNAPSHOTS_PATH=/root/Zomboid/backup-system/snapshots
```

## Key Notes

- Application runs on port 3001 in development
- Requires read/write access to Zomboid backup system
- Next.js config: `serverExternalPackages: ['bcryptjs']`
- Path mapping: `"@/*": ["./*"]` in tsconfig.json
- No test framework currently configured
- Always run `npm run lint` after making changes
