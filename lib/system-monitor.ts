/**
 * System Monitor Service
 * Background service for continuous system performance monitoring
 * 
 * Features:
 * - Always-on monitoring when enabled
 * - Configurable polling interval
 * - Smart spike detection optimized for Project Zomboid
 * - Automatic data cleanup based on retention settings
 */

import * as si from 'systeminformation';
import { SpikeDetector } from './spike-detector';
import {
  getMonitorConfig,
  insertSystemMetric,
  insertSystemSpike,
  cleanupOldMetrics,
} from './monitor-manager';
import type { SystemMetric, MonitorConfig } from '@/types';

export interface MonitorStatus {
  isRunning: boolean;
  lastSample: Date | null;
  totalSamples: number;
  totalSpikes: number;
  lastError: string | null;
  config: MonitorConfig | null;
}

class SystemMonitor {
  private static instance: SystemMonitor;
  private intervalId: NodeJS.Timeout | null = null;
  private spikeDetector: SpikeDetector | null = null;
  private config: MonitorConfig | null = null;
  private status: MonitorStatus = {
    isRunning: false,
    lastSample: null,
    totalSamples: 0,
    totalSpikes: 0,
    lastError: null,
    config: null,
  };

  // Track previous network stats for calculating rates
  private lastNetworkStats: {
    rx_bytes: number;
    tx_bytes: number;
    timestamp: number;
  } | null = null;

