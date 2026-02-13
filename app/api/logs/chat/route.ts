import { NextRequest, NextResponse } from 'next/server';
import { getChatMessages } from '@/lib/log-manager';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    await requireAuth(request);

    const { searchParams } = new URL(request.url);

    // Parse filters
    const filters = {
      server: searchParams.get('server') || undefined,
      username: searchParams.get('username') || undefined,
      from: searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined,
      to: searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined,
      limit: parseInt(searchParams.get('limit') || '100', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10),
    };

    const result = await getChatMessages(filters);

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
    console.error('Failed to fetch chat messages:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch chat messages';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
