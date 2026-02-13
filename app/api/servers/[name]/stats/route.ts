import { NextRequest, NextResponse } from 'next/server';
import { getServerStats } from '@/lib/snapshot-manager';
import { requireAuth } from '@/lib/auth';

interface Params {
  params: Promise<{ name: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    await requireAuth(request);
    const { name } = await params;
    const stats = await getServerStats(name);
    
    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Failed to get server stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load server statistics' },
      { status: 500 }
    );
  }
}
