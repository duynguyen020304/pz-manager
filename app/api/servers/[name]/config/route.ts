import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  readIniFile,
  writeIniFile,
  updateIniValues,
  IniConfig,
} from '@/lib/ini-config-manager';
import { parseBooleanValue, parseNumberValue, booleanToString } from '@/lib/ini-utils';

interface ConfigUpdateRequest {
  config?: IniConfig;
  updates?: Record<string, string>;
}

// GET /api/servers/[name]/config - Read server INI configuration
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    await requireAuth(request);
    const { name } = await params;
    const config = await readIniFile(name);

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Failed to read server config:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read configuration',
      },
      { status: 500 }
    );
  }
}

// POST /api/servers/[name]/config - Update full config or partial updates
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    await requireAuth(request);
    const { name } = await params;
    const body: ConfigUpdateRequest = await request.json();

    if (body.config) {
      // Full config replacement
      await writeIniFile(name, body.config);
    } else if (body.updates) {
      // Partial update
      await updateIniValues(name, body.updates);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'No config or updates provided',
        },
        { status: 400 }
      );
    }

    // Return updated config
    const updatedConfig = await readIniFile(name);

    return NextResponse.json({
      success: true,
      data: updatedConfig,
    });
  } catch (error) {
    console.error('Failed to update server config:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update configuration',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/servers/[name]/config - Reset config to defaults (optional)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    await requireAuth(request);
    const { name } = await params;

    // Reset to empty config (server will regenerate defaults)
    await writeIniFile(name, {});

    return NextResponse.json({
      success: true,
      message: 'Configuration reset to defaults',
    });
  } catch (error) {
    console.error('Failed to reset server config:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset configuration',
      },
      { status: 500 }
    );
  }
}

export { parseBooleanValue, parseNumberValue, booleanToString };
