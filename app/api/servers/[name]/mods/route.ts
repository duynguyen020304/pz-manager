import { NextResponse } from 'next/server';
import { getServerMods } from '@/lib/mod-manager';

interface Params {
  params: Promise<{ name: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { name } = await params;
    const mods = await getServerMods(name);
    
    return NextResponse.json({
      success: true,
      data: mods
    });
  } catch (error) {
    console.error(`Failed to get mods for server ${(await params).name}:`, error);
    const message = error instanceof Error ? error.message : 'Failed to load server mods';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
