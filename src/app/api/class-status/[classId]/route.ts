import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/class-status/[classId]
 * Returns the current status of a class.
 * Used by the student classroom view to poll for class completion and auto-redirect.
 */
export async function GET(
  _req: Request,
  { params }: { params: { classId: string } }
) {
  try {
    const admin = createSupabaseAdmin();
    const { data: cls, error } = await admin
      .from('classes')
      .select('status, zoom_join_url')
      .eq('id', params.classId)
      .maybeSingle();

    if (error || !cls) {
      return NextResponse.json({ status: 'UNKNOWN', isLive: false }, { status: 404 });
    }

    const { data: activeSession } = await admin
      .from('live_sessions')
      .select('id')
      .eq('class_id', params.classId)
      .eq('status', 'active')
      .maybeSingle();

    const isLive = cls.status === 'LIVE' || cls.status === 'IN_PROGRESS' || Boolean(activeSession);

    return NextResponse.json({
      status: cls.status,
      isLive,
      meetingUrl: cls.zoom_join_url || '',
    });
  } catch {
    return NextResponse.json({ status: 'ERROR', isLive: false }, { status: 500 });
  }
}
