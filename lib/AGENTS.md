# lib/ - Core Utilities

Core utilities and business logic for Zomboid server management.

## Key Files

### Core
- `api.ts` - API client with `fetchApi<T>` wrapper
- `auth.ts` - Session management with HTTP-only cookies
- `db.ts` - TimescaleDB connection with pg
- `paths.ts` - Path constants

### Managers
- `config-manager.ts` - Backup config CRUD with 5s cache
- `server-manager.ts` - Server lifecycle (start/stop/status)
- `snapshot-manager.ts` - Backup browsing and restore
- `user-manager.ts` - User CRUD with bcrypt
- `role-manager.ts` - RBAC role/permission management
- `log-manager.ts` - Log reading and tail operations
- `mod-manager.ts` - Mod installation and management

### Parsers (`parsers/`)
- `base-parser.ts` - Abstract base class
- `server-log-parser.ts`, `backup-log-parser.ts`, `user-log-parser.ts`
- `chat-log-parser.ts`, `pvp-log-parser.ts`, `perk-log-parser.ts`

## Where to Look

| Task | File |
|------|------|
| Fetch server data | `api.ts` |
| Check permissions | `auth.ts` |
| Update config | `config-manager.ts` |
| Start/stop server | `server-manager.ts` |
| Restore backup | `snapshot-manager.ts` |
| Stream logs | `log-stream-manager.ts` |
| Parse PZ logs | `parsers/server-log-parser.ts` |

## Conventions

### Manager Pattern
```typescript
let configCache: BackupConfig | null = null;
export async function loadConfig(): Promise<BackupConfig> { }
```

### Parser Pattern
```typescript
export class MyLogParser extends BaseParser {
  protected parserType = 'my-log' as ParserType;
  protected getConfig() { return { name: 'my-log', filePattern: /\.txt$/ }; }
}
```

### API Client Pattern
```typescript
export async function getServers(): Promise<Server[]> {
  return fetchApi('/api/servers');  // credentials: 'include' auto-added
}
```

### Error Logging
```typescript
} catch (error) {
  console.error('Failed:', { serverName }, error);
  throw new Error(error instanceof Error ? error.message : 'Failed');
}
```

### In-Memory Stores
```typescript
const jobs = new Map<string, RestoreJob>();
```

## Anti-Patterns

- **Don't use `any`** - Strict TypeScript; use `unknown` with type guards
- **Don't throw raw errors** - Wrap in user-friendly messages
- **Don't read files synchronously** - Use `fs/promises`
- **Don't bypass fetchApi** - Always use the wrapper
