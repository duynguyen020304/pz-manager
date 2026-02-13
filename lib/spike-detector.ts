/**
 * Spike Detector
 * Intelligent spike detection algorithm optimized for Project Zomboid
 * 
 * PZ-Specific Considerations:
 * - Game engine can cause random CPU spikes
 * - We use sustained detection (multiple consecutive samples) to avoid false positives
 * - Rolling average smoothing to handle brief fluctuations
 * - Configurable thresholds per metric type
 */

import type { SystemMetric, SystemSpike, MonitorConfig, SpikeDetectionState } from '@/types';

interface MetricHistory {
  timestamp: number;
  cpu: number;
  memory: number;
  swap: number;
  networkRx: number;
  networkTx: number;
}

export class SpikeDetector {
  private history: MetricHistory[] = [];
  private state: SpikeDetectionState;
  private config: MonitorConfig;
  private lastNetworkRx = 0;
  private lastNetworkTx = 0;
  private firstNetworkSample = true;

  constructor(config: MonitorConfig) {
    this.config = config;
    this.state = this.initializeState();
  }

  private initializeState(): SpikeDetectionState {
    return {
      consecutiveHighCpu: 0,
      consecutiveHighMemory: 0,
      consecutiveHighSwap: 0,
      consecutiveHighNetworkRx: 0,
      consecutiveHighNetworkTx: 0,
      lastCpuValues: [],
      lastMemoryValues: [],
      lastNetworkRxValues: [],
      lastNetworkTxValues: [],
    };
  }

  /**
   * Update configuration (can be called when settings change)
   */
  public updateConfig(config: MonitorConfig): void {
    this.config = config;
  }

  /**
   * Process a new metric sample and detect any spikes
   * Returns array of detected spikes (empty if none)
   */
  public detectSpikes(metric: SystemMetric): SystemSpike[] {
    if (!metric.cpuPercent && !metric.memoryPercent) {
      return []; // Skip incomplete samples
    }

    const now = Date.now();
    const entry: MetricHistory = {
      timestamp: now,
      cpu: metric.cpuPercent ?? 0,
      memory: metric.memoryPercent ?? 0,
      swap: metric.swapPercent ?? 0,
      networkRx: metric.networkRxSec ?? 0,
      networkTx: metric.networkTxSec ?? 0,
    };

    this.history.push(entry);
    this.trimHistory();

    const spikes: SystemSpike[] = [];

    // Check each metric type for spikes
    const cpuSpike = this.checkCpuSpike(entry);
    if (cpuSpike) spikes.push(cpuSpike);

    const memorySpike = this.checkMemorySpike(entry);
    if (memorySpike) spikes.push(memorySpike);

    const swapSpike = this.checkSwapSpike(entry);
    if (swapSpike) spikes.push(swapSpike);

    const networkRxSpike = this.checkNetworkSpike(entry, 'rx');
    if (networkRxSpike) spikes.push(networkRxSpike);

    const networkTxSpike = this.checkNetworkSpike(entry, 'tx');
    if (networkTxSpike) spikes.push(networkTxSpike);

    return spikes;
  }

  /**
   * Calculate rolling average for a metric
   */
  private getRollingAverage(values: number[], windowSize: number): number {
    if (values.length === 0) return 0;
    const recent = values.slice(-Math.min(windowSize, values.length));
    return recent.reduce((a, b) => a + b, 0) / recent.length;
  }

