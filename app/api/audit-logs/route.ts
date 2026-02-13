import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import type { AuditLog } from '@/types';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const action = searchParams.get('action') || undefined;
    const resourceType = searchParams.get('resourceType') || undefined;
    const userId = searchParams.get('userId') 
      ? parseInt(searchParams.get('userId')!, 10) 
      : undefined;
    const startTime = searchParams.get('startTime') 
      ? new Date(searchParams.get('startTime')!) 
      : undefined;
    const endTime = searchParams.get('endTime') 
      ? new Date(searchParams.get('endTime')!) 
      : undefined;

    // Build query conditions
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (action) {
      conditions.push(`action = $${paramIndex++}`);
      params.push(action);
    }

    if (resourceType) {
      conditions.push(`resource_type = $${paramIndex++}`);
      params.push(resourceType);
    }

    if (userId) {
      conditions.push(`user_id = $${paramIndex++}`);
      params.push(userId);
    }

    if (startTime) {
      conditions.push(`time >= $${paramIndex++}`);
      params.push(startTime);
    }

    if (endTime) {
      conditions.push(`time <= $${paramIndex++}`);
      params.push(endTime);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const logs = await query<{
      time: Date;
      user_id: number | null;
      username: string | null;
      action: string;
      resource_type: string;
      resource_id: string | null;
      details: Record<string, unknown> | null;
      ip_address: string | null;
    }>(
      `SELECT * FROM audit_logs 
       ${whereClause}
       ORDER BY time DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM audit_logs ${whereClause}`,
      params
    );

    const formattedLogs: AuditLog[] = logs.map(log => ({
      time: log.time,
      userId: log.user_id,
      username: log.username,
      action: log.action,
      resourceType: log.resource_type,
      resourceId: log.resource_id,
      details: log.details,
      ipAddress: log.ip_address,
    }));

    return NextResponse.json({
      success: true,
      data: {
        logs: formattedLogs,
        pagination: {
          total: parseInt(countResult[0]?.count || '0', 10),
          limit,
          offset,
        },
      },
    });
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch audit logs';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
