import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  getCurrentMetrics,
  getMonitorConfig,
  updateMonitorConfig,
} from '@/lib/monitor-manager';
import { systemMonitor } from '@/lib/system-monitor';
import type { MonitorConfigInput } from '@/types';

/**
 * GET /api/metrics
 * Returns current system metrics and monitoring status
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'current';

    switch (type) {
      case 'current': {
        const [metrics, config, status] = await Promise.all([
          getCurrentMetrics(),
          getMonitorConfig(),
          Promise.resolve(systemMonitor.getStatus()),
        ]);

        return NextResponse.json({
          success: true,
          data: {
            metrics,
            config,
            status: {
              isRunning: status.isRunning,
              lastSample: status.lastSample,
              totalSamples: status.totalSamples,
              totalSpikes: status.totalSpikes,
              lastError: status.lastError,
            },
          },
        });
      }

      case 'config': {
        const config = await getMonitorConfig();
        return NextResponse.json({
          success: true,
          data: config,
        });
      }

      case 'status': {
        const status = systemMonitor.getStatus();
        return NextResponse.json({
          success: true,
          data: {
            isRunning: status.isRunning,
            lastSample: status.lastSample,
            totalSamples: status.totalSamples,
            totalSpikes: status.totalSpikes,
            lastError: status.lastError,
          },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid type parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Failed to get metrics:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to load metrics';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/metrics
 * Update monitoring configuration
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);

    const body = (await request.json()) as MonitorConfigInput;

    // Validate input
    if (body.pollingIntervalSeconds !== undefined) {
      if (
        body.pollingIntervalSeconds < 1 ||
        body.pollingIntervalSeconds > 300
      ) {
        return NextResponse.json(
          { success: false, error: 'Polling interval must be between 1 and 300 seconds' },
          { status: 400 }
        );
      }
    }

    if (body.dataRetentionDays !== undefined) {
      if (body.dataRetentionDays < 1 || body.dataRetentionDays > 365) {
        return NextResponse.json(
          { success: false, error: 'Data retention must be between 1 and 365 days' },
          { status: 400 }
        );
      }
    }

    if (body.cpuSpikeThresholdPercent !== undefined) {
      if (
        body.cpuSpikeThresholdPercent < 5 ||
        body.cpuSpikeThresholdPercent > 100
      ) {
        return NextResponse.json(
          { success: false, error: 'CPU spike threshold must be between 5 and 100' },
          { status: 400 }
        );
      }
    }

    if (body.memorySpikeThresholdPercent !== undefined) {
      if (
        body.memorySpikeThresholdPercent < 5 ||
        body.memorySpikeThresholdPercent > 100
      ) {
        return NextResponse.json(
          { success: false, error: 'Memory spike threshold must be between 5 and 100' },
          { status: 400 }
        );
      }
    }

    // Update configuration
    const config = await updateMonitorConfig(body);

    // Notify monitor service of config change
    await systemMonitor.updateConfig();

    return NextResponse.json({
      success: true,
      data: config,
      message: 'Configuration updated successfully',
    });
  } catch (error) {
    console.error('Failed to update monitor config:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to update configuration';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
