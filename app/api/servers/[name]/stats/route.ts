import { NextResponse } from 'next/server';
import { getServerStats } from '@/lib/snapshot-manager';

interface Params {
  params: Promise<{ name: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  try {
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
