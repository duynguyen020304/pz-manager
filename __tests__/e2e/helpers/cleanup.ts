import { query, queryOne } from '@/lib/db';

/**
 * Database cleanup utilities for E2E tests.
 * Prevents test data accumulation between test runs.
 */

// Pattern used to identify test data
const TEST_PATTERNS = {
  users: ['test_%', 'superadmin_%', 'admin_%', 'operator_%', 'viewer_%', 'e2e_%'],
  roles: ['test_%', 'e2e_%'],
  servers: ['test-server%', 'e2e-server%'],
  snapshots: ['test-snapshot%', 'e2e-snapshot%']
};

/**
 * Clean up all test data from the database.
 * This should be called in afterEach hooks to prevent data accumulation.
 *
 * @param options - Cleanup options to control what gets cleaned
 */
export async function cleanupTestData(options: {
  users?: boolean;
  sessions?: boolean;
  roles?: boolean;
  logs?: boolean;
  auditLogs?: boolean;
  backups?: boolean;
  metrics?: boolean;
} = {}): Promise<void> {
  const {
    users = true,
    sessions = true,
    roles = true,
    logs = true,
    auditLogs = true,
    backups = true,
    metrics = true
  } = options;

  try {
    // Clean up in dependency order (child tables first)

    // 1. Log file positions (if logs are being cleaned)
    if (logs) {
      await cleanupLogFilePositions();
    }

    // 2. Metrics and spikes
    if (metrics) {
      await cleanupSystemMetrics();
      await cleanupSystemSpikes();
    }

    // 3. Player events, skill snapshots, chat messages, PvP events
    if (logs) {
      await cleanupPZPlayerEvents();
      await cleanupPZSkillSnapshots();
      await cleanupPZChatMessages();
      await cleanupPZPVPEvents();
    }

    // 4. Server events
    if (logs) {
      await cleanupPZServerEvents();
    }

    // 5. Backup logs
    if (backups) {
      await cleanupBackupLogs();
    }

    // 6. Audit logs
    if (auditLogs) {
      await cleanupAuditLogs();
    }

    // 7. Sessions (before users)
    if (sessions) {
      await cleanupTestSessions();
    }

    // 8. Users (last, due to foreign key constraints)
    if (users) {
      await cleanupTestUsers();
    }

    // 9. Custom test roles
    if (roles) {
      await cleanupTestRoles();
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  }
}

/**
 * Clean up test users and their associated data.
 */
export async function cleanupTestUsers(): Promise<number> {
  const patterns = TEST_PATTERNS.users;

  // First, get the IDs of users to be deleted
  const userIds = await query<{ id: string }>(`
    SELECT id FROM users
    WHERE ${patterns.map(p => `username LIKE '${p}'`).join(' OR ')}
  `);

  if (userIds.length === 0) return 0;

  // Delete sessions for these users
  await query(`
    DELETE FROM sessions
    WHERE user_id = ANY($1)
  `, [userIds.map(u => u.id)]);

  // Delete audit logs for these users
  await query(`
    DELETE FROM audit_logs
    WHERE user_id = ANY($1)
  `, [userIds.map(u => u.id)]);

  // Delete the users
  const result = await queryOne<{ count: number }>(`
    WITH deleted AS (
      DELETE FROM users
      WHERE ${patterns.map(p => `username LIKE '${p}'`).join(' OR ')}
      RETURNING 1
    )
    SELECT COUNT(*)::int as count FROM deleted
  `);

  return result?.count || 0;
}

/**
 * Clean up test sessions.
 */
export async function cleanupTestSessions(): Promise<number> {
  const result = await queryOne<{ count: number }>(`
    WITH deleted AS (
      DELETE FROM sessions
      WHERE token LIKE 'test-token-%' OR token LIKE 'e2e-%'
      RETURNING 1
    )
    SELECT COUNT(*)::int as count FROM deleted
  `);

  return result?.count || 0;
}

/**
 * Clean up custom test roles (not system roles).
 */
export async function cleanupTestRoles(): Promise<number> {
  const result = await queryOne<{ count: number }>(`
    WITH deleted AS (
      DELETE FROM roles
      WHERE is_system = false
      AND (${TEST_PATTERNS.roles.map(p => `name LIKE '${p}'`).join(' OR ')})
      RETURNING 1
    )
    SELECT COUNT(*)::int as count FROM deleted
  `);

  return result?.count || 0;
}

/**
 * Clean up audit logs created during tests.
 */
export async function cleanupAuditLogs(): Promise<number> {
  try {
    const result = await queryOne<{ count: number }>(`
      WITH deleted AS (
        DELETE FROM audit_logs
        WHERE user_id IN (
          SELECT id FROM users
          WHERE ${TEST_PATTERNS.users.map(p => `username LIKE '${p}'`).join(' OR ')}
        )
        RETURNING 1
      )
      SELECT COUNT(*)::int as count FROM deleted
    `);

    return result?.count || 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Clean up backup logs.
 */
export async function cleanupBackupLogs(): Promise<number> {
  try {
    const result = await queryOne<{ count: number }>(`
      WITH deleted AS (
        DELETE FROM backup_logs
        WHERE server_name = ANY($1)
        RETURNING 1
      )
      SELECT COUNT(*)::int as count FROM deleted
    `, [TEST_PATTERNS.servers]);

    return result?.count || 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Clean up Project Zomboid player events.
 */
export async function cleanupPZPlayerEvents(): Promise<number> {
  try {
    const result = await queryOne<{ count: number }>(`
      WITH deleted AS (
        DELETE FROM pz_player_events
        WHERE server_name = ANY($1)
        RETURNING 1
      )
      SELECT COUNT(*)::int as count FROM deleted
    `, [TEST_PATTERNS.servers]);

    return result?.count || 0;
  } catch (error) {
    // Table doesn't exist in test database
    return 0;
  }
}

/**
 * Clean up Project Zomboid skill snapshots.
 */
export async function cleanupPZSkillSnapshots(): Promise<number> {
  try {
    const result = await queryOne<{ count: number }>(`
      WITH deleted AS (
        DELETE FROM pz_skill_snapshots
        WHERE server_name = ANY($1)
        RETURNING 1
      )
      SELECT COUNT(*)::int as count FROM deleted
    `, [TEST_PATTERNS.servers]);

    return result?.count || 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Clean up Project Zomboid chat messages.
 */
export async function cleanupPZChatMessages(): Promise<number> {
  try {
    const result = await queryOne<{ count: number }>(`
      WITH deleted AS (
        DELETE FROM pz_chat_messages
        WHERE server_name = ANY($1)
        RETURNING 1
      )
      SELECT COUNT(*)::int as count FROM deleted
    `, [TEST_PATTERNS.servers]);

    return result?.count || 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Clean up Project Zomboid PvP events.
 */
export async function cleanupPZPVPEvents(): Promise<number> {
  try {
    const result = await queryOne<{ count: number }>(`
      WITH deleted AS (
        DELETE FROM pz_pvp_events
        WHERE server_name = ANY($1)
        RETURNING 1
      )
      SELECT COUNT(*)::int as count FROM deleted
    `, [TEST_PATTERNS.servers]);

    return result?.count || 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Clean up Project Zomboid server events.
 */
export async function cleanupPZServerEvents(): Promise<number> {
  try {
    const result = await queryOne<{ count: number }>(`
      WITH deleted AS (
        DELETE FROM pz_server_events
        WHERE server_name = ANY($1)
        RETURNING 1
      )
      SELECT COUNT(*)::int as count FROM deleted
    `, [TEST_PATTERNS.servers]);

    return result?.count || 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Clean up log file positions.
 */
export async function cleanupLogFilePositions(): Promise<number> {
  try {
    const result = await queryOne<{ count: number }>(`
      WITH deleted AS (
        DELETE FROM log_file_positions
        WHERE server_name = ANY($1)
        RETURNING 1
      )
      SELECT COUNT(*)::int as count FROM deleted
    `, [TEST_PATTERNS.servers]);

    return result?.count || 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Clean up system metrics.
 */
export async function cleanupSystemMetrics(): Promise<number> {
  try {
    const result = await queryOne<{ count: number }>(`
      DELETE FROM system_metrics
      RETURNING 1
    `);

    return result ? 1 : 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Clean up system spikes.
 */
export async function cleanupSystemSpikes(): Promise<number> {
  try {
    const result = await queryOne<{ count: number }>(`
      DELETE FROM system_spikes
      RETURNING 1
    `);

    return result ? 1 : 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Clean up server-specific data.
 * Use this after tests that create servers or server-related data.
 */
export async function cleanupServerData(serverName?: string): Promise<void> {
  const patterns = serverName
    ? [serverName]
    : TEST_PATTERNS.servers;

  // Helper to safely execute cleanup queries
  const safeDelete = async (table: string, column: string) => {
    try {
      await query(`DELETE FROM ${table} WHERE ${column} = ANY($1)`, [patterns]);
    } catch (error) {
      // Table doesn't exist in test database - ignore
      if ((error as any).message?.includes('does not exist')) {
        // Silently ignore - table not in test schema
      } else {
        throw error;
      }
    }
  };

  await safeDelete('pz_player_events', 'server_name');
  await safeDelete('pz_skill_snapshots', 'server_name');
  await safeDelete('pz_chat_messages', 'server_name');
  await safeDelete('pz_pvp_events', 'server_name');
  await safeDelete('pz_server_events', 'server_name');
  await safeDelete('backup_logs', 'server_name');
  await safeDelete('log_file_positions', 'server_name');
}

/**
 * Count test records in the database.
 * Useful for verifying cleanup effectiveness.
 */
export async function countTestRecords(): Promise<{
  users: number;
  sessions: number;
  roles: number;
  auditLogs: number;
}> {
  const users = await queryOne<{ count: number }>(`
    SELECT COUNT(*)::int as count
    FROM users
    WHERE ${TEST_PATTERNS.users.map(p => `username LIKE '${p}'`).join(' OR ')}
  `);

  const sessions = await queryOne<{ count: number }>(`
    SELECT COUNT(*)::int as count
    FROM sessions
    WHERE token LIKE 'test-token-%' OR token LIKE 'e2e-%'
  `);

  const roles = await queryOne<{ count: number }>(`
    SELECT COUNT(*)::int as count
    FROM roles
    WHERE is_system = false
    AND (${TEST_PATTERNS.roles.map(p => `name LIKE '${p}'`).join(' OR ')})
  `);

  const auditLogs = await queryOne<{ count: number }>(`
    SELECT COUNT(*)::int as count
    FROM audit_logs
    WHERE user_id IN (
      SELECT id FROM users
      WHERE ${TEST_PATTERNS.users.map(p => `username LIKE '${p}'`).join(' OR ')}
    )
  `);

  return {
    users: users?.count || 0,
    sessions: sessions?.count || 0,
    roles: roles?.count || 0,
    auditLogs: auditLogs?.count || 0
  };
}

/**
 * Verify that the database is clean (no test data remaining).
 * Throws an error if test data is found.
 */
export async function verifyDatabaseClean(): Promise<void> {
  const counts = await countTestRecords();

  const total = counts.users + counts.sessions + counts.roles + counts.auditLogs;

  if (total > 0) {
    throw new Error(
      `Database not clean after cleanup. Found:\n` +
      `  - Users: ${counts.users}\n` +
      `  - Sessions: ${counts.sessions}\n` +
      `  - Roles: ${counts.roles}\n` +
      `  - Audit logs: ${counts.auditLogs}`
    );
  }
}
