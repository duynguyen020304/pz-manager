import { NextResponse } from 'next/server';
import { getPZInstallations } from '@/lib/server-manager';

export async function GET() {
  try {
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
