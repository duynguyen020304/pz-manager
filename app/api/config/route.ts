import { NextRequest, NextResponse } from 'next/server';
import { 
  loadConfig, 
  saveConfig, 
  updateSchedule,
  updateCompression,
  updateIntegrity,
  updateAutoRollback
} from '@/lib/config-manager';
import { requireAuth } from '@/lib/auth';
import { BackupConfig, CompressionConfig, IntegrityConfig, AutoRollbackConfig } from '@/types';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const config = await loadConfig();
    
    return NextResponse.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Failed to load config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
    const config = await request.json() as BackupConfig;
    
    await saveConfig(config);
    
    return NextResponse.json({
      success: true,
      data: { message: 'Configuration saved successfully' }
    });
  } catch (error) {
    console.error('Failed to save config:', error);
    const message = error instanceof Error ? error.message : 'Failed to save configuration';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAuth(request);
    const { type, data } = await request.json();
    
    switch (type) {
      case 'schedule': {
        const { name, ...updates } = data;
        await updateSchedule(name, updates);
        break;
      }
      case 'compression': {
        await updateCompression(data as Partial<CompressionConfig>);
        break;
      }
      case 'integrity': {
        await updateIntegrity(data as Partial<IntegrityConfig>);
        break;
      }
      case 'autoRollback': {
        await updateAutoRollback(data as Partial<AutoRollbackConfig>);
        break;
      }
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid update type' },
          { status: 400 }
        );
    }
    
    return NextResponse.json({
      success: true,
      data: { message: 'Configuration updated successfully' }
    });
  } catch (error) {
    console.error('Failed to update config:', error);
    const message = error instanceof Error ? error.message : 'Failed to update configuration';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
