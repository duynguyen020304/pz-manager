import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase, getTestPool } from '@/__tests__/setup/test-db';
import { insertPlayerEvents } from '@/lib/log-manager';
import type { PZPlayerEvent } from '@/types';

describe('Log Manager - Player Event Deduplication', () => {
  beforeEach(async () => {
    createTestDatabase();
  });

  describe('insertPlayerEvents', () => {
    it('prevents duplicate insertion', async () => {
      const event: PZPlayerEvent = {
        time: new Date('2024-01-01T12:00:00Z'),
        server: 'test-server',
        eventType: 'login_success',
        username: 'testuser',
        ipAddress: '192.168.1.1',
        details: { method: 'password' },
      };

      const firstInsert = await insertPlayerEvents([event]);
      const secondInsert = await insertPlayerEvents([event]);

      expect(firstInsert).toBe(1);
      expect(secondInsert).toBe(1);

      const pool = getTestPool();
      const client = await pool.connect();
      try {
        const result = await client.query<{ count: string }>(
          `SELECT COUNT(*) as count FROM pz_player_events
           WHERE time = $1 AND server = $2 AND event_type = $3 AND username = $4`,
          [event.time, event.server, event.eventType, event.username]
        );
        expect(parseInt(result.rows[0].count, 10)).toBe(1);
      } finally {
        client.release();
      }
    });

    it('allows different events', async () => {
      const events: PZPlayerEvent[] = [
        {
          time: new Date('2024-01-01T12:00:00Z'),
          server: 'test-server',
          eventType: 'login_success',
          username: 'user1',
          ipAddress: '192.168.1.1',
        },
        {
          time: new Date('2024-01-01T12:01:00Z'),
          server: 'test-server',
          eventType: 'login_success',
          username: 'user2',
          ipAddress: '192.168.1.2',
        },
        {
          time: new Date('2024-01-01T12:02:00Z'),
          server: 'test-server',
          eventType: 'logout',
          username: 'user1',
        },
      ];

      const inserted = await insertPlayerEvents(events);

      expect(inserted).toBe(3);

      const pool = getTestPool();
      const client = await pool.connect();
      try {
        const result = await client.query<{ count: string }>(
          'SELECT COUNT(*) as count FROM pz_player_events'
        );
        expect(parseInt(result.rows[0].count, 10)).toBe(3);
      } finally {
        client.release();
      }
    });

    it('idempotent insertPlayerEvents call', async () => {
      const events: PZPlayerEvent[] = [
        {
          time: new Date('2024-01-01T12:00:00Z'),
          server: 'test-server',
          eventType: 'login_success',
          username: 'user1',
          ipAddress: '192.168.1.1',
        },
        {
          time: new Date('2024-01-01T12:01:00Z'),
          server: 'test-server',
          eventType: 'logout',
          username: 'user1',
        },
      ];

      const firstCall = await insertPlayerEvents(events);
      const secondCall = await insertPlayerEvents(events);

      expect(firstCall).toBe(2);
      expect(secondCall).toBe(0);

      const pool = getTestPool();
      const client = await pool.connect();
      try {
        const result = await client.query<{ count: string }>(
          'SELECT COUNT(*) as count FROM pz_player_events'
        );
        expect(parseInt(result.rows[0].count, 10)).toBe(2);
      } finally {
        client.release();
      }
    });

    it('continues on individual error', async () => {
      const validEvent: PZPlayerEvent = {
        time: new Date('2024-01-01T12:00:00Z'),
        server: 'test-server',
        eventType: 'login_success',
        username: 'user1',
        ipAddress: '192.168.1.1',
      };

      await insertPlayerEvents([validEvent]);

      const duplicate = await insertPlayerEvents([validEvent]);

      expect(duplicate).toBe(0);

      const pool = getTestPool();
      const client = await pool.connect();
      try {
        const result = await client.query<{ count: string }>(
          'SELECT COUNT(*) as count FROM pz_player_events'
        );
        expect(parseInt(result.rows[0].count, 10)).toBe(1);
      } finally {
        client.release();
      }
    });
  });
});