  /**
   * Check for CPU spikes
   * Uses sustained detection to avoid PZ engine false positives
   */
  private checkCpuSpike(entry: MetricHistory): SystemSpike | null {
    // Keep rolling window of last 3 values (15s @ 5s interval)
    this.state.lastCpuValues.push(entry.cpu);
    if (this.state.lastCpuValues.length > 5) {
      this.state.lastCpuValues.shift();
    }

    const rollingAvg = this.getRollingAverage(this.state.lastCpuValues, 3);
    
    // Check for critical threshold first (absolute)
    if (entry.cpu >= this.config.cpuCriticalThreshold) {
      this.state.consecutiveHighCpu++;
      
      if (this.state.consecutiveHighCpu >= 2) { // Critical needs 2 samples (10s @ 5s)
        const spike = this.createSpike(
          'cpu',
          'critical',
          rollingAvg,
          entry.cpu,
          this.state.consecutiveHighCpu * this.config.pollingIntervalSeconds,
          { reason: 'absolute_threshold_exceeded', threshold: this.config.cpuCriticalThreshold }
        );
        this.state.consecutiveHighCpu = 0;
        return spike;
      }
    }
    // Check for relative spike (percentage increase)
    else if (rollingAvg > 0 && entry.cpu > rollingAvg * (1 + this.config.cpuSpikeThresholdPercent / 100)) {
      this.state.consecutiveHighCpu++;
      
      const requiredSamples = Math.ceil(this.config.cpuSpikeSustainedSeconds / this.config.pollingIntervalSeconds);
      
      if (this.state.consecutiveHighCpu >= requiredSamples) {
        const spike = this.createSpike(
          'cpu',
          'warning',
          rollingAvg,
          entry.cpu,
          this.state.consecutiveHighCpu * this.config.pollingIntervalSeconds
        );
        this.state.consecutiveHighCpu = 0;
        return spike;
      }
    } else {
      // Reset counter if condition not met
      this.state.consecutiveHighCpu = 0;
    }

    return null;
  }

  /**
   * Check for Memory spikes
   */
  private checkMemorySpike(entry: MetricHistory): SystemSpike | null {
    this.state.lastMemoryValues.push(entry.memory);
    if (this.state.lastMemoryValues.length > 5) {
      this.state.lastMemoryValues.shift();
    }

    const rollingAvg = this.getRollingAverage(this.state.lastMemoryValues, 3);

    // Critical threshold
    if (entry.memory >= this.config.memoryCriticalThreshold) {
      this.state.consecutiveHighMemory++;
      
      if (this.state.consecutiveHighMemory >= 2) {
        const spike = this.createSpike(
          'memory',
          'critical',
          rollingAvg,
          entry.memory,
          this.state.consecutiveHighMemory * this.config.pollingIntervalSeconds,
          { reason: 'absolute_threshold_exceeded', threshold: this.config.memoryCriticalThreshold }
        );
        this.state.consecutiveHighMemory = 0;
        return spike;
      }
    }
    // Relative spike
    else if (rollingAvg > 0 && entry.memory > rollingAvg * (1 + this.config.memorySpikeThresholdPercent / 100)) {
      this.state.consecutiveHighMemory++;
      
      const requiredSamples = Math.ceil(this.config.memorySpikeSustainedSeconds / this.config.pollingIntervalSeconds);
      
      if (this.state.consecutiveHighMemory >= requiredSamples) {
        const spike = this.createSpike(
          'memory',
          'warning',
          rollingAvg,
          entry.memory,
          this.state.consecutiveHighMemory * this.config.pollingIntervalSeconds
        );
        this.state.consecutiveHighMemory = 0;
        return spike;
      }
    } else {
      this.state.consecutiveHighMemory = 0;
    }

    return null;
  }

  /**
   * Check for Swap spikes
   */
  private checkSwapSpike(entry: MetricHistory): SystemSpike | null {
    // Skip if swap is not being used
    if (entry.swap === 0) return null;

    // Critical threshold
    if (entry.swap >= this.config.swapCriticalThreshold) {
      this.state.consecutiveHighSwap++;
      
      if (this.state.consecutiveHighSwap >= 2) {
        const spike = this.createSpike(
          'swap',
          'critical',
          0,
          entry.swap,
          this.state.consecutiveHighSwap * this.config.pollingIntervalSeconds,
          { reason: 'absolute_threshold_exceeded', threshold: this.config.swapCriticalThreshold }
        );
        this.state.consecutiveHighSwap = 0;
        return spike;
      }
    }
    // Relative spike (compare with previous swap value)
    else if (this.history.length >= 2) {
      const prevSwap = this.history[this.history.length - 2].swap;
      if (prevSwap > 0 && entry.swap > prevSwap * (1 + this.config.swapSpikeThresholdPercent / 100)) {
        this.state.consecutiveHighSwap++;
        
        const requiredSamples = Math.ceil(this.config.swapSpikeSustainedSeconds / this.config.pollingIntervalSeconds);
        
        if (this.state.consecutiveHighSwap >= requiredSamples) {
          const spike = this.createSpike(
            'swap',
            'warning',
            prevSwap,
            entry.swap,
            this.state.consecutiveHighSwap * this.config.pollingIntervalSeconds
          );
          this.state.consecutiveHighSwap = 0;
          return spike;
        }
      } else {
        this.state.consecutiveHighSwap = 0;
      }
    }

    return null;
  }

