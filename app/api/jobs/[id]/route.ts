import { NextRequest, NextResponse } from 'next/server';
import { getJobStatus } from '@/lib/snapshot-manager';
import { getServerJobStatus } from '@/lib/server-manager';
import { requireAuth } from '@/lib/auth';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    await requireAuth(request);
    const { id } = await params;
    
    // Check for restore job first
    const restoreJob = getJobStatus(id);
    if (restoreJob) {
      return NextResponse.json({
        success: true,
        data: restoreJob
      });
    }
    
    // Check for server job
    const serverJob = getServerJobStatus(id);
    if (serverJob) {
      return NextResponse.json({
        success: true,
        data: serverJob
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Job not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Failed to get job status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get job status' },
      { status: 500 }
    );
  }
}
