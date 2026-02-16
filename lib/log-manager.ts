/**
 * Log Manager
 * Handles log ingestion, database operations, and file position tracking
 */

import { query, queryOne } from './db';
import {
  createBackupParser,
  UserLogParser,
  ChatLogParser,
  PerkLogParser,
  ServerLogParser,
  PVPLogParser,
  BaseParser,
} from './parsers';
import type {
  BackupLogEntry,
  PZPlayerEvent,
  PZServerEvent,
  PZSkillSnapshot,
  PZChatMessage,
  PZPVPEvent,
  LogFilePosition,
  LogFilters,
  LogStats,
  ParserType,
  UnifiedLogEntry,
} from '@/types';
import fs from 'fs/promises';

// ============================================
// FILE POSITION TRACKING
// ============================================

export async function getFilePosition(filePath: string): Promise<LogFilePosition | null> {
  const result = await queryOne<{
    file_path: string;
    last_position: string;
    last_modified: Date;
    last_ingested: Date;
    file_size: string | null;
    checksum: string | null;
    parser_type: string;
  }>(
    `SELECT * FROM log_file_positions WHERE file_path = $1`,
    [filePath]
  );

  if (!result) return null;

  return {
    filePath: result.file_path,
    lastPosition: parseInt(result.last_position, 10),
    lastModified: result.last_modified,
    lastIngested: result.last_ingested,
    fileSize: result.file_size ? parseInt(result.file_size, 10) : undefined,
    checksum: result.checksum || undefined,
    parserType: result.parser_type,
  };
}

export async function updateFilePosition(
  filePath: string,
  position: number,
  parserType: string,
  fileSize?: number,
  checksum?: string
): Promise<void> {
  await query(
    `INSERT INTO log_file_positions (file_path, last_position, last_modified, last_ingested, file_size, checksum, parser_type)
     VALUES ($1, $2, NOW(), NOW(), $3, $4, $5)
     ON CONFLICT (file_path)
     DO UPDATE SET
       last_position = $2,
       last_modified = NOW(),
       last_ingested = NOW(),
       file_size = $3,
       checksum = $4,
       parser_type = $5`,
    [filePath, position, fileSize || null, checksum || null, parserType]
  );
}

// ============================================
// BACKUP LOGS
// ============================================

export async function insertBackupLogs(entries: BackupLogEntry[]): Promise<number> {
  if (entries.length === 0) return 0;

  let inserted = 0;
  for (const entry of entries) {
    try {
      await query(
        `INSERT INTO backup_logs (time, log_type, level, server, message, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          entry.time,
          entry.logType,
          entry.level,
          entry.server || null,
          entry.message,
          entry.details || null,
        ]
      );
      inserted++;
    } catch (error) {
      console.error('Failed to insert backup log entry:', error);
    }
  }

  return inserted;
}

export async function getBackupLogs(filters: LogFilters = {}): Promise<{ logs: BackupLogEntry[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.server) {
    conditions.push(`server = $${paramIndex++}`);
    params.push(filters.server);
  }

  if (filters.level) {
    conditions.push(`level = $${paramIndex++}`);
    params.push(filters.level.toUpperCase());
  }

  if (filters.from) {
    conditions.push(`time >= $${paramIndex++}`);
    params.push(filters.from);
  }

  if (filters.to) {
    conditions.push(`time <= $${paramIndex++}`);
    params.push(filters.to);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit || 100;
  const offset = filters.offset || 0;

  const logs = await query<{
    time: Date;
    log_type: string;
    level: string;
    server: string | null;
    message: string;
    details: Record<string, unknown> | null;
  }>(
    `SELECT * FROM backup_logs
     ${whereClause}
     ORDER BY time DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM backup_logs ${whereClause}`,
    params
  );

  return {
    logs: logs.map(log => ({
      time: log.time,
      logType: log.log_type as BackupLogEntry['logType'],
      level: log.level as BackupLogEntry['level'],
      server: log.server || undefined,
      message: log.message,
      details: log.details || undefined,
    })),
    total: parseInt(countResult?.count || '0', 10),
  };
}

// ============================================
// PLAYER EVENTS
// ============================================

export async function insertPlayerEvents(entries: PZPlayerEvent[]): Promise<number> {
  if (entries.length === 0) return 0;

  let inserted = 0;
  for (const entry of entries) {
    try {
      await query(
        `INSERT INTO pz_player_events (time, server, event_type, username, ip_address, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          entry.time,
          entry.server,
          entry.eventType,
          entry.username || null,
          entry.ipAddress || null,
          entry.details || null,
        ]
      );
      inserted++;
    } catch (error) {
      console.error('Failed to insert player event:', error);
    }
  }

  return inserted;
}

