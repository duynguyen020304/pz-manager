import { NextRequest, NextResponse } from 'next/server';
import { getAllRoles, createRole, getRoleUserCount } from '@/lib/role-manager';
import { requireAuth } from '@/lib/auth';
import type { CreateRoleInput } from '@/types';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const roles = await getAllRoles();

    // Fetch user counts for each role
    const rolesWithCounts = await Promise.all(
      roles.map(async (role) => ({
        ...role,
        userCount: await getRoleUserCount(role.id),
      }))
    );

    return NextResponse.json({
      success: true,
      data: { roles: rolesWithCounts },
    });
  } catch (error) {
    console.error('Failed to fetch roles:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch roles';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
    const body: CreateRoleInput = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Role name is required' },
        { status: 400 }
      );
    }

    if (!body.permissions || Object.keys(body.permissions).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Role permissions are required' },
        { status: 400 }
      );
    }

    const role = await createRole(body);

    return NextResponse.json(
      { 
        success: true, 
        data: { role }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create role:', error);
    const message = error instanceof Error ? error.message : 'Failed to create role';
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
