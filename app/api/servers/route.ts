import { NextRequest, NextResponse } from 'next/server';
import { getServers, addServer, removeServer } from '@/lib/config-manager';
import { detectAvailableServers } from '@/lib/file-utils';
import { requireAuth } from '@/lib/auth';
import { Server } from '@/types';
import { SERVERS_PATH } from '@/lib/paths';

const SAVES_PATH = SERVERS_PATH;

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const serverNames = await getServers();
    const detectedServers = await detectAvailableServers(SAVES_PATH);
    
    // Merge configured servers with detection info
    const servers: Server[] = serverNames.map(name => {
      const detected = detectedServers.find(s => s.name === name);
      return {
        name,
        valid: detected?.valid || false,
        hasIni: detected?.hasIni || false,
        hasDb: detected?.hasDb || false,
        path: detected?.path || `${SAVES_PATH}/${name}`
      };
    });
    
    return NextResponse.json({
      success: true,
      data: servers
    });
  } catch (error) {
    console.error('Failed to get servers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load servers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
    const { name } = await request.json();
    
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Server name is required' },
        { status: 400 }
      );
    }
    
    // Validate server name (alphanumeric, hyphens, underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return NextResponse.json(
        { success: false, error: 'Invalid server name format' },
        { status: 400 }
      );
    }
    
    await addServer(name);
    
    return NextResponse.json({
      success: true,
      data: { message: `Server '${name}' added successfully` }
    });
  } catch (error) {
    console.error('Failed to add server:', error);
    const message = error instanceof Error ? error.message : 'Failed to add server';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Server name is required' },
        { status: 400 }
      );
    }
    
    await removeServer(name);
    
    return NextResponse.json({
      success: true,
      data: { message: `Server '${name}' removed successfully` }
    });
  } catch (error) {
    console.error('Failed to remove server:', error);
    const message = error instanceof Error ? error.message : 'Failed to remove server';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
