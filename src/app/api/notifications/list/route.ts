import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/notifications';

/**
 * GET /api/notifications/list
 * Returns notifications list for current user.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ notifications: [] });
    }
    const limitParam = req.nextUrl.searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 20, 50) : 20;
    const result = await listNotifications(limit);
    if (!result.success) {
      return NextResponse.json({ notifications: [] });
    }
    return NextResponse.json({ notifications: result.data });
  } catch {
    return NextResponse.json({ notifications: [] });
  }
}

/**
 * POST /api/notifications/list
 * Mark notification(s) as read.
 * Body: { id: string } | { all: true }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    if (body?.all === true) {
      await markAllNotificationsRead();
      return NextResponse.json({ success: true });
    }

    if (body?.id) {
      const result = await markNotificationRead(body.id);
      return NextResponse.json({ success: result.success });
    }

    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