  // Cleanup interval (run every hour)
  private cleanupIntervalId: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): SystemMonitor {
    if (!SystemMonitor.instance) {
      SystemMonitor.instance = new SystemMonitor();
    }
    return SystemMonitor.instance;
  }

  /**
   * Start the monitoring service
   */
  public async start(): Promise<void> {
    if (this.status.isRunning) {
      console.log('[SystemMonitor] Already running');
      return;
    }

    try {
      // Load configuration
      this.config = await getMonitorConfig();
      this.status.config = this.config;

      if (!this.config.enabled) {
        console.log('[SystemMonitor] Monitoring is disabled in configuration');
        return;
      }

      // Initialize spike detector
      this.spikeDetector = new SpikeDetector(this.config);

      // Start polling loop
      const intervalMs = this.config.pollingIntervalSeconds * 1000;
      this.intervalId = setInterval(() => this.collectSample(), intervalMs);

      // Run initial sample immediately
      this.collectSample();

      // Start cleanup job (every hour)
      this.cleanupIntervalId = setInterval(
        () => this.runCleanup(),
        60 * 60 * 1000
      );

      this.status.isRunning = true;
      console.log(
        `[SystemMonitor] Started with ${this.config.pollingIntervalSeconds}s interval`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.status.lastError = errorMsg;
      console.error('[SystemMonitor] Failed to start:', errorMsg);
      throw error;
    }
  }

  /**
   * Stop the monitoring service
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }

    this.status.isRunning = false;
    console.log('[SystemMonitor] Stopped');
  }

  /**
   * Restart with new configuration
   */
  public async restart(): Promise<void> {
    console.log('[SystemMonitor] Restarting...');
    this.stop();
    await this.start();
  }

  /**
   * Collect a single sample of system metrics
   */
  private async collectSample(): Promise<void> {
    try {
      // Gather all metrics in parallel
      const [cpuData, memData, networkData] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.networkStats('*'),
      ]);

      // Find primary network interface (first external interface with traffic)
      // Skip loopback and virtual interfaces
      const primaryInterface =
        networkData.find(
          (iface) =>
            iface.iface !== 'lo' &&
            iface.iface !== 'docker0' &&
            !iface.iface.startsWith('veth') &&
            !iface.iface.startsWith('br-') &&
            iface.operstate === 'up'
        ) || networkData.find((iface) => iface.iface !== 'lo') || networkData[0];

      // Calculate network rates (bytes/sec)
      let networkRxSec: number | null = null;
      let networkTxSec: number | null = null;

      const now = Date.now();
      if (this.lastNetworkStats && primaryInterface) {
        const timeDiff = (now - this.lastNetworkStats.timestamp) / 1000; // seconds
        if (timeDiff > 0) {
          const rxDiff =
            primaryInterface.rx_bytes - this.lastNetworkStats.rx_bytes;
          const txDiff =
            primaryInterface.tx_bytes - this.lastNetworkStats.tx_bytes;
          networkRxSec = Math.max(0, Math.round(rxDiff / timeDiff));
          networkTxSec = Math.max(0, Math.round(txDiff / timeDiff));
        }
      }

      if (primaryInterface) {
        this.lastNetworkStats = {
          rx_bytes: primaryInterface.rx_bytes,
          tx_bytes: primaryInterface.tx_bytes,
          timestamp: now,
        };
      }

      // Build metric object
      const metric: SystemMetric = {
        time: new Date(),
        cpuPercent: cpuData.currentLoad,
        cpuCores:
          cpuData.cpus?.map((core, idx) => ({
            core: idx,
            load: core.load,
          })) || null,
        memoryUsedBytes: memData.used,
        memoryTotalBytes: memData.total,
        memoryPercent:
          memData.total > 0 ? (memData.used / memData.total) * 100 : null,
        swapUsedBytes: memData.swapused,
        swapTotalBytes: memData.swaptotal,
        swapPercent:
          memData.swaptotal > 0
            ? (memData.swapused / memData.swaptotal) * 100
            : null,
        networkInterface: primaryInterface?.iface || null,
        networkRxBytes: primaryInterface?.rx_bytes || null,
        networkTxBytes: primaryInterface?.tx_bytes || null,
        networkRxSec,
        networkTxSec,
      };

      // Store in database
      await insertSystemMetric(metric);
      this.status.lastSample = metric.time;
      this.status.totalSamples++;

      // Check for spikes
      if (this.spikeDetector) {
        const spikes = this.spikeDetector.detectSpikes(metric);

        for (const spike of spikes) {
          await insertSystemSpike(spike);
          this.status.totalSpikes++;

          console.log(
            `[SystemMonitor] Spike detected: ${spike.metricType} - ${spike.severity} - ` +
              `${spike.previousValue.toFixed(1)}% → ${spike.currentValue.toFixed(1)}% ` +
              `(${spike.changePercent.toFixed(1)}% change, sustained ${spike.sustainedForSeconds}s)`
          );
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.status.lastError = errorMsg;
      console.error('[SystemMonitor] Error collecting sample:', errorMsg);
    }
  }

  /**
   * Run cleanup of old metrics
   */
  private async runCleanup(): Promise<void> {
    try {
      const deletedCount = await cleanupOldMetrics();
      if (deletedCount > 0) {
        console.log(
          `[SystemMonitor] Cleaned up ${deletedCount} old metric records`
        );
      }
    } catch (error) {
      console.error('[SystemMonitor] Cleanup error:', error);
    }
  }

  /**
   * Get current status
   */
  public getStatus(): MonitorStatus {
    return { ...this.status };
  }

  /**
   * Get spike detector stats (for debugging)
   */
  public getSpikeDetectorStats():
    | ReturnType<SpikeDetector['getStats']>
    | null {
    return this.spikeDetector?.getStats() || null;
  }

  /**
   * Update configuration and restart if necessary
   */
  public async updateConfig(): Promise<void> {
    const newConfig = await getMonitorConfig();

    // Check if we need to restart (interval changed or enabled/disabled)
    const needsRestart =
      !this.config ||
      this.config.enabled !== newConfig.enabled ||
      this.config.pollingIntervalSeconds !==
        newConfig.pollingIntervalSeconds;

    this.config = newConfig;
    this.status.config = newConfig;

    if (this.spikeDetector) {
      this.spikeDetector.updateConfig(newConfig);
    }

    if (needsRestart) {
      if (newConfig.enabled && !this.status.isRunning) {
        await this.start();
      } else if (!newConfig.enabled && this.status.isRunning) {
        this.stop();
      } else if (this.status.isRunning) {
        await this.restart();
      }
    }
  }
}

// Export singleton instance
export const systemMonitor = SystemMonitor.getInstance();
