import { NextRequest, NextResponse } from 'next/server';
import { getSchedules } from '@/lib/config-manager';
import { backupScheduler, TimerStatus } from '@/lib/backup-scheduler';
import { requireAuth } from '@/lib/auth';
import { Schedule } from '@/types';

interface ScheduleWithStatus extends Schedule {
  status: TimerStatus;
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    
    const schedules = await getSchedules();
    
    const schedulesWithStatus: ScheduleWithStatus[] = await Promise.all(
      schedules.map(async (schedule) => {
        const status = await backupScheduler.getTimerStatus(schedule.name);
        return {
          ...schedule,
          status
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      data: schedulesWithStatus
    });
  } catch (error) {
    console.error('Failed to get schedules:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load schedules' },
      { status: 500 }
    );
  }
}
