import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/class-status/[classId]
 * Returns the authoritative database status of a class.
 * Provider-specific response format according to Architecture Specification:
 * - meetingProvider: 'ZOOM' | 'GOOGLE_MEET'
 * - zoomJoinUrl: string | null (only if ZOOM)
 * - googleMeetUri: string | null (only if GOOGLE_MEET)
 */
export async function GET(
  _req: Request,
  { params }: { params: { classId: string } }
) {
  try {
    const admin = createSupabaseAdmin();
    const { data: cls, error } = await admin
      .from('classes')
      .select('status, meeting_provider, zoom_join_url, google_meet_uri')
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

    const isGoogleMeet =
      cls.meeting_provider === 'GOOGLE_MEET' ||
      Boolean(cls.google_meet_uri && cls.google_meet_uri.includes('meet.google.com'));

    return NextResponse.json({
      status: cls.status,
      isLive,
      meetingProvider: isGoogleMeet ? 'GOOGLE_MEET' : 'ZOOM',
      zoomJoinUrl: isGoogleMeet ? null : (cls.zoom_join_url || null),
      googleMeetUri: isGoogleMeet ? (cls.google_meet_uri || null) : null,
    });
  } catch {
    return NextResponse.json({ status: 'ERROR', isLive: false }, { status: 500 });
  }
}