export async function getPlayerEvents(filters: LogFilters = {}): Promise<{ logs: PZPlayerEvent[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.server) {
    conditions.push(`server = $${paramIndex++}`);
    params.push(filters.server);
  }

  if (filters.eventType) {
    conditions.push(`event_type = $${paramIndex++}`);
    params.push(filters.eventType);
  }

  if (filters.username) {
    conditions.push(`username ILIKE $${paramIndex++}`);
    params.push(`%${filters.username}%`);
  }

  if (filters.from) {
    conditions.push(`time >= $${paramIndex++}`);
    params.push(filters.from);
  }

  if (filters.to) {
    conditions.push(`time <= $${paramIndex++}`);
    params.push(filters.to);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit || 100;
  const offset = filters.offset || 0;

  const logs = await query<{
    time: Date;
    server: string;
    event_type: string;
    username: string | null;
    ip_address: string | null;
    details: Record<string, unknown> | null;
  }>(
    `SELECT * FROM pz_player_events
     ${whereClause}
     ORDER BY time DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pz_player_events ${whereClause}`,
    params
  );

  return {
    logs: logs.map(log => ({
      time: log.time,
      server: log.server,
      eventType: log.event_type as PZPlayerEvent['eventType'],
      username: log.username || undefined,
      ipAddress: log.ip_address || undefined,
      details: log.details || undefined,
    })),
    total: parseInt(countResult?.count || '0', 10),
  };
}

// ============================================
// SERVER EVENTS
// ============================================

export async function insertServerEvents(entries: PZServerEvent[]): Promise<number> {
  if (entries.length === 0) return 0;

  let inserted = 0;
  for (const entry of entries) {
    try {
      await query(
        `INSERT INTO pz_server_events (time, server, event_type, category, level, message, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          entry.time,
          entry.server,
          entry.eventType,
          entry.category || null,
          entry.level || null,
          entry.message || null,
          entry.details || null,
        ]
      );
      inserted++;
    } catch (error) {
      console.error('Failed to insert server event:', error);
    }
  }

  return inserted;
}

export async function getServerEvents(filters: LogFilters = {}): Promise<{ logs: PZServerEvent[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.server) {
    conditions.push(`server = $${paramIndex++}`);
    params.push(filters.server);
  }

  if (filters.eventType) {
    conditions.push(`event_type = $${paramIndex++}`);
    params.push(filters.eventType);
  }

  if (filters.level) {
    conditions.push(`level = $${paramIndex++}`);
    params.push(filters.level.toUpperCase());
  }

  if (filters.from) {
    conditions.push(`time >= $${paramIndex++}`);
    params.push(filters.from);
  }

  if (filters.to) {
    conditions.push(`time <= $${paramIndex++}`);
    params.push(filters.to);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit || 100;
  const offset = filters.offset || 0;

  const logs = await query<{
    time: Date;
    server: string;
    event_type: string;
    category: string | null;
    level: string | null;
    message: string | null;
    details: Record<string, unknown> | null;
  }>(
    `SELECT * FROM pz_server_events
     ${whereClause}
     ORDER BY time DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pz_server_events ${whereClause}`,
    params
  );

  return {
    logs: logs.map(log => ({
      time: log.time,
      server: log.server,
      eventType: log.event_type as PZServerEvent['eventType'],
      category: log.category || undefined,
      level: log.level as PZServerEvent['level'] || undefined,
      message: log.message || undefined,
      details: log.details || undefined,
    })),
    total: parseInt(countResult?.count || '0', 10),
  };
}

// ============================================
// SKILL SNAPSHOTS
// ============================================

export async function insertSkillSnapshots(entries: PZSkillSnapshot[]): Promise<number> {
  if (entries.length === 0) return 0;

  let inserted = 0;
  for (const entry of entries) {
    try {
      await query(
        `INSERT INTO pz_skill_snapshots (time, server, username, player_id, hours_survived, skills)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          entry.time,
          entry.server,
          entry.username,
          entry.playerId || null,
          entry.hoursSurvived,
          entry.skills,
        ]
      );
      inserted++;
    } catch (error) {
      console.error('Failed to insert skill snapshot:', error);
    }
  }

  return inserted;
}

