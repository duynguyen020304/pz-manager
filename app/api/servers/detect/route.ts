import { NextResponse } from 'next/server';
import { detectAvailableServers } from '@/lib/file-utils';
import { getServers } from '@/lib/config-manager';
import { Server } from '@/types';

const SAVES_PATH = '/root/Zomboid/Saves/Multiplayer';

export async function GET() {
  try {
    const configuredServers = await getServers();
    const detectedServers = await detectAvailableServers(SAVES_PATH);
    
    // Filter out already configured servers
    const availableServers: Server[] = detectedServers
      .filter(s => !configuredServers.includes(s.name))
      .map(s => ({
        name: s.name,
        valid: s.valid,
        hasIni: s.hasIni,
        hasDb: s.hasDb,
        path: s.path
      }));
    
    return NextResponse.json({
      success: true,
      data: availableServers
    });
  } catch (error) {
    console.error('Failed to detect servers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to detect servers' },
      { status: 500 }
    );
  }
}
