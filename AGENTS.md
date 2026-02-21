# AGENTS.md

Guidance for agentic coding agents working with this Zomboid Server Manager web application.

## Build/Lint/Test Commands

```bash
# Development & Production
npm run dev      # Dev server (0.0.0.0:3001)
npm run build    # Production build
npm start        # Production server (127.0.0.1:3000)

# Linting
npm run lint     # Run ESLint (flat config, Next.js rules)

# Testing
npm test         # Tests (watch mode)
npm run test:run # Tests (CI mode - single run)
npm run test:ui  # Tests with Vitest UI
npm run test:coverage  # Tests with coverage

# Single test commands
npx vitest run __tests__/unit/lib/user-manager.test.ts  # Single test file
npx vitest run --grep "should create user"  # Tests matching pattern

# Database (TimescaleDB via Docker)
npm run db:start    # Start TimescaleDB container
docker-compose up -d
docker-compose down  # Stop container
npm run db:reset    # Reset database volumes only (down -v + up -d, NO table creation)
npm run db:migrate  # Run all migrations (create tables + seed admin user)
npm run db:seed     # Seed database
```

## Project Stack

- **Framework**: Next.js 16.1.6 with App Router
- **Language**: TypeScript 5 (strict mode, ES2017 target)
- **UI**: React 19, Tailwind CSS v4 with `@import "tailwindcss"` and `@theme inline`
- **State**: TanStack Query v5 (React Query)
- **Database**: TimescaleDB (PostgreSQL), pg for client
- **Auth**: Session-based with bcryptjs, HTTP-only cookies
- **Testing**: Vitest v3 with jsdom (single-threaded pool), @testing-library/react, pg-mem

## Code Style Guidelines

### TypeScript

- Strict mode enabled - always define explicit types
- Path alias: `@/` for all imports (resolved to `./`)
- Avoid `any`; use `unknown` with type guards when needed
- No unused variables (prefix with `_` to ignore: `_unusedParam`)
- Target: ES2017, module: esnext, moduleResolution: bundler
- JSX: react-jsx transform

### Import Order

1. External dependencies (`@tanstack/react-query`)
2. Next.js built-ins (`next/server`, `next/font`)
3. Internal types (`@/types`)
4. Internal components/hooks/lib (`@/components`, `@/hooks`, `@/lib`)