export async function getSkillSnapshots(
  username: string,
  server?: string,
  limit: number = 50
): Promise<PZSkillSnapshot[]> {
  const conditions: string[] = ['username = $1'];
  const params: unknown[] = [username];
  let paramIndex = 2;

  if (server) {
    conditions.push(`server = $${paramIndex++}`);
    params.push(server);
  }

  const logs = await query<{
    time: Date;
    server: string;
    username: string;
    player_id: number | null;
    hours_survived: number;
    skills: Record<string, number>;
  }>(
    `SELECT * FROM pz_skill_snapshots
     WHERE ${conditions.join(' AND ')}
     ORDER BY time DESC
     LIMIT $${paramIndex}`,
    [...params, limit]
  );

  return logs.map(log => ({
    time: log.time,
    server: log.server,
    username: log.username,
    playerId: log.player_id || undefined,
    hoursSurvived: log.hours_survived,
    skills: log.skills,
  }));
}

// ============================================
// CHAT MESSAGES
// ============================================

export async function insertChatMessages(entries: PZChatMessage[]): Promise<number> {
  if (entries.length === 0) return 0;

  let inserted = 0;
  for (const entry of entries) {
    try {
      await query(
        `INSERT INTO pz_chat_messages (time, server, username, chat_type, message, coordinates)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          entry.time,
          entry.server,
          entry.username,
          entry.chatType,
          entry.message,
          entry.coordinates || null,
        ]
      );
      inserted++;
    } catch (error) {
      console.error('Failed to insert chat message:', error);
    }
  }

  return inserted;
}

export async function getChatMessages(filters: LogFilters = {}): Promise<{ logs: PZChatMessage[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.server) {
    conditions.push(`server = $${paramIndex++}`);
    params.push(filters.server);
  }

  if (filters.username) {
    conditions.push(`username ILIKE $${paramIndex++}`);
    params.push(`%${filters.username}%`);
  }

  if (filters.from) {
    conditions.push(`time >= $${paramIndex++}`);
    params.push(filters.from);
  }

  if (filters.to) {
    conditions.push(`time <= $${paramIndex++}`);
    params.push(filters.to);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit || 100;
  const offset = filters.offset || 0;

  const logs = await query<{
    time: Date;
    server: string;
    username: string;
    chat_type: string;
    message: string;
    coordinates: { x: number; y: number; z: number } | null;
  }>(
    `SELECT * FROM pz_chat_messages
     ${whereClause}
     ORDER BY time DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pz_chat_messages ${whereClause}`,
    params
  );

  return {
    logs: logs.map(log => ({
      time: log.time,
      server: log.server,
      username: log.username,
      chatType: log.chat_type,
      message: log.message,
      coordinates: log.coordinates || undefined,
    })),
    total: parseInt(countResult?.count || '0', 10),
  };
}

// ============================================
// PVP EVENTS
// ============================================

export async function insertPVPEvents(entries: PZPVPEvent[]): Promise<number> {
  if (entries.length === 0) return 0;

  let inserted = 0;
  for (const entry of entries) {
    try {
      await query(
        `INSERT INTO pz_pvp_events (time, server, event_type, attacker, victim, weapon, damage, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          entry.time,
          entry.server,
          entry.eventType,
          entry.attacker || null,
          entry.victim || null,
          entry.weapon || null,
          entry.damage || null,
          entry.details || null,
        ]
      );
      inserted++;
    } catch (error) {
      console.error('Failed to insert PVP event:', error);
    }
  }

  return inserted;
}

