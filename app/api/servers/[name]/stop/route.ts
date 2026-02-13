import { NextRequest, NextResponse } from 'next/server';
import { stopServer } from '@/lib/server-manager';
import { requireAuth } from '@/lib/auth';

interface Params {
  params: Promise<{ name: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await requireAuth(request);
    const { name } = await params;
    const jobId = await stopServer(name);
    
    return NextResponse.json({
      success: true,
      data: { jobId, message: 'Server stop initiated' }
    });
  } catch (error) {
    console.error('Failed to stop server:', error);
    const message = error instanceof Error ? error.message : 'Failed to stop server';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
