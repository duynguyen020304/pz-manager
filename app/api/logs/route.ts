import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedLogs, getUnifiedLogsSince } from '@/lib/log-manager';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const { searchParams } = new URL(request.url);

    const source = searchParams.get('source');
    const server = searchParams.get('server');
    const typesParam = searchParams.get('types');
    const sinceParam = searchParams.get('since');

    if (source === 'unified' || typesParam) {
      const types = typesParam ? typesParam.split(',').map(t => t.trim()) : [];
      const since = sinceParam ? new Date(sinceParam) : undefined;
      const limit = parseInt(searchParams.get('limit') || '100', 10);

      if (!server) {
        return NextResponse.json(
          { success: false, error: 'Server parameter is required for unified logs' },
          { status: 400 }
        );
      }

      const logs = await getUnifiedLogsSince(server, types, since, limit);

      return NextResponse.json({
        success: true,
        data: {
          logs,
          pagination: {
            total: logs.length,
            limit,
            offset: 0,
            hasMore: false,
          },
        },
      });
    }

    const filters = {
      source: source || 'backup',
      server: server || undefined,
      eventType: searchParams.get('eventType') || undefined,
      username: searchParams.get('username') || undefined,
      search: searchParams.get('search') || undefined,
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
