import { NextRequest, NextResponse } from 'next/server';
import { getRunningServers, getAllServerStatus } from '@/lib/server-manager';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const runningServers = await getRunningServers();
    const allStatuses = await getAllServerStatus();

    return NextResponse.json({
      success: true,
      data: {
        running: runningServers,
        all: allStatuses
      }
    });
  } catch (error) {
    console.error('Failed to get running servers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get running servers' },
      { status: 500 }
    );
  }
}
