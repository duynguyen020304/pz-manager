# hooks/ - React Query Hooks

## OVERVIEW
React Query v5 hooks for data fetching and mutations across the application.

## KEY FILES
- `use-api.ts` - 50+ hooks for servers, snapshots, stats, config, logs (667 lines)
- `use-api-users.ts` - Hooks for users, roles, current session (118 lines)
- `use-debounce.ts` - Simple debounce hook (12 lines)
- `use-schedules.ts` - Schedule-related hooks
- `use-unified-logs.ts` - Unified log query hooks
- `use-log-stream.ts` - SSE-based log streaming

## WHERE TO LOOK
| Task | Hook | Description |
|------|-------|-------------|
| Server data | `useServers`, `useServerStatus`, `useRunningServers` | Server list, status, running servers |
| Snapshots | `useSnapshots`, `useRestore`, `useRestoreJob` | Snapshot listing, restore operations, job tracking |
| Configuration | `useConfig`, `useSchedules`, `useSaveConfig` | Backup config, schedules, config updates |
| Log data | `useLogs`, `useBackupLogs`, `useChatMessages`, `usePlayerEvents`, `usePVPEvents` | All log types with filters |
| Server control | `useStartServer`, `useStopServer`, `useAbortStart` | Start/stop/abort server operations |
| Mod management | `useServerMods`, `useServerModEntries`, `useAddMod`, `useRemoveMod`, `useUpdateModOrder` | Steam Workshop mod operations |
| Sandbox vars | `useServerSandboxVars`, `useUpdateServerSandboxVars`, `useResetServerSandboxVars` | Sandbox variable editing |
| Metrics | `useServerStats`, `useLogStats`, `useWatchStatus` | System metrics and monitoring |
| Auth/tokens | `useCurrentSession`, `useUsers`, `useRoles`, `useTokens`, `useCreateToken` | User management and API tokens |
| Console | `useConsoleStream`, `useStartLogWatching`, `useStopLogWatching`, `useIngestAllLogs` | Server console streaming |

## CONVENTIONS

### Query Hooks Pattern
```typescript
export function useXxx(param: string | undefined) {
  return useQuery({
    queryKey: ['resource', param],  // Array format for cache keys
    queryFn: () => api.getResource(param),
    enabled: !!param,  // Conditional fetching
    refetchInterval: 30000  // 30s polling for real-time data
  });
}
```

### Mutation Hooks Pattern
```typescript
export function useXxxMutation() {
  const queryClient = useQueryClient();  // Always get client
  return useMutation({
    mutationFn: api.doSomething,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['related-resource'] });  // Always invalidate
    }
  });
}
```

### Streaming Hooks Pattern
```typescript
export function useConsoleStream(serverName: string) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource(`/api/servers/${name}/console`);
    eventSource.onmessage = (e) => {
      const parsed = JSON.parse(e.data);
      setLogs(prev => [...prev, parsed.data]);
    };
    eventSource.onerror = () => {
      setTimeout(connect, 3000);  // Auto-reconnect
    };
    return () => eventSource.close();  // Cleanup function
  }, [serverName]);

  return { logs, isConnected, error };
}
```

## ANTI-PATTERNS
- **Don't mix query and mutation logic** - Keep hooks focused
- **Don't add side effects** - Use useEffect only for subscriptions
- **Don't skip invalidation** - Always invalidate related queries in onSuccess
- **Don't use hardcoded intervals** - Use `refetchInterval` for consistent polling
- **Don't forget error states** - Return error from hooks for UI to display

## NOTES
- All hooks use TanStack Query v5 with queryClient from `@tanstack/react-query`
- SSE-based streaming for console logs uses native `EventSource`
- Log hooks support filters via `LogFilters` type from types/index.ts
