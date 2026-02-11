import { NextResponse } from 'next/server';
import { getServerStatus } from '@/lib/server-manager';

interface Params {
  params: Promise<{ name: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { name } = await params;
    const status = await getServerStatus(name);
    
    return NextResponse.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Failed to get server status:', error);
    const message = error instanceof Error ? error.message : 'Failed to get server status';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