  /**
   * Check for Network spikes
   */
  private checkNetworkSpike(
    entry: MetricHistory,
    direction: 'rx' | 'tx'
  ): SystemSpike | null {
    const currentValue = direction === 'rx' ? entry.networkRx : entry.networkTx;
    const metricType = direction === 'rx' ? 'network_rx' : 'network_tx';
    
    // Skip first sample (no baseline)
    if (this.firstNetworkSample) {
      if (direction === 'tx') this.firstNetworkSample = false;
      return null;
    }

    const prevValues = direction === 'rx' 
      ? this.state.lastNetworkRxValues 
      : this.state.lastNetworkTxValues;
    const _consecutiveCounter = direction === 'rx'
      ? this.state.consecutiveHighNetworkRx
      : this.state.consecutiveHighNetworkTx;

    // Keep history
    prevValues.push(currentValue);
    if (prevValues.length > 5) {
      prevValues.shift();
    }

    const rollingAvg = this.getRollingAverage(prevValues, 3);

    // Network spikes are relative only (no absolute threshold for network)
    if (rollingAvg > 100000 && currentValue > rollingAvg * (1 + this.config.networkSpikeThresholdPercent / 100)) {
      if (direction === 'rx') {
        this.state.consecutiveHighNetworkRx++;
      } else {
        this.state.consecutiveHighNetworkTx++;
      }
      
      const requiredSamples = Math.ceil(this.config.networkSpikeSustainedSeconds / this.config.pollingIntervalSeconds);
      const currentConsecutive = direction === 'rx' 
        ? this.state.consecutiveHighNetworkRx 
        : this.state.consecutiveHighNetworkTx;
      
      if (currentConsecutive >= requiredSamples) {
        const spike = this.createSpike(
          metricType as SystemSpike['metricType'],
          'warning',
          rollingAvg,
          currentValue,
          currentConsecutive * this.config.pollingIntervalSeconds,
          { rolling_average: rollingAvg }
        );
        
        if (direction === 'rx') {
          this.state.consecutiveHighNetworkRx = 0;
        } else {
          this.state.consecutiveHighNetworkTx = 0;
        }
        
        return spike;
      }
    } else {
      if (direction === 'rx') {
        this.state.consecutiveHighNetworkRx = 0;
      } else {
        this.state.consecutiveHighNetworkTx = 0;
      }
    }

    return null;
  }

  /**
   * Create a spike event object
   */
  private createSpike(
    metricType: SystemSpike['metricType'],
    severity: SystemSpike['severity'],
    previousValue: number,
    currentValue: number,
    sustainedForSeconds: number,
    details?: Record<string, unknown>
  ): SystemSpike {
    const changePercent = previousValue > 0 
      ? ((currentValue - previousValue) / previousValue) * 100 
      : 0;

    return {
      time: new Date(),
      metricType,
      severity,
      previousValue: Math.round(previousValue * 100) / 100,
      currentValue: Math.round(currentValue * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      sustainedForSeconds,
      details: details || null,
    };
  }

  /**
   * Trim history to prevent memory leaks
   * Keep last 60 samples (5 minutes @ 5s interval)
   */
  private trimHistory(): void {
    const maxHistory = 60;
    if (this.history.length > maxHistory) {
      this.history = this.history.slice(-maxHistory);
    }
  }

  /**
   * Reset all state (useful when restarting monitoring)
   */
  public reset(): void {
    this.history = [];
    this.state = this.initializeState();
    this.firstNetworkSample = true;
    this.lastNetworkRx = 0;
    this.lastNetworkTx = 0;
  }

  /**
   * Get current statistics for debugging
   */
  public getStats(): {
    historySize: number;
    consecutiveCpu: number;
    consecutiveMemory: number;
    consecutiveSwap: number;
    consecutiveNetworkRx: number;
    consecutiveNetworkTx: number;
  } {
    return {
      historySize: this.history.length,
      consecutiveCpu: this.state.consecutiveHighCpu,
      consecutiveMemory: this.state.consecutiveHighMemory,
      consecutiveSwap: this.state.consecutiveHighSwap,
      consecutiveNetworkRx: this.state.consecutiveHighNetworkRx,
      consecutiveNetworkTx: this.state.consecutiveHighNetworkTx,
    };
  }
}
