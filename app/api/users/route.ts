import { NextRequest, NextResponse } from 'next/server';
import { listUsers, createUser, countUsers, countActiveUsers } from '@/lib/user-manager';
import type { CreateUserInput } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const roleId = searchParams.get('roleId') 
      ? parseInt(searchParams.get('roleId')!, 10) 
      : undefined;
    const isActive = searchParams.get('isActive') 
      ? searchParams.get('isActive') === 'true' 
      : undefined;
    const search = searchParams.get('search') || undefined;

    const [usersResult, total, activeCount] = await Promise.all([
      listUsers({ page, limit, roleId, isActive, search }),
      countUsers(),
      countActiveUsers(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        users: usersResult.data,
        pagination: {
          total: usersResult.total,
          page: usersResult.page,
          limit: usersResult.limit,
          totalPages: usersResult.totalPages,
        },
        stats: {
          total,
          active: activeCount,
          inactive: total - activeCount,
        },
      },
    });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch users';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateUserInput = await request.json();

    // Validate required fields
    if (!body.username || !body.password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    if (!body.roleId) {
      return NextResponse.json(
        { success: false, error: 'Role ID is required' },
        { status: 400 }
      );
    }

    const user = await createUser(body);

    return NextResponse.json(
      { 
        success: true, 
        data: { 
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            roleId: user.roleId,
            isActive: user.isActive,
            createdAt: user.createdAt,
          }
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create user:', error);
    const message = error instanceof Error ? error.message : 'Failed to create user';
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
