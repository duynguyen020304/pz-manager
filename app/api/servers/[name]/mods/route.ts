import { NextRequest, NextResponse } from 'next/server';
import {
  getServerMods,
  downloadMod,
  validateMod,
  extractModId,
  extractModName,
  addModToServer,
  updateModOrder,
  removeModFromServer,
  parseWorkshopIdFromUrl,
  getServerModEntries
} from '@/lib/mod-manager';
import { requireAuth } from '@/lib/auth';

interface Params {
  params: Promise<{ name: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    await requireAuth(request);
    const { name } = await params;
    const url = new URL(request.url);
    const format = url.searchParams.get('format');
    
    if (format === 'entries') {
      const mods = await getServerModEntries(name);
      return NextResponse.json({
        success: true,
        data: mods
      });
    }
    
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

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await requireAuth(request);
    const { name: serverName } = await params;
    
    const body = await request.json();
    const { workshopUrl } = body;
    
    if (!workshopUrl) {
      return NextResponse.json(
        { success: false, error: 'Workshop URL is required' },
        { status: 400 }
      );
    }
    
    const workshopId = parseWorkshopIdFromUrl(workshopUrl);
    
    const existingMods = await getServerMods(serverName);
    const alreadyExists = existingMods.workshopItems.some(w => w.workshopId === workshopId);
    if (alreadyExists) {
      return NextResponse.json(
        { success: false, error: 'This mod is already added to this server' },
        { status: 400 }
      );
    }
    
    const modPath = await downloadMod(workshopId);
    
    const validation = await validateMod(modPath);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.message },
        { status: 400 }
      );
    }
    
    const modId = await extractModId(modPath);
    const modName = await extractModName(modPath, workshopId);
    
    const modEntry = await addModToServer(serverName, workshopId, modId, modName);
    
    return NextResponse.json({
      success: true,
      data: modEntry
    });
  } catch (error) {
    console.error(`Failed to add mod to server ${(await params).name}:`, error);
    const message = error instanceof Error ? error.message : 'Failed to add mod';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await requireAuth(request);
    const { name: serverName } = await params;
    
    const body = await request.json();
    const { mods } = body;
    
    if (!mods || !Array.isArray(mods)) {
      return NextResponse.json(
        { success: false, error: 'Mods array is required' },
        { status: 400 }
      );
    }
    
    await updateModOrder(serverName, mods);
    
    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error(`Failed to update mod order for server ${(await params).name}:`, error);
    const message = error instanceof Error ? error.message : 'Failed to update mod order';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    await requireAuth(request);
    const { name: serverName } = await params;
    
    const body = await request.json();
    const { workshopId } = body;
    
    if (!workshopId) {
      return NextResponse.json(
        { success: false, error: 'Workshop ID is required' },
        { status: 400 }
      );
    }
    
    await removeModFromServer(serverName, workshopId);
    
    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error(`Failed to remove mod from server ${(await params).name}:`, error);
    const message = error instanceof Error ? error.message : 'Failed to remove mod';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
