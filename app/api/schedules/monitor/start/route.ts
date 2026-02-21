import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { backupScheduler } from '@/lib/backup-scheduler';

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
    await backupScheduler.start();

    return NextResponse.json({
      success: true,
      data: { running: true }
    });
  } catch (error) {
    console.error('Failed to start backup scheduler:', error);
    const message = error instanceof Error ? error.message : 'Failed to start backup scheduler';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAuth(request);
    backupScheduler.stop();

    return NextResponse.json({
      success: true,
      data: { running: false }
    });
  } catch (error) {
    console.error('Failed to stop backup scheduler:', error);
    const message = error instanceof Error ? error.message : 'Failed to stop backup scheduler';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
