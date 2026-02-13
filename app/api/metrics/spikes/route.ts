import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getRecentSpikes, getSpikesByType } from '@/lib/monitor-manager';
import type { SystemSpike } from '@/types';

/**
 * GET /api/metrics/spikes
 * Returns detected spike events
 * 
 * Query parameters:
 * - hours: Number of hours to look back (default: 24, max: 168)
 * - type: Filter by metric type (cpu, memory, swap, network_rx, network_tx)
 * - limit: Maximum number of results (default: 100, max: 1000)
 * - severity: Filter by severity (warning, critical)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24', 10);
    const type = searchParams.get('type') as SystemSpike['metricType'] | null;
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const severity = searchParams.get('severity') as
      | SystemSpike['severity']
      | null;

    // Validate parameters
    if (hours < 1 || hours > 168) {
      return NextResponse.json(
        { success: false, error: 'Hours must be between 1 and 168 (7 days)' },
        { status: 400 }
      );
    }

    if (limit < 1 || limit > 1000) {
      return NextResponse.json(
        { success: false, error: 'Limit must be between 1 and 1000' },
        { status: 400 }
      );
    }

    if (
      type &&
      !['cpu', 'memory', 'swap', 'network_rx', 'network_tx'].includes(type)
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid spike type' },
        { status: 400 }
      );
    }

    if (severity && !['warning', 'critical'].includes(severity)) {
      return NextResponse.json(
        { success: false, error: 'Invalid severity level' },
        { status: 400 }
      );
    }

    // Get spikes
    let spikes: Awaited<ReturnType<typeof getRecentSpikes>>;

    if (type) {
      spikes = await getSpikesByType(type, hours, limit);
    } else {
      spikes = await getRecentSpikes(hours, limit);
    }

    // Filter by severity if specified
    if (severity) {
      spikes = spikes.filter((spike) => spike.severity === severity);
    }

    // Calculate statistics
    const stats = {
      total: spikes.length,
      byType: {
        cpu: spikes.filter((s) => s.metricType === 'cpu').length,
        memory: spikes.filter((s) => s.metricType === 'memory').length,
        swap: spikes.filter((s) => s.metricType === 'swap').length,
        network_rx: spikes.filter((s) => s.metricType === 'network_rx').length,
        network_tx: spikes.filter((s) => s.metricType === 'network_tx').length,
      },
      bySeverity: {
        warning: spikes.filter((s) => s.severity === 'warning').length,
        critical: spikes.filter((s) => s.severity === 'critical').length,
      },
    };

    return NextResponse.json({
      success: true,
      data: {
        spikes,
        stats,
        meta: {
          hours,
          limit,
          typeFilter: type,
          severityFilter: severity,
        },
      },
    });
  } catch (error) {
    console.error('Failed to get spikes:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to load spike data';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
