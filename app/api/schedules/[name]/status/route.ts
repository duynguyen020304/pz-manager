import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { backupScheduler } from '@/lib/backup-scheduler';
import { getSchedules } from '@/lib/config-manager';

interface Params {
  params: Promise<{ name: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: Params
) {
  const { name: scheduleName } = await params;

  try {
    await requireAuth(request);

    const schedules = await getSchedules();
    const schedule = schedules.find(s => s.name === scheduleName);

    if (!schedule) {
      return NextResponse.json(
        { success: false, error: `Schedule '${scheduleName}' not found` },
        { status: 404 }
      );
    }

    const timerStatus = await backupScheduler.getTimerStatus(scheduleName);

    return NextResponse.json({
      success: true,
      data: {
        name: scheduleName,
        exists: timerStatus.exists,
        active: timerStatus.active,
        nextRun: timerStatus.nextRun
      }
    });
  } catch (error) {
    console.error('Failed to get schedule status:', { scheduleName }, error);
    const message = error instanceof Error ? error.message : 'Failed to get schedule status';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
