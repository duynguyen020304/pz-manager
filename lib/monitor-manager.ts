/**
 * Monitor Manager
 * Handles database operations for system metrics and monitoring configuration
 */

import { query, queryOne } from './db';
import type {
  SystemMetric,
  SystemSpike,
  MonitorConfig,
  MonitorConfigInput,
  TimeSeriesData,
} from '@/types';

// ============================================
// CONFIGURATION OPERATIONS
// ============================================

export async function getMonitorConfig(): Promise<MonitorConfig> {
  const result = await queryOne<{
    id: number;
    enabled: boolean;
    polling_interval_seconds: number;
    data_retention_days: number;
    cpu_spike_threshold_percent: number;
    cpu_spike_sustained_seconds: number;
    cpu_critical_threshold: number;
    memory_spike_threshold_percent: number;
    memory_spike_sustained_seconds: number;
    memory_critical_threshold: number;
    swap_spike_threshold_percent: number;
    swap_spike_sustained_seconds: number;
    swap_critical_threshold: number;
    network_spike_threshold_percent: number;
    network_spike_sustained_seconds: number;
    updated_at: Date;
  }>('SELECT * FROM monitor_config WHERE id = 1');

  if (!result) {
    // Return default config if not found
    return {
      id: 1,
      enabled: true,
      pollingIntervalSeconds: 5,
      dataRetentionDays: 30,
      cpuSpikeThresholdPercent: 25.0,
      cpuSpikeSustainedSeconds: 15,
      cpuCriticalThreshold: 90.0,
      memorySpikeThresholdPercent: 20.0,
      memorySpikeSustainedSeconds: 10,
      memoryCriticalThreshold: 90.0,
      swapSpikeThresholdPercent: 30.0,
      swapSpikeSustainedSeconds: 10,
      swapCriticalThreshold: 50.0,
      networkSpikeThresholdPercent: 50.0,
      networkSpikeSustainedSeconds: 10,
      updatedAt: new Date(),
    };
  }

  return {
    id: result.id,
    enabled: result.enabled,
    pollingIntervalSeconds: result.polling_interval_seconds,
    dataRetentionDays: result.data_retention_days,
    cpuSpikeThresholdPercent: result.cpu_spike_threshold_percent,
    cpuSpikeSustainedSeconds: result.cpu_spike_sustained_seconds,
    cpuCriticalThreshold: result.cpu_critical_threshold,
    memorySpikeThresholdPercent: result.memory_spike_threshold_percent,
    memorySpikeSustainedSeconds: result.memory_spike_sustained_seconds,
    memoryCriticalThreshold: result.memory_critical_threshold,
    swapSpikeThresholdPercent: result.swap_spike_threshold_percent,
    swapSpikeSustainedSeconds: result.swap_spike_sustained_seconds,
    swapCriticalThreshold: result.swap_critical_threshold,
    networkSpikeThresholdPercent: result.network_spike_threshold_percent,
    networkSpikeSustainedSeconds: result.network_spike_sustained_seconds,
    updatedAt: result.updated_at,
  };
}