export async function getPVPEvents(filters: LogFilters = {}): Promise<{ logs: PZPVPEvent[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.server) {
    conditions.push(`server = $${paramIndex++}`);
    params.push(filters.server);
  }

  if (filters.eventType) {
    conditions.push(`event_type = $${paramIndex++}`);
    params.push(filters.eventType);
  }

  if (filters.username) {
    conditions.push(`(attacker ILIKE $${paramIndex} OR victim ILIKE $${paramIndex})`);
    params.push(`%${filters.username}%`);
    paramIndex++;
  }

  if (filters.from) {
    conditions.push(`time >= $${paramIndex++}`);
    params.push(filters.from);
  }

  if (filters.to) {
    conditions.push(`time <= $${paramIndex++}`);
    params.push(filters.to);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit || 100;
  const offset = filters.offset || 0;

  const logs = await query<{
    time: Date;
    server: string;
    event_type: string;
    attacker: string | null;
    victim: string | null;
    weapon: string | null;
    damage: number | null;
    details: Record<string, unknown> | null;
  }>(
    `SELECT * FROM pz_pvp_events
     ${whereClause}
     ORDER BY time DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pz_pvp_events ${whereClause}`,
    params
  );

  return {
    logs: logs.map(log => ({
      time: log.time,
      server: log.server,
      eventType: log.event_type as PZPVPEvent['eventType'],
      attacker: log.attacker || undefined,
      victim: log.victim || undefined,
      weapon: log.weapon || undefined,
      damage: log.damage || undefined,
      details: log.details || undefined,
    })),
    total: parseInt(countResult?.count || '0', 10),
  };
}

// ============================================
// UNIFIED LOG QUERY
// ============================================

export async function getUnifiedLogs(filters: LogFilters = {}): Promise<{ logs: UnifiedLogEntry[]; total: number }> {
  // Query based on source
  const source = filters.source || 'backup';

  switch (source) {
    case 'backup':
      const backupResult = await getBackupLogs(filters);
      return {
        logs: backupResult.logs.map(log => ({
          id: `backup-${log.time.getTime()}`,
          time: log.time,
          source: 'backup' as const,
          server: log.server,
          eventType: log.logType,
          level: log.level,
          message: log.message,
          details: log.details,
        })),
        total: backupResult.total,
      };

    case 'player':
      const playerResult = await getPlayerEvents(filters);
      return {
        logs: playerResult.logs.map(log => ({
          id: `player-${log.time.getTime()}`,
          time: log.time,
          source: 'player' as const,
          server: log.server,
          username: log.username,
          eventType: log.eventType,
          level: 'INFO' as const,
          message: `${log.eventType}: ${log.username || 'Unknown'}`,
          details: log.details,
        })),
        total: playerResult.total,
      };

    case 'server':
      const serverResult = await getServerEvents(filters);
      return {
        logs: serverResult.logs.map(log => ({
          id: `server-${log.time.getTime()}`,
          time: log.time,
          source: 'server' as const,
          server: log.server,
          eventType: log.eventType,
          level: (log.level === 'LOG' ? 'INFO' : log.level || 'INFO') as 'INFO' | 'ERROR' | 'WARN' | 'DEBUG',
          message: log.message || '',
          details: log.details,
        })),
        total: serverResult.total,
      };

    case 'chat':
      const chatResult = await getChatMessages(filters);
      return {
        logs: chatResult.logs.map(log => ({
          id: `chat-${log.time.getTime()}`,
          time: log.time,
          source: 'chat' as const,
          server: log.server,
          username: log.username,
          eventType: 'chat',
          level: 'INFO' as const,
          message: `[${log.chatType}] ${log.username}: ${log.message}`,
          details: { chatType: log.chatType, coordinates: log.coordinates },
        })),
        total: chatResult.total,
      };

    case 'pvp':
      const pvpResult = await getPVPEvents(filters);
      return {
        logs: pvpResult.logs.map(log => ({
          id: `pvp-${log.time.getTime()}`,
          time: log.time,
          source: 'pvp' as const,
          server: log.server,
          username: log.attacker || log.victim,
          eventType: log.eventType,
          level: 'WARN' as const,
          message: `${log.attacker || 'Unknown'} -> ${log.victim || 'Unknown'} (${log.eventType})`,
          details: log.details,
        })),
        total: pvpResult.total,
      };

    default:
      return { logs: [], total: 0 };
  }
}

// ============================================
// UNIFIED LOG QUERY WITH SINCE (for streaming)
// ============================================

const TYPE_TO_TABLE: Record<string, string> = {
  player: 'pz_player_events',
  chat: 'pz_chat_messages',
  server: 'pz_server_events',
  pvp: 'pz_pvp_events',
  skill: 'pz_skill_snapshots',
};

export async function getUnifiedLogsSince(
  server: string,
  types: string[] = [],
  since?: Date,
  limit: number = 100
): Promise<UnifiedLogEntry[]> {
  const selectedTypes = types.length > 0 ? types : Object.keys(TYPE_TO_TABLE);
  const queries: string[] = [];
  const params: (string | Date | number)[] = [server];
  let paramIndex = 2;

  for (const type of selectedTypes) {
    const table = TYPE_TO_TABLE[type];
    if (!table) continue;

    const source = type;

    queries.push(`
      SELECT 
        time,
        '${source}' as source,
        server,
        username,
        event_type as eventType,
        level,
        message,
        details
      FROM ${table}
      WHERE server = $1
      ${since ? `AND time > $${paramIndex++}` : ''}
    `);

    if (since) params.push(since);
  }

  if (queries.length === 0) return [];

  const unionQuery = queries.join(' UNION ALL ') + ` ORDER BY time DESC LIMIT $${paramIndex}`;
  params.push(limit);

  try {
    const result = await query<{
      time: Date;
      source: string;
      server: string;
      username: string | null;
      eventType: string;
      level: string | null;
      message: string | null;
      details: Record<string, unknown> | null;
    }>(unionQuery, params);

    return result.map(row => ({
      id: `${row.source}-${row.time.getTime()}-${Math.random().toString(36).slice(2, 9)}`,
      time: row.time,
      source: row.source as UnifiedLogEntry['source'],
      server: row.server,
      username: row.username || undefined,
      eventType: row.eventType,
      level: (row.level === 'LOG' ? 'INFO' : row.level as 'INFO' | 'ERROR' | 'WARN' | 'DEBUG') || 'INFO',
      message: row.message || '',
      details: row.details || undefined,
    }));
  } catch (error) {
    console.error('Failed to get unified logs since:', error);
    return [];
  }
}

// ============================================
// STATISTICS
// ============================================

export async function getLogStats(server?: string): Promise<LogStats> {
  const serverFilter = server ? `WHERE server = '${server}'` : '';

  const [backupStats, playerStats, serverEventStats, pvpStats] = await Promise.all([
    queryOne<{
      total: string;
      errors: string;
      warnings: string;
    }>(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE level = 'ERROR') as errors,
         COUNT(*) FILTER (WHERE level = 'WARN') as warnings
       FROM backup_logs ${serverFilter.replace('server', 'server')}`
    ),
    queryOne<{
      total: string;
      logins: string;
      deaths: string;
      unique_players: string;
    }>(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE event_type = 'login_success') as logins,
         COUNT(*) FILTER (WHERE event_type = 'death') as deaths,
         COUNT(DISTINCT username) as unique_players
       FROM pz_player_events ${serverFilter}`
    ),
    queryOne<{
      total: string;
      errors: string;
      warnings: string;
    }>(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE level = 'ERROR') as errors,
         COUNT(*) FILTER (WHERE level = 'WARN') as warnings
       FROM pz_server_events ${serverFilter}`
    ),
    queryOne<{
      total: string;
    }>(
      `SELECT COUNT(*) as total FROM pz_pvp_events ${serverFilter}`
    ),
  ]);

  // Get chat count
  const chatStats = await queryOne<{ total: string }>(
    `SELECT COUNT(*) as total FROM pz_chat_messages ${serverFilter}`
  );

  return {
    totalEvents: parseInt(backupStats?.total || '0', 10) +
                 parseInt(playerStats?.total || '0', 10) +
                 parseInt(serverEventStats?.total || '0', 10) +
                 parseInt(pvpStats?.total || '0', 10),
    uniquePlayers: parseInt(playerStats?.unique_players || '0', 10),
    errorCount: parseInt(backupStats?.errors || '0', 10) +
                parseInt(serverEventStats?.errors || '0', 10),
    warningCount: parseInt(backupStats?.warnings || '0', 10) +
                  parseInt(serverEventStats?.warnings || '0', 10),
    loginCount: parseInt(playerStats?.logins || '0', 10),
    deathCount: parseInt(playerStats?.deaths || '0', 10),
    chatCount: parseInt(chatStats?.total || '0', 10),
  };
}

// ============================================
// FILE INGESTION
// ============================================

export async function parseAndIngestFile(
  filePath: string,
  parserType: ParserType,
  serverName?: string
): Promise<{ entriesAdded: number; bytesProcessed: number; errors: string[] }> {
  const errors: string[] = [];
  let entriesAdded = 0;
  let bytesProcessed = 0;

  try {
    // Check if file exists
    const stats = await fs.stat(filePath).catch(() => null);
    if (!stats) {
      return { entriesAdded: 0, bytesProcessed: 0, errors: [`File not found: ${filePath}`] };
    }

    // Get last position
    const filePosition = await getFilePosition(filePath);
    const startPosition = filePosition?.lastPosition || 0;

    // If file has shrunk, start from beginning (log rotation)
    const actualStart = stats.size < startPosition ? 0 : startPosition;

    // Read new content
    const fileHandle = await fs.open(filePath, 'r');
    try {
      const buffer = Buffer.alloc(stats.size - actualStart);
      await fileHandle.read(buffer, 0, buffer.length, actualStart);
      const content = buffer.toString('utf-8');
      const lines = content.split('\n');

      // Select appropriate parser
      let parser: BaseParser;
      switch (parserType) {
        case 'backup':
          parser = createBackupParser('backup');
          break;
        case 'restore':
          parser = createBackupParser('restore');
          break;
        case 'user':
          parser = new UserLogParser();
          break;
        case 'chat':
          parser = new ChatLogParser();
          break;
        case 'perk':
          parser = new PerkLogParser();
          break;
        case 'server':
          parser = new ServerLogParser();
          break;
        case 'pvp':
          parser = new PVPLogParser();
          break;
        default:
          return { entriesAdded: 0, bytesProcessed: 0, errors: [`Unknown parser type: ${parserType}`] };
      }

      // Parse lines
      const result = parser.parseLines(lines, actualStart);
      bytesProcessed = result.bytesProcessed;
      errors.push(...result.errors);

      // Insert entries based on parser type
      if (result.entries.length > 0) {
        switch (parserType) {
          case 'backup':
          case 'restore':
            entriesAdded = await insertBackupLogs(
              result.entries.map(e => ({
                time: e.time,
                logType: (e.details?.logType as BackupLogEntry['logType']) || parserType,
                level: e.level as BackupLogEntry['level'],
                server: e.server,
                message: e.message,
                details: e.details,
              }))
            );
            break;

          case 'user':
            entriesAdded = await insertPlayerEvents(
              result.entries.map(e => ({
                time: e.time,
                server: serverName || e.server || 'unknown',
                eventType: e.eventType as PZPlayerEvent['eventType'],
                username: e.username,
                ipAddress: e.details?.ipAddress as string,
                details: e.details,
              }))
            );
            break;

          case 'chat':
            entriesAdded = await insertChatMessages(
              result.entries.map(e => ({
                time: e.time,
                server: serverName || e.server || 'unknown',
                username: e.username || 'Unknown',
                chatType: e.details?.chatType as string || 'Local',
                message: e.message,
                coordinates: e.details?.coordinates as { x: number; y: number; z: number } | undefined,
              }))
            );
            break;

          case 'server':
            entriesAdded = await insertServerEvents(
              result.entries.map(e => ({
                time: e.time,
                server: serverName || e.server || 'unknown',
                eventType: e.eventType as PZServerEvent['eventType'],
                category: e.details?.category as string,
                level: e.level as PZServerEvent['level'],
                message: e.message,
                details: e.details,
              }))
            );
            break;

          case 'pvp':
            entriesAdded = await insertPVPEvents(
              result.entries.map(e => ({
                time: e.time,
                server: serverName || e.server || 'unknown',
                eventType: e.eventType as PZPVPEvent['eventType'],
                attacker: e.details?.attacker as string,
                victim: e.details?.victim as string,
                weapon: e.details?.weapon as string,
                damage: e.details?.damage as number,
                details: e.details,
              }))
            );
            break;

          case 'perk':
            entriesAdded = await insertSkillSnapshots(
              result.entries
                .filter(e => e.details?.skills)
                .map(e => ({
                  time: e.time,
                  server: serverName || e.server || 'unknown',
                  username: e.username || 'Unknown',
                  hoursSurvived: (e.details?.hoursSurvived as number) || 0,
                  skills: e.details?.skills as Record<string, number>,
                }))
            );
            break;
        }
      }

      // Update file position
      await updateFilePosition(filePath, stats.size, parserType, stats.size);

    } finally {
      await fileHandle.close();
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return { entriesAdded, bytesProcessed, errors };
}
