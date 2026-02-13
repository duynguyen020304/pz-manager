import { NextRequest, NextResponse } from 'next/server';
import { startServer } from '@/lib/server-manager';
import { requireAuth } from '@/lib/auth';

interface Params {
  params: Promise<{ name: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await requireAuth(request);
    const { name } = await params;
    const body = await request.json().catch(() => ({}));
    
    const jobId = await startServer(name, {
      debug: body.debug,
      installationId: body.installationId
    });
    
    return NextResponse.json({
      success: true,
      data: { jobId, message: 'Server start initiated' }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    const message = error instanceof Error ? error.message : 'Failed to start server';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