export async function updateMonitorConfig(
  config: MonitorConfigInput
): Promise<MonitorConfig> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (config.enabled !== undefined) {
    fields.push(`enabled = $${paramIndex++}`);
    values.push(config.enabled);
  }
  if (config.pollingIntervalSeconds !== undefined) {
    fields.push(`polling_interval_seconds = $${paramIndex++}`);
    values.push(config.pollingIntervalSeconds);
  }
  if (config.dataRetentionDays !== undefined) {
    fields.push(`data_retention_days = $${paramIndex++}`);
    values.push(config.dataRetentionDays);
  }
  if (config.cpuSpikeThresholdPercent !== undefined) {
    fields.push(`cpu_spike_threshold_percent = $${paramIndex++}`);
    values.push(config.cpuSpikeThresholdPercent);
  }
  if (config.cpuSpikeSustainedSeconds !== undefined) {
    fields.push(`cpu_spike_sustained_seconds = $${paramIndex++}`);
    values.push(config.cpuSpikeSustainedSeconds);
  }
  if (config.cpuCriticalThreshold !== undefined) {
    fields.push(`cpu_critical_threshold = $${paramIndex++}`);
    values.push(config.cpuCriticalThreshold);
  }
  if (config.memorySpikeThresholdPercent !== undefined) {
    fields.push(`memory_spike_threshold_percent = $${paramIndex++}`);
    values.push(config.memorySpikeThresholdPercent);
  }
  if (config.memorySpikeSustainedSeconds !== undefined) {
    fields.push(`memory_spike_sustained_seconds = $${paramIndex++}`);
    values.push(config.memorySpikeSustainedSeconds);
  }
  if (config.memoryCriticalThreshold !== undefined) {
    fields.push(`memory_critical_threshold = $${paramIndex++}`);
    values.push(config.memoryCriticalThreshold);
  }
  if (config.swapSpikeThresholdPercent !== undefined) {
    fields.push(`swap_spike_threshold_percent = $${paramIndex++}`);
    values.push(config.swapSpikeThresholdPercent);
  }
  if (config.swapSpikeSustainedSeconds !== undefined) {
    fields.push(`swap_spike_sustained_seconds = $${paramIndex++}`);
    values.push(config.swapSpikeSustainedSeconds);
  }
  if (config.swapCriticalThreshold !== undefined) {
    fields.push(`swap_critical_threshold = $${paramIndex++}`);
    values.push(config.swapCriticalThreshold);
  }
  if (config.networkSpikeThresholdPercent !== undefined) {
    fields.push(`network_spike_threshold_percent = $${paramIndex++}`);
    values.push(config.networkSpikeThresholdPercent);
  }
  if (config.networkSpikeSustainedSeconds !== undefined) {
    fields.push(`network_spike_sustained_seconds = $${paramIndex++}`);
    values.push(config.networkSpikeSustainedSeconds);
  }

  if (fields.length === 0) {
    return getMonitorConfig();
  }

  fields.push(`updated_at = NOW()`);
  values.push(1); // id

  await query(
    `UPDATE monitor_config SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
    values
  );

  return getMonitorConfig();
}

// ============================================
// METRICS OPERATIONS
// ============================================

export async function insertSystemMetric(metric: SystemMetric): Promise<void> {
  await query(
    `INSERT INTO system_metrics (
      time, cpu_percent, cpu_cores, memory_used_bytes, memory_total_bytes,
      memory_percent, swap_used_bytes, swap_total_bytes, swap_percent,
      network_interface, network_rx_bytes, network_tx_bytes,
      network_rx_sec, network_tx_sec
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      metric.time,
      metric.cpuPercent,
      metric.cpuCores ? JSON.stringify(metric.cpuCores) : null,
      metric.memoryUsedBytes,
      metric.memoryTotalBytes,
      metric.memoryPercent,
      metric.swapUsedBytes,
      metric.swapTotalBytes,
      metric.swapPercent,
      metric.networkInterface,
      metric.networkRxBytes,
      metric.networkTxBytes,
      metric.networkRxSec,
      metric.networkTxSec,
    ]
  );
}

export async function getLatestMetrics(limit: number = 100): Promise<SystemMetric[]> {
  const results = await query<{
    time: Date;
    cpu_percent: number | null;
    cpu_cores: Array<{ core: number; load: number }> | null;
    memory_used_bytes: number | null;
    memory_total_bytes: number | null;
    memory_percent: number | null;
    swap_used_bytes: number | null;
    swap_total_bytes: number | null;
    swap_percent: number | null;
    network_interface: string | null;
    network_rx_bytes: number | null;
    network_tx_bytes: number | null;
    network_rx_sec: number | null;
    network_tx_sec: number | null;
  }>(
    `SELECT * FROM system_metrics ORDER BY time DESC LIMIT $1`,
    [limit]
  );

  return results.map((row) => ({
    time: row.time,
    cpuPercent: row.cpu_percent !== null ? Number(row.cpu_percent) : null,
    cpuCores: row.cpu_cores,
    memoryUsedBytes: row.memory_used_bytes,
    memoryTotalBytes: row.memory_total_bytes,
    memoryPercent: row.memory_percent !== null ? Number(row.memory_percent) : null,
    swapUsedBytes: row.swap_used_bytes,
    swapTotalBytes: row.swap_total_bytes,
    swapPercent: row.swap_percent !== null ? Number(row.swap_percent) : null,
    networkInterface: row.network_interface,
    networkRxBytes: row.network_rx_bytes,
    networkTxBytes: row.network_tx_bytes,
    networkRxSec: row.network_rx_sec,
    networkTxSec: row.network_tx_sec,
  }));
}

