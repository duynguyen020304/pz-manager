-- Enable TimescaleDB extension (should already be enabled, but ensure)
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ============================================
-- BACKUP SYSTEM LOGS
-- Tracks backup, restore, and rollback operations
-- ============================================
CREATE TABLE IF NOT EXISTS backup_logs (
    time TIMESTAMPTZ NOT NULL,
    log_type TEXT NOT NULL,              -- 'backup', 'restore', 'rollback-cli'
    level TEXT NOT NULL,                 -- 'INFO', 'ERROR', 'WARN'
    server TEXT,
    message TEXT NOT NULL,
    details JSONB,
    parsed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to TimescaleDB hypertable for efficient time-series queries
SELECT create_hypertable('backup_logs', 'time', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_backup_logs_server ON backup_logs(server, time DESC);
CREATE INDEX IF NOT EXISTS idx_backup_logs_log_type ON backup_logs(log_type, time DESC);
CREATE INDEX IF NOT EXISTS idx_backup_logs_level ON backup_logs(level, time DESC);

-- ============================================
-- PZ PLAYER EVENTS
-- Tracks player logins, deaths, chat, combat, etc.
-- ============================================
CREATE TABLE IF NOT EXISTS pz_player_events (
    time TIMESTAMPTZ NOT NULL,
    server TEXT NOT NULL,
    event_type TEXT NOT NULL,            -- 'login_success', 'login_attempt', 'login_complete', 'logout', 'chat', 'death', 'combat', 'vehicle_enter', 'vehicle_exit', 'admin_command', 'kicked', 'banned', 'already_connected', 'server_full', 'invalid_password', 'version_mismatch', 'ping_timeout'
    username TEXT,
    ip_address INET,
    details JSONB,
    parsed_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('pz_player_events', 'time', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pz_player_events_server ON pz_player_events(server, time DESC);
CREATE INDEX IF NOT EXISTS idx_pz_player_events_type ON pz_player_events(event_type, time DESC);
CREATE INDEX IF NOT EXISTS idx_pz_player_events_username ON pz_player_events(username, time DESC);
CREATE INDEX IF NOT EXISTS idx_pz_player_events_ip ON pz_player_events(ip_address);

-- ============================================
-- PZ SERVER EVENTS
-- Tracks server startup, shutdown, errors, warnings
-- ============================================
CREATE TABLE IF NOT EXISTS pz_server_events (
    time TIMESTAMPTZ NOT NULL,
    server TEXT NOT NULL,
    event_type TEXT NOT NULL,            -- 'startup', 'shutdown', 'error', 'warning', 'info'
    category TEXT,                       -- 'general', 'network', 'performance', etc.
    level TEXT,                          -- 'LOG', 'ERROR', 'WARN', 'INFO'
    message TEXT,
    details JSONB,
    parsed_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('pz_server_events', 'time', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pz_server_events_server ON pz_server_events(server, time DESC);
CREATE INDEX IF NOT EXISTS idx_pz_server_events_type ON pz_server_events(event_type, time DESC);
CREATE INDEX IF NOT EXISTS idx_pz_server_events_level ON pz_server_events(level, time DESC);

-- ============================================
-- PZ SKILL SNAPSHOTS
-- Stores player skill progression from PerkLog.txt
-- ============================================
CREATE TABLE IF NOT EXISTS pz_skill_snapshots (
    time TIMESTAMPTZ NOT NULL,
    server TEXT NOT NULL,
    username TEXT NOT NULL,
    player_id INTEGER,
    hours_survived INTEGER,
    skills JSONB NOT NULL,               -- {"Aiming": 5, "Cooking": 3, ...}
    parsed_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('pz_skill_snapshots', 'time', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pz_skill_snapshots_server ON pz_skill_snapshots(server, time DESC);
CREATE INDEX IF NOT EXISTS idx_pz_skill_snapshots_username ON pz_skill_snapshots(username, time DESC);

-- ============================================
-- PZ CHAT MESSAGES
-- Dedicated table for chat message history
-- ============================================
CREATE TABLE IF NOT EXISTS pz_chat_messages (
    time TIMESTAMPTZ NOT NULL,
    server TEXT NOT NULL,
    username TEXT NOT NULL,
    chat_type TEXT NOT NULL,             -- 'Local', 'Global', 'Shout', 'Whisper', 'Radio', etc.
    message TEXT NOT NULL,
    coordinates JSONB,                   -- {"x": 1234, "y": 5678, "z": 0}
    parsed_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('pz_chat_messages', 'time', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pz_chat_messages_server ON pz_chat_messages(server, time DESC);
CREATE INDEX IF NOT EXISTS idx_pz_chat_messages_username ON pz_chat_messages(username, time DESC);

-- ============================================
-- LOG FILE POSITIONS
-- Tracks file read positions for incremental parsing
-- ============================================
CREATE TABLE IF NOT EXISTS log_file_positions (
    file_path TEXT PRIMARY KEY,
    last_position BIGINT NOT NULL,
    last_modified TIMESTAMPTZ NOT NULL,
    last_ingested TIMESTAMPTZ DEFAULT NOW(),
    file_size BIGINT,
    checksum TEXT,                       -- SHA256 for detecting file rotation
    parser_type TEXT NOT NULL            -- 'backup', 'user', 'chat', 'server', 'perk', etc.
);

-- Create index for last_ingested queries
CREATE INDEX IF NOT EXISTS idx_log_file_positions_ingested ON log_file_positions(last_ingested DESC);

-- ============================================
-- PVP EVENTS
-- Tracks combat and PvP interactions
-- ============================================
CREATE TABLE IF NOT EXISTS pz_pvp_events (
    time TIMESTAMPTZ NOT NULL,
    server TEXT NOT NULL,
    event_type TEXT NOT NULL,            -- 'damage', 'kill', 'death'
    attacker TEXT,
    victim TEXT,
    weapon TEXT,
    damage REAL,
    details JSONB,
    parsed_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('pz_pvp_events', 'time', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pz_pvp_events_server ON pz_pvp_events(server, time DESC);
CREATE INDEX IF NOT EXISTS idx_pz_pvp_events_type ON pz_pvp_events(event_type, time DESC);
CREATE INDEX IF NOT EXISTS idx_pz_pvp_events_attacker ON pz_pvp_events(attacker, time DESC);
CREATE INDEX IF NOT EXISTS idx_pz_pvp_events_victim ON pz_pvp_events(victim, time DESC);

-- ============================================
-- FUNCTIONS AND VIEWS
-- ============================================

-- Function to get player session statistics
CREATE OR REPLACE FUNCTION get_player_session_stats(
    p_username TEXT,
    p_server TEXT,
    p_from TIMESTAMPTZ DEFAULT NULL,
    p_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    session_count BIGINT,
    total_duration_seconds BIGINT,
    avg_session_seconds NUMERIC,
    first_login TIMESTAMPTZ,
    last_logout TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    WITH sessions AS (
        SELECT
            time as login_time,
            COALESCE(
                LEAD(time) OVER (PARTITION BY username ORDER BY time),
                NOW()
            ) as logout_time,
            EXTRACT(EPOCH FROM (COALESCE(LEAD(time) OVER (PARTITION BY username ORDER BY time), NOW()) - time)) as duration_seconds
        FROM pz_player_events
        WHERE username = p_username
          AND server = p_server
          AND event_type = 'login_success'
          AND (p_from IS NULL OR time >= p_from)
          AND (p_to IS NULL OR time <= p_to)
    )
    SELECT
        COUNT(*) as session_count,
        COALESCE(SUM(duration_seconds), 0) as total_duration_seconds,
        COALESCE(AVG(duration_seconds), 0) as avg_session_seconds,
        MIN(login_time) as first_login,
        MAX(logout_time) as last_logout
    FROM sessions;
END;
$$ LANGUAGE plpgsql;

-- View for recent player activity (last 24 hours)
CREATE OR REPLACE VIEW recent_player_activity AS
SELECT
    server,
    username,
    MAX(time) as last_activity,
    MAX(time) FILTER (WHERE event_type = 'login_success') as last_login,
    COUNT(*) FILTER (WHERE event_type = 'login_success') as login_count,
    COUNT(*) FILTER (WHERE event_type = 'death') as death_count,
    COUNT(*) FILTER (WHERE event_type = 'chat') as chat_count
FROM pz_player_events
WHERE time > NOW() - INTERVAL '24 hours'
GROUP BY server, username
ORDER BY last_activity DESC;

-- View for server status summary (fixed: removed username from pz_server_events)
CREATE OR REPLACE VIEW server_status_summary AS
SELECT
    server,
    MAX(time) as last_event,
    COUNT(*) FILTER (WHERE event_type = 'startup') as startup_count,
    MAX(time) FILTER (WHERE event_type = 'startup') as last_startup,
    COUNT(*) FILTER (WHERE event_type = 'shutdown') as shutdown_count,
    MAX(time) FILTER (WHERE event_type = 'shutdown') as last_shutdown,
    COUNT(*) FILTER (WHERE event_type = 'error') as error_count
FROM pz_server_events
GROUP BY server;

-- Function to clean up old log data (can be called by a cron job)
CREATE OR REPLACE FUNCTION cleanup_old_logs(
    retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    temp_count INTEGER;
BEGIN
    -- Clean up old backup logs
    DELETE FROM backup_logs WHERE time < NOW() - (retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;

    -- Clean up old player events
    DELETE FROM pz_player_events WHERE time < NOW() - (retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;

    -- Clean up old server events
    DELETE FROM pz_server_events WHERE time < NOW() - (retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;

    -- Clean up old skill snapshots (keep these longer - 1 year default)
    DELETE FROM pz_skill_snapshots WHERE time < NOW() - ((retention_days * 4) || ' days')::INTERVAL;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;

    -- Clean up old chat messages (keep these shorter - 30 days default)
    DELETE FROM pz_chat_messages WHERE time < NOW() - ((retention_days / 3) || ' days')::INTERVAL;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;

    -- Clean up old PvP events
    DELETE FROM pz_pvp_events WHERE time < NOW() - (retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get activity heatmap data
CREATE OR REPLACE FUNCTION get_activity_heatmap(
    p_server TEXT,
    p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
    hour INTEGER,
    day_of_week INTEGER,
    event_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        EXTRACT(HOUR FROM time) as hour,
        EXTRACT(DOW FROM time) as day_of_week,
        COUNT(*) as event_count
    FROM pz_player_events
    WHERE server = p_server
      AND time > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY EXTRACT(HOUR FROM time), EXTRACT(DOW FROM time)
    ORDER BY day_of_week, hour;
END;
$$ LANGUAGE plpgsql;
