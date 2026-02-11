import { NextResponse } from 'next/server';
import { getAllServerStatus } from '@/lib/server-manager';

export async function GET() {
  try {
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