export async function getCurrentMetrics(): Promise<SystemMetric | null> {
  const results = await getLatestMetrics(1);
  return results.length > 0 ? results[0] : null;
}

export async function getMetricsTimeSeries(
  startTime: Date,
  endTime: Date,
  intervalSeconds: number = 60
): Promise<TimeSeriesData[]> {
  const results = await query<{
    bucket: Date;
    avg_cpu: number;
    max_cpu: number;
    avg_memory: number;
    max_memory: number;
    avg_swap: number;
    avg_network_rx: number;
    avg_network_tx: number;
  }>(
    `SELECT * FROM get_metrics_timeseries($1, $2, $3)`,
    [startTime, endTime, intervalSeconds]
  );

  return results.map((row) => ({
    bucket: row.bucket,
    avgCpu: row.avg_cpu,
    maxCpu: row.max_cpu,
    avgMemory: row.avg_memory,
    maxMemory: row.max_memory,
    avgSwap: row.avg_swap,
    avgNetworkRx: row.avg_network_rx,
    avgNetworkTx: row.avg_network_tx,
  }));
}

// ============================================
// SPIKE OPERATIONS
// ============================================

export async function insertSystemSpike(spike: SystemSpike): Promise<void> {
  await query(
    `INSERT INTO system_spikes (
      time, metric_type, severity, previous_value, current_value,
      change_percent, sustained_for_seconds, details
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      spike.time,
      spike.metricType,
      spike.severity,
      spike.previousValue,
      spike.currentValue,
      spike.changePercent,
      spike.sustainedForSeconds,
      spike.details ? JSON.stringify(spike.details) : null,
    ]
  );
}

export async function getRecentSpikes(
  hours: number = 24,
  limit: number = 100
): Promise<SystemSpike[]> {
  const results = await query<{
    time: Date;
    metric_type: string;
    severity: string;
    previous_value: number;
    current_value: number;
    change_percent: number;
    sustained_for_seconds: number;
    details: Record<string, unknown> | null;
  }>(
    `SELECT * FROM system_spikes 
     WHERE time >= NOW() - INTERVAL '1 hour' * $1
     ORDER BY time DESC 
     LIMIT $2`,
    [hours, limit]
  );

  return results.map((row) => ({
    time: row.time,
    metricType: row.metric_type as SystemSpike['metricType'],
    severity: row.severity as SystemSpike['severity'],
    previousValue: Number(row.previous_value),
    currentValue: Number(row.current_value),
    changePercent: Number(row.change_percent),
    sustainedForSeconds: row.sustained_for_seconds,
    details: row.details,
  }));
}

export async function getSpikesByType(
  metricType: SystemSpike['metricType'],
  hours: number = 24,
  limit: number = 100
): Promise<SystemSpike[]> {
  const results = await query<{
    time: Date;
    metric_type: string;
    severity: string;
    previous_value: number;
    current_value: number;
    change_percent: number;
    sustained_for_seconds: number;
    details: Record<string, unknown> | null;
  }>(
    `SELECT * FROM system_spikes 
     WHERE metric_type = $1 AND time >= NOW() - INTERVAL '1 hour' * $2
     ORDER BY time DESC 
     LIMIT $3`,
    [metricType, hours, limit]
  );

  return results.map((row) => ({
    time: row.time,
    metricType: row.metric_type as SystemSpike['metricType'],
    severity: row.severity as SystemSpike['severity'],
    previousValue: Number(row.previous_value),
    currentValue: Number(row.current_value),
    changePercent: Number(row.change_percent),
    sustainedForSeconds: row.sustained_for_seconds,
    details: row.details,
  }));
}

// ============================================
// CLEANUP OPERATIONS
// ============================================

export async function cleanupOldMetrics(retentionDays?: number): Promise<number> {
  const config = await getMonitorConfig();
  const days = retentionDays ?? config.dataRetentionDays;

  const result = await queryOne<{ cleanup_old_metrics: number }>(
    `SELECT cleanup_old_metrics($1)`,
    [days]
  );

  return result?.cleanup_old_metrics ?? 0;
}
