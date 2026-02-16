import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  readSandboxVars,
  writeSandboxVars,
  updateSandboxVars,
  applyPreset,
  resetSandboxVars,
  getSandboxVarsFilePath,
} from '@/lib/sandbox-vars-manager';
import { getPreset } from '@/lib/difficulty-presets';
import { SandboxVars, SandboxVarsUpdateRequest } from '@/lib/sandbox-vars-types';

interface SandboxVarsResponse {
  serverName: string;
  config: SandboxVars;
  filePath: string;
  exists: boolean;
}

// GET /api/servers/[name]/sandbox-vars - Read server SandboxVars configuration
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    await requireAuth(request);
    const { name } = await params;
    const config = await readSandboxVars(name);
    const filePath = getSandboxVarsFilePath(name);

    return NextResponse.json({
      success: true,
      data: {
        serverName: name,
        config,
        filePath,
      } as SandboxVarsResponse,
    });
  } catch (error) {
    console.error('Failed to read SandboxVars:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read SandboxVars',
      },
      { status: 500 }
    );
  }
}

// POST /api/servers/[name]/sandbox-vars - Update full config, partial updates, or apply preset
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    await requireAuth(request);
    const { name } = await params;
    const body: SandboxVarsUpdateRequest = await request.json();

    let updatedConfig: SandboxVars;

    if (body.applyPreset) {
      const presetConfig = getPreset(body.applyPreset);
      if (!presetConfig) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid preset: ${body.applyPreset}`,
          },
          { status: 400 }
        );
      }
      updatedConfig = await applyPreset(name, presetConfig);
    } else if (body.config) {
      await writeSandboxVars(name, body.config);
      updatedConfig = body.config;
    } else if (body.updates) {
      updatedConfig = await updateSandboxVars(name, body.updates);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'No config, updates, or applyPreset provided',
        },
        { status: 400 }
      );
    }

    const filePath = getSandboxVarsFilePath(name);

    return NextResponse.json({
      success: true,
      data: {
        serverName: name,
        config: updatedConfig,
        filePath,
      } as SandboxVarsResponse,
    });
  } catch (error) {
    console.error('Failed to update SandboxVars:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update SandboxVars',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/servers/[name]/sandbox-vars - Reset SandboxVars to defaults
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    await requireAuth(request);
    const { name } = await params;

    const defaultConfig = await resetSandboxVars(name);
    const filePath = getSandboxVarsFilePath(name);

    return NextResponse.json({
      success: true,
      data: {
        serverName: name,
        config: defaultConfig,
        filePath,
      } as SandboxVarsResponse,
    });
  } catch (error) {
    console.error('Failed to reset SandboxVars:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset SandboxVars',
      },
      { status: 500 }
    );
  }
}
