import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  listApiTokens,
  createApiToken,
} from '@/lib/api-token-manager';
import type { CreateTokenInput } from '@/types';

// GET /api/tokens - List user's tokens
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth(request);
    const tokens = await listApiTokens(user.id);

    return NextResponse.json({
      success: true,
      data: { tokens },
    });
  } catch (error) {
    console.error('Failed to fetch tokens:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch tokens';
    const status = message === 'Authentication required' ? 401 : 500;
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}

// POST /api/tokens - Create new token
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth(request);
    const body: CreateTokenInput = await request.json();

    if (!body.name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Token name is required' },
        { status: 400 }
      );
    }

    const result = await createApiToken(user.id, body);

    return NextResponse.json({
      success: true,
      data: {
        token: result.rawToken,
        tokenInfo: result.tokenInfo,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create token:', error);
    const message = error instanceof Error ? error.message : 'Failed to create token';
    const status = message === 'Authentication required' ? 401 : 400;
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
