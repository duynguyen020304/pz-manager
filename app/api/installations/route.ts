import { NextRequest, NextResponse } from 'next/server';
import { getPZInstallations } from '@/lib/server-manager';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const installations = getPZInstallations();
    
    return NextResponse.json({
      success: true,
      data: installations
    });
  } catch (error) {
    console.error('Failed to get installations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get installations' },
      { status: 500 }
    );
  }
}
