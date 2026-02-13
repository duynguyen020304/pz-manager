import { NextRequest, NextResponse } from 'next/server';
import { getUserByIdWithRole, updateUser, deleteUser } from '@/lib/user-manager';
import { requireAuth } from '@/lib/auth';
import type { UpdateUserInput } from '@/types';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth(request);
    const { id } = await params;
    const userId = parseInt(id, 10);
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const user = await getUserByIdWithRole(userId);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Failed to fetch user:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch user';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth(request);
    const { id } = await params;
    const userId = parseInt(id, 10);
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const body: UpdateUserInput = await request.json();
    
    // Prevent updating own account through this endpoint if needed
    // This could be enhanced with proper authorization checks

    const user = await updateUser(userId, body);

    return NextResponse.json({
      success: true,
      data: { 
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          roleId: user.roleId,
          isActive: user.isActive,
          updatedAt: user.updatedAt,
        }
      },
    });
  } catch (error) {
    console.error('Failed to update user:', error);
    const message = error instanceof Error ? error.message : 'Failed to update user';
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth(request);
    const { id } = await params;
    const userId = parseInt(id, 10);
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    await deleteUser(userId);

    return NextResponse.json({
      success: true,
      data: { message: 'User deleted successfully' },
    });
  } catch (error) {
    console.error('Failed to delete user:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete user';
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
