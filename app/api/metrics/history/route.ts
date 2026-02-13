import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getMetricsTimeSeries } from '@/lib/monitor-manager';

/**
 * GET /api/metrics/history
 * Returns historical time-series metrics data
 * 
 * Query parameters:
 * - hours: Number of hours to look back (default: 1, max: 168)
 * - interval: Aggregation interval in seconds (default: 60)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '1', 10);
    const intervalSeconds = parseInt(searchParams.get('interval') || '60', 10);

    // Validate parameters
    if (hours < 1 || hours > 168) {
      return NextResponse.json(
        { success: false, error: 'Hours must be between 1 and 168 (7 days)' },
        { status: 400 }
      );
    }

    if (intervalSeconds < 5 || intervalSeconds > 3600) {
      return NextResponse.json(
        { success: false, error: 'Interval must be between 5 and 3600 seconds' },
        { status: 400 }
      );
    }

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

    const timeSeries = await getMetricsTimeSeries(
      startTime,
      endTime,
      intervalSeconds
    );

    return NextResponse.json({
      success: true,
      data: {
        timeSeries,
        meta: {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          hours,
          intervalSeconds,
          dataPoints: timeSeries.length,
        },
      },
    });
  } catch (error) {
    console.error('Failed to get metrics history:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to load metrics history';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
