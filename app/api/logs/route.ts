import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedLogs } from '@/lib/log-manager';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    await requireAuth(request);

    const { searchParams } = new URL(request.url);

    // Parse filters
    const filters = {
      source: searchParams.get('source') || 'backup',
      server: searchParams.get('server') || undefined,
      eventType: searchParams.get('eventType') || undefined,
      username: searchParams.get('username') || undefined,
      level: searchParams.get('level') || undefined,
      from: searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined,
      to: searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined,
      limit: parseInt(searchParams.get('limit') || '100', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10),
    };

    // Validate source
    const validSources = ['backup', 'player', 'server', 'chat', 'pvp', 'skill'];
    if (!validSources.includes(filters.source)) {
      return NextResponse.json(
        { success: false, error: `Invalid source. Must be one of: ${validSources.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await getUnifiedLogs(filters);

    return NextResponse.json({
      success: true,
      data: {
        logs: result.logs,
        pagination: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
          hasMore: filters.offset + result.logs.length < result.total,
        },
      },
    });
  } catch (error) {
    console.error('Failed to fetch unified logs:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch logs';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
