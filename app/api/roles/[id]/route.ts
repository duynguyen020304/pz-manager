import { NextRequest, NextResponse } from 'next/server';
import { getRoleById, updateRole, deleteRole, getRoleUserCount } from '@/lib/role-manager';
import { requireAuth } from '@/lib/auth';
import type { UpdateRoleInput } from '@/types';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth(request);
    const { id } = await params;
    const roleId = parseInt(id, 10);
    
    if (isNaN(roleId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role ID' },
        { status: 400 }
      );
    }

    const [role, userCount] = await Promise.all([
      getRoleById(roleId),
      getRoleUserCount(roleId),
    ]);

    if (!role) {
      return NextResponse.json(
        { success: false, error: 'Role not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { 
        role: {
          ...role,
          userCount,
        }
      },
    });
  } catch (error) {
    console.error('Failed to fetch role:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch role';
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
    const roleId = parseInt(id, 10);
    
    if (isNaN(roleId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role ID' },
        { status: 400 }
      );
    }

    const body: UpdateRoleInput = await request.json();
    const role = await updateRole(roleId, body);

    return NextResponse.json({
      success: true,
      data: { role },
    });
  } catch (error) {
    console.error('Failed to update role:', error);
    const message = error instanceof Error ? error.message : 'Failed to update role';
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
    const roleId = parseInt(id, 10);
    
    if (isNaN(roleId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role ID' },
        { status: 400 }
      );
    }

    await deleteRole(roleId);

    return NextResponse.json({
      success: true,
      data: { message: 'Role deleted successfully' },
    });
  } catch (error) {
    console.error('Failed to delete role:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete role';
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
