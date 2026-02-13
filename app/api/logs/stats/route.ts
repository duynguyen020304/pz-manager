import { NextRequest, NextResponse } from 'next/server';
import { getLogStats } from '@/lib/log-manager';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const server = searchParams.get('server') || undefined;

    const stats = await getLogStats(server);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Failed to fetch log stats:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch log stats';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
