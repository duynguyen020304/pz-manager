import { NextRequest, NextResponse } from 'next/server';
import { abortServerStart } from '@/lib/server-manager';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const body = await request.json();

    if (!body.jobId) {
      return NextResponse.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const aborted = await abortServerStart(body.jobId);

    if (!aborted) {
      return NextResponse.json(
        { success: false, error: 'Job not found or already completed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Server start aborted' }
    });
  } catch (error) {
    console.error('Abort server start error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to abort server start' },
      { status: 500 }
    );
  }
}
