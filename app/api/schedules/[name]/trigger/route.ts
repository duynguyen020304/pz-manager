import { NextRequest, NextResponse } from 'next/server';
import { createBackup } from '@/lib/snapshot-manager';
import { requireAuth } from '@/lib/auth';
import fs from 'fs/promises';

interface Params {
  params: Promise<{ name: string }>;
}

const LOCK_FILE = '/opt/zomboid-backups/locks/backup.lock';

async function isBackupInProgress(): Promise<boolean> {
  try {
    await fs.access(LOCK_FILE);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await requireAuth(request);
    const { name: scheduleName } = await params;

    if (!scheduleName) {
      return NextResponse.json(
        { success: false, error: 'Schedule name is required' },
        { status: 400 }
      );
    }

    const backupInProgress = await isBackupInProgress();

    if (backupInProgress) {
      return NextResponse.json(
        { success: false, error: 'Backup already in progress' },
        { status: 409 }
      );
    }

    const jobId = `backup-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    createBackup('all', scheduleName).catch((error) => {
      console.error('[Trigger] Backup failed:', { scheduleName, jobId }, error);
    });

    return NextResponse.json({
      success: true,
      data: { jobId, message: 'Backup started' }
    });
  } catch (error) {
    console.error('Failed to trigger backup:', error);
    const message = error instanceof Error ? error.message : 'Failed to trigger backup';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
