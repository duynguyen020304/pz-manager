# lib/parsers/

Log parsing utilities for Project Zomboid server logs.

## Structure

| File | Purpose |
|------|---------|
| `base-parser.ts` | Abstract `BaseParser` class, shared utilities, path configs |
| `server-log-parser.ts` | Server events: startup, shutdown, errors, performance |
| `user-log-parser.ts` | Player events: login, logout, death, kicks, bans |
| `chat-log-parser.ts` | Chat messages from all channels (Local, Global, Faction, etc.) |
| `pvp-log-parser.ts` | Combat and PvP events |
| `perk-log-parser.ts` | Player skill progression |
| `backup-log-parser.ts` | Backup/restore operations |
| `index.ts` | Public exports |

## Where to Look

| Log Type | Parser | Source File |
|----------|--------|-------------|
| Player join/leave/death | `UserLogParser` | `user.txt` |
| Chat messages | `ChatLogParser` | `chat.txt` |
| Server errors/startup | `ServerLogParser` | `DebugLog-server.txt` |
| Combat kills/hits | `PVPLogParser` | `pvp.txt` |
| Skill gains | `PerkLogParser` | `PerkLog.txt` |
| Backup operations | `BackupLogParser` | `backup.log` |

## Conventions

Extend `BaseParser` and implement `parseLine()`:

```typescript
export class MyLogParser extends BaseParser {
  readonly type: ParserType = 'mytype';

  parseLine(line: string, lineNumber: number): UnifiedLogEntry | null {
    const match = line.match(PATTERNS.myPattern);
    if (!match) return null;  // Return null for non-matching lines

    const [, timestamp, message] = match;
    const time = parsePZTimestamp(timestamp);
    if (!time) return null;

    return {
      id: this.generateId(time, this.type, lineNumber),
      time,
      source: 'mytype',
      eventType: this.determineEventType(message),
      level: 'INFO',
      message: this.formatMessage(message),
      details: { /* extra fields */ },
    };
  }
}
```

Always export from `index.ts`:

```typescript
export { MyLogParser, myLogParser } from './my-log-parser';
```
