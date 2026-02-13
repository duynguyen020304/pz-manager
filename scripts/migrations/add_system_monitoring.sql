-- ============================================
-- SYSTEM MONITORING TABLES
-- Tracks system performance metrics and spike events
-- ============================================

-- Enable TimescaleDB extension (should already be enabled, but ensure)
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ============================================
-- SYSTEM METRICS
-- Raw performance metrics collected at regular intervals
-- ============================================
CREATE TABLE IF NOT EXISTS system_metrics (
    time TIMESTAMPTZ NOT NULL,
    cpu_percent DECIMAL(5,2),
    cpu_cores JSONB,                    -- per-core breakdown: [{core: 0, load: 15.5}, ...]
    memory_used_bytes BIGINT,
    memory_total_bytes BIGINT,
    memory_percent DECIMAL(5,2),
    swap_used_bytes BIGINT,
    swap_total_bytes BIGINT,
    swap_percent DECIMAL(5,2),
    network_interface TEXT,             -- e.g., 'eth0', 'wlan0'
    network_rx_bytes BIGINT,
    network_tx_bytes BIGINT,
    network_rx_sec BIGINT,              -- bytes/sec (calculated from delta)
    network_tx_sec BIGINT               -- bytes/sec (calculated from delta)
);

-- Convert to TimescaleDB hypertable for efficient time-series queries
SELECT create_hypertable('system_metrics', 'time', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_system_metrics_time ON system_metrics(time DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_cpu ON system_metrics(cpu_percent, time DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_memory ON system_metrics(memory_percent, time DESC);

-- ============================================
-- SYSTEM SPIKES
-- Detected spike events with context
-- ============================================
CREATE TABLE IF NOT EXISTS system_spikes (
    time TIMESTAMPTZ NOT NULL,
    metric_type TEXT NOT NULL,          -- 'cpu', 'memory', 'swap', 'network_rx', 'network_tx'
    severity TEXT NOT NULL,             -- 'warning', 'critical'
    previous_value DECIMAL(5,2),        -- value before spike
    current_value DECIMAL(5,2),         -- value at spike detection
    change_percent DECIMAL(5,2),        -- percentage change
    sustained_for_seconds INTEGER,      -- how long the spike condition was met
    details JSONB                       -- additional context
);

SELECT create_hypertable('system_spikes', 'time', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);

-- Create indexes for spike queries
CREATE INDEX IF NOT EXISTS idx_system_spikes_time ON system_spikes(time DESC);
CREATE INDEX IF NOT EXISTS idx_system_spikes_type ON system_spikes(metric_type, time DESC);
CREATE INDEX IF NOT EXISTS idx_system_spikes_severity ON system_spikes(severity, time DESC);

-- ============================================
-- MONITOR CONFIGURATION
-- User-configurable settings for the monitoring system
-- ============================================
CREATE TABLE IF NOT EXISTS monitor_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    enabled BOOLEAN DEFAULT true,
    polling_interval_seconds INTEGER DEFAULT 5,
    data_retention_days INTEGER DEFAULT 30,
    
    -- Spike detection thresholds
    cpu_spike_threshold_percent DECIMAL(5,2) DEFAULT 25.0,      -- % change to trigger warning
    cpu_spike_sustained_seconds INTEGER DEFAULT 15,              -- must sustain for N seconds
    cpu_critical_threshold DECIMAL(5,2) DEFAULT 90.0,            -- absolute threshold for critical
    
    memory_spike_threshold_percent DECIMAL(5,2) DEFAULT 20.0,    -- % change to trigger warning
    memory_spike_sustained_seconds INTEGER DEFAULT 10,
    memory_critical_threshold DECIMAL(5,2) DEFAULT 90.0,
    
    swap_spike_threshold_percent DECIMAL(5,2) DEFAULT 30.0,
    swap_spike_sustained_seconds INTEGER DEFAULT 10,
    swap_critical_threshold DECIMAL(5,2) DEFAULT 50.0,
    
    network_spike_threshold_percent DECIMAL(5,2) DEFAULT 50.0,
    network_spike_sustained_seconds INTEGER DEFAULT 10,
    
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint to ensure only one config row exists
    CONSTRAINT single_config CHECK (id = 1)
);

-- Insert default config if not exists
INSERT INTO monitor_config (id, enabled, polling_interval_seconds, data_retention_days)
VALUES (1, true, 5, 30)
ON CONFLICT (id) DO NOTHING;

-- Create index for config lookup
CREATE INDEX IF NOT EXISTS idx_monitor_config_id ON monitor_config(id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to clean up old metrics data
CREATE OR REPLACE FUNCTION cleanup_old_metrics(p_retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    v_deleted_metrics INTEGER;
    v_deleted_spikes INTEGER;
BEGIN
    -- Delete old metrics
    DELETE FROM system_metrics 
    WHERE time < NOW() - INTERVAL '1 day' * p_retention_days;
    GET DIAGNOSTICS v_deleted_metrics = ROW_COUNT;
    
    -- Delete old spikes
    DELETE FROM system_spikes 
    WHERE time < NOW() - INTERVAL '1 day' * p_retention_days;
    GET DIAGNOSTICS v_deleted_spikes = ROW_COUNT;
    
    RETURN v_deleted_metrics + v_deleted_spikes;
END;
$$ LANGUAGE plpgsql;

-- Function to get current metrics summary
CREATE OR REPLACE FUNCTION get_current_metrics_summary()
RETURNS TABLE (
    cpu_percent DECIMAL(5,2),
    memory_percent DECIMAL(5,2),
    swap_percent DECIMAL(5,2),
    network_rx_sec BIGINT,
    network_tx_sec BIGINT,
    metric_time TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sm.cpu_percent,
        sm.memory_percent,
        sm.swap_percent,
        sm.network_rx_sec,
        sm.network_tx_sec,
        sm.time as metric_time
    FROM system_metrics sm
    ORDER BY sm.time DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get metrics time series
CREATE OR REPLACE FUNCTION get_metrics_timeseries(
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_interval_seconds INTEGER DEFAULT 60
)
RETURNS TABLE (
    bucket TIMESTAMPTZ,
    avg_cpu DECIMAL(5,2),
    max_cpu DECIMAL(5,2),
    avg_memory DECIMAL(5,2),
    max_memory DECIMAL(5,2),
    avg_swap DECIMAL(5,2),
    avg_network_rx BIGINT,
    avg_network_tx BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        time_bucket(INTERVAL '1 second' * p_interval_seconds, time) as bucket,
        ROUND(AVG(cpu_percent)::numeric, 2) as avg_cpu,
        ROUND(MAX(cpu_percent)::numeric, 2) as max_cpu,
        ROUND(AVG(memory_percent)::numeric, 2) as avg_memory,
        ROUND(MAX(memory_percent)::numeric, 2) as max_memory,
        ROUND(AVG(swap_percent)::numeric, 2) as avg_swap,
        AVG(network_rx_sec)::bigint as avg_network_rx,
        AVG(network_tx_sec)::bigint as avg_network_tx
    FROM system_metrics
    WHERE time >= p_start_time AND time <= p_end_time
    GROUP BY bucket
    ORDER BY bucket;
END;
$$ LANGUAGE plpgsql;
