import { NextRequest, NextResponse } from 'next/server';
import { listSnapshots, deleteSnapshot } from '@/lib/snapshot-manager';

interface Params {
  params: Promise<{ name: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { name } = await params;
    const { searchParams } = new URL(request.url);
    const schedule = searchParams.get('schedule') || undefined;
    
    const snapshots = await listSnapshots(name, schedule);
    
    return NextResponse.json({
      success: true,
      data: snapshots
    });
  } catch (error) {
    console.error('Failed to get snapshots:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load snapshots' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    
    if (!path) {
      return NextResponse.json(
        { success: false, error: 'Snapshot path is required' },
        { status: 400 }
      );
    }
    
    await deleteSnapshot(path);
    
    return NextResponse.json({
      success: true,
      data: { message: 'Snapshot deleted successfully' }
    });
  } catch (error) {
    console.error('Failed to delete snapshot:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete snapshot';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
