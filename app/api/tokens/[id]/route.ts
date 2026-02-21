import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  getApiToken,
  updateApiToken,
  deleteApiToken,
} from '@/lib/api-token-manager';
import type { UpdateTokenInput } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/tokens/[id] - Get single token
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await requireAuth(request);
    const { id } = await params;

    const token = await getApiToken(id, user.id);
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { token },
    });
  } catch (error) {
    console.error('Failed to fetch token:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch token';
    const status = message === 'Authentication required' ? 401 : 500;
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}

// PATCH /api/tokens/[id] - Update token
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await requireAuth(request);
    const { id } = await params;
    const body: UpdateTokenInput = await request.json();

    const token = await updateApiToken(id, user.id, body);

    return NextResponse.json({
      success: true,
      data: { token },
    });
  } catch (error) {
    console.error('Failed to update token:', error);
    const message = error instanceof Error ? error.message : 'Failed to update token';
    const status = message === 'Token not found' ? 404 : message === 'Authentication required' ? 401 : 400;
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}

// DELETE /api/tokens/[id] - Revoke/delete token
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await requireAuth(request);
    const { id } = await params;

    await deleteApiToken(id, user.id);

    return NextResponse.json({
      success: true,
      data: { message: 'Token revoked successfully' },
    });
  } catch (error) {
    console.error('Failed to revoke token:', error);
    const message = error instanceof Error ? error.message : 'Failed to revoke token';
    const status = message === 'Token not found' ? 404 : message === 'Authentication required' ? 401 : 400;
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
