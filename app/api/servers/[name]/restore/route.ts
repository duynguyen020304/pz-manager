import { NextRequest, NextResponse } from 'next/server';
import { restoreSnapshot } from '@/lib/snapshot-manager';

interface Params {
  params: Promise<{ name: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { name } = await params;
    const { snapshotPath } = await request.json();
    
    if (!snapshotPath) {
      return NextResponse.json(
        { success: false, error: 'Snapshot path is required' },
        { status: 400 }
      );
    }
    
    const jobId = await restoreSnapshot(name, snapshotPath);
    
    return NextResponse.json({
      success: true,
      data: { jobId, message: 'Restore started' }
    });
  } catch (error) {
    console.error('Failed to start restore:', error);
    const message = error instanceof Error ? error.message : 'Failed to start restore';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
