# app/api/ - RESTful API Routes

## OVERVIEW
43 API endpoints organized by resource with consistent error handling and auth patterns.

## STRUCTURE
```
api/
├── auth/route.ts                    # Login/logout
├── users/route.ts                   # User CRUD
├── users/[id]/route.ts               # User by ID
├── roles/route.ts                   # Role CRUD
├── roles/[id]/route.ts               # Role by ID
├── tokens/route.ts                  # API token management
├── tokens/[id]/route.ts               # Token by ID
├── servers/route.ts                  # Server CRUD
├── servers/detect/route.ts            # Auto-detect servers
├── servers/running/route.ts           # Running servers list
├── servers/status/route.ts             # All servers status
├── servers/[name]/                    # Server-specific routes (55 subdirs)
│   ├── route.ts                  # Server by name
│   ├── status/route.ts            # Server status
│   ├── start/route.ts             # Start server
│   ├── stop/route.ts              # Stop server
│   ├── abort/route.ts             # Abort start
│   ├── config/route.ts            # Server config
│   ├── ini/route.ts              # Server INI file
│   ├── sandbox-vars/route.ts       # Sandbox variables
│   ├── snapshots/route.ts          # Snapshot list
│   ├── restore/route.ts           # Start restore
│   ├── stats/route.ts             # Server stats
│   ├── console/route.ts           # Console streaming
│   ├── mods/route.ts              # Mod management
│   └── mods/download/              # Download mod
├── snapshots/route.ts                # Global snapshot operations
├── schedules/route.ts                # Schedule CRUD
├── schedules/monitor/               # Monitor schedules
│   ├── start/route.ts             # Start monitoring
│   └── [name]/                  # Schedule-specific
│       ├── route.ts              # Schedule by name
│       ├── status/route.ts          # Schedule status
│       └── trigger/route.ts         # Trigger backup
├── jobs/[id]/route.ts                # Job status tracking
├── logs/                            # Log operations
│   ├── backup/route.ts            # Backup logs
│   ├── player/route.ts            # Player events
│   ├── server/route.ts            # Server events
│   ├── chat/route.ts              # Chat messages
│   ├── pvp/route.ts              # PvP events
│   ├── perks/route.ts             # Skill progression
│   ├── stats/route.ts             # Log statistics
│   ├── ingest/route.ts           # Bulk log ingestion
│   └── stream/route.ts            # SSE log streaming
├── install/route.ts                  # Workshop installation
├── installations/route.ts               # Installation list
├── metrics/                          # System metrics
│   ├── history/route.ts           # Metrics history
│   └── spikes/route.ts            # Metrics spikes
├── sessions/route.ts                # Active sessions
├── config/route.ts                  # Backup config
└── audit-logs/route.ts               # Audit trail
```

## WHERE TO LOOK
| Task | Route | HTTP Method |
|------|--------|--------------|
| Login/Logout | `api/auth/route.ts` | POST, DELETE |
| User CRUD | `api/users/route.ts`, `api/users/[id]/route.ts` | GET, POST, PUT, DELETE |
| Role CRUD | `api/roles/route.ts`, `api/roles/[id]/route.ts` | GET, POST, PUT, DELETE |
| API Tokens | `api/tokens/route.ts`, `api/tokens/[id]/route.ts` | GET, POST, PUT, DELETE |
| Server lifecycle | `api/servers/[name]/start/route.ts`, `api/servers/[name]/stop/route.ts` | POST |
| Server config | `api/servers/[name]/config/route.ts`, `api/servers/[name]/sandbox-vars/route.ts` | GET, PATCH |
| Restore operations | `api/servers/[name]/restore/route.ts` | POST |
| Schedule management | `api/schedules/route.ts`, `api/schedules/[name]/route.ts` | GET, POST, PATCH |
| Log ingestion | `api/logs/*/route.ts` | GET (query), POST (ingest) |
| Metrics | `api/metrics/*/route.ts` | GET |

## CONVENTIONS

### Route Pattern
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);  // First line for protected routes

    const data = await fetchData();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Operation failed:', { context }, error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
```

### Auth Middleware
```typescript
// Session-based auth (for browsers)
await requireAuth(request);

// API token auth (for scripts/external tools)
// Handled automatically by requireAuth via Bearer header
```

### Response Format
```typescript
// Always use ApiResponse<T> type
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### Dynamic Routes
```typescript
// Use [param] for dynamic segments
app/api/servers/[name]/route.ts
// Access via: request.params.name
```

### Error Handling
- **Try-catch** always around route handler
- **Console.error** with context object: `{ userId, serverName, etc. }`
- **Type guards**: `error instanceof Error` check
- **Status codes**: 200 for success, 500 for server errors, 401/403 for auth

## ANTI-PATTERNS
- **Don't skip auth** - Always `await requireAuth(request)` as first line
- **Don't throw raw errors** - Wrap in user-friendly messages
- **Don't log sensitive data** - Never log passwords, tokens, or secrets
- **Don't bypass fetchApi** - For external calls, use the wrapper
- **Don't ignore validation** - Validate request bodies (manual validation currently)
- **Don't use sync I/O** - All file operations use `fs/promises`

## NOTES
- Response headers: `Cache-Control: no-store, max-age=0` on all API routes
- Resource-based organization (servers, users, roles, etc.)
- Deep nesting up to 6 levels: `api/servers/[name]/mods/download/`
- Console streaming uses SSE (Server-Sent Events)
- No Zod validation currently - manual validation in route handlers