Example:
```typescript
import { useQuery } from '@tanstack/react-query';
import { NextRequest, NextResponse } from 'next/server';
import { Server } from '@/types';
import { Button } from '@/components/ui/button';
import { getServers } from '@/lib/config-manager';
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `snapshot-manager.ts` |
| Components | PascalCase | `ServerCard` |
| Functions | camelCase | `getServers` |
| Types/Interfaces | PascalCase | `Server`, `UserWithRole` |
| Constants | UPPER_SNAKE | `SAVES_PATH`, `API_BASE` |
| Hooks | camelCase + 'use' prefix | `useServers`, `useQueryClient` |
| API functions | camelCase descriptive | `getServerStats`, `createUser` |

### React Components

- Functional components with hooks only
- Add `'use client'` for client components (no server components)
- Destructure props, define interfaces before component
- Props interface named `[Component]Props`

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

- Return consistent `ApiResponse<T>` format: `{ success: boolean, data?: T, error?: string }`
- Log errors with context: `console.error('Failed:', { userId }, error)`
- Use type guards: `error instanceof Error`
- Validate request body with manual validation (no Zod currently)
- Use `requireAuth(request)` for protected routes

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
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

### React Query (TanStack Query v5)

- Query keys as arrays: `['servers']`, `['snapshots', serverName]`
- Use `enabled: !!serverName` for conditional fetching
- Invalidate queries after mutations using `queryClient.invalidateQueries()`
- Use `useMutation` for POST/PUT/DELETE operations

```typescript
export function useSnapshots(serverName: string, schedule?: string) {
  return useQuery({
    queryKey: ['snapshots', serverName, schedule],
    queryFn: () => api.getSnapshots(serverName, schedule),
    enabled: !!serverName
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

### Tailwind CSS v4

- Use `@import "tailwindcss"` in globals.css (not directives)
- Use `@theme inline` for custom theme variables
- Use semantic colors: `bg-card`, `text-foreground`, `border-border`
- Custom CSS variables in `:root` for theming
- Animations defined in CSS with `@keyframes`

```css
@import "tailwindcss";

:root {
  --background: #0b0e14;
  --foreground: #f1f5f9;
  --card: #161b22;
  --border: #30363d;
}

@theme inline {
  --color-background: var(--background);
  --color-card: var(--card);
  --color-border: var(--border);
}
```

### API Client (`lib/api.ts`)

- Use `fetchApi<T>` helper for all API calls
- Include `credentials: 'include'` for auth cookies
- Throw error when `!data.success`
- Encode URI components in URLs

```typescript
async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers }
  });
  const data: ApiResponse<T> = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Unknown error');
  }
  return data.data as T;
}
```

### Testing Guidelines

- Place tests in `__tests__/unit/` or `__tests__/integration/`
- Use `@testing-library/react` for component tests
- Mock external dependencies with `vi.mock()`
- Vitest runs in jsdom, single-threaded mode (`poolOptions: { threads: { singleThread: true } }`)
- Uses pg-mem for in-memory DB testing by default
- Set `USE_REAL_DATABASE=true` for integration tests against real TimescaleDB

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/api', () => ({ fetchApi: vi.fn() }));

describe('Component', () => {
  beforeEach(() => {
    // Reset handled in global setup or mock reset
  });

  it('renders correctly', () => {
    render(<Component />);
    expect(screen.getByText('Expected')).toBeInTheDocument();
  });
});
```

### Error Handling

- Always use try-catch in API routes
- Log errors with context for debugging
- Return user-friendly error messages
- Use proper HTTP status codes

```typescript
try {
  // operation
} catch (error) {
  console.error('Operation failed:', { context }, error);
  const message = error instanceof Error ? error.message : 'Operation failed';
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}
```

### Database Access

- Use `lib/db.ts` for database connections
- Pool is managed globally with test environment detection
- For tests, database is automatically mocked with pg-mem unless `USE_REAL_DATABASE=true`

## File Structure

```
app/                    # Next.js App Router
├── (authenticated)/    # Protected pages (dashboard, servers, backups, etc.)
├── api/                # API routes (RESTful)
├── schedules/          # Public page
components/             # React components
├── providers/          # React context providers
├── servers/            # Server-related components
├── ui/                 # Reusable UI components
├── accounts/           # User management components
├── roles/              # Role management components
├── logs/               # Log viewer components
├── rollback/           # Rollback wizard components
hooks/                  # React Query hooks (use-api.ts, use-api-*.ts)
lib/                    # Utilities
├── api.ts              # API client functions
├── auth.ts             # Authentication helpers
├── db.ts               # Database connection
├── paths.ts            # Path constants
├── parsers/            # Log parsers
types/                  # TypeScript definitions (index.ts)
__tests__/              # Test files
├── unit/               # Unit tests
├── integration/        # Integration tests
├── setup/              # Test setup (setup.ts, test-db.ts)
├── mocks/              # Test mocks
```

## Environment Variables

```bash
DATABASE_URL=           # PostgreSQL connection string (required)
SESSION_SECRET=         # Random secret (32+ chars) for session encryption
ZOMBOID_PATH=/root/Zomboid
BACKUP_CONFIG_PATH=/root/Zomboid/backup-system/config/backup-config.json
SNAPSHOTS_PATH=/root/Zomboid/backup-system/snapshots
USE_REAL_DATABASE=true  # Set to run tests against real TimescaleDB
```

**Note:** Admin authentication is now database-backed. Use `./scripts/reset-superadmin.sh -p` to create or reset the admin user.

## Key Technical Details

- Dev server: port 3001 (0.0.0.0) | Prod: port 3000 (127.0.0.1)
- Always run `npm run lint` after changes
- Dual theme support (light and dark mode)
- Session auth with HTTP-only cookies
- Font: Inter (sans), JetBrains Mono (mono)
- No emojis in code files unless explicitly requested

## ESLint Configuration

Flat config using `eslint.config.mjs` with Next.js core-web-vitals and typescript rules.
Special rules:
- `@typescript-eslint/no-unused-vars`: error with `^_` ignore pattern for args and vars
