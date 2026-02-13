import { NextRequest, NextResponse } from 'next/server';
import { getAllServerStatus } from '@/lib/server-manager';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const statuses = await getAllServerStatus();
    
    return NextResponse.json({
      success: true,
      data: statuses
    });
  } catch (error) {
    console.error('Failed to get server statuses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get server statuses' },
      { status: 500 }
    );
  }
}
