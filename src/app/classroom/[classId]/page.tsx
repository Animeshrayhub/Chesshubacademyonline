import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { getClassStudents, getOrCreateActiveLiveSession } from '@/lib/classes';
import { getCanonicalClassroomSnapshot } from '@/lib/classroom-v2/server';
import { ClassroomStateProvider } from '@/components/classroom-v2/ClassroomStateProvider';
import ClassroomShell from '@/components/classroom-v2/ClassroomShell';
import ClassroomWaitingRoom from '@/components/classroom-v2/ClassroomWaitingRoom';
import ClassCompletedView from '@/components/classroom-v2/ClassCompletedView';

export const dynamic = 'force-dynamic';

export default async function ClassroomPage({ params }: { params: { classId: string } }) {
  const idRegex = /^[a-z0-9-]{3,50}$/i;
  if (!idRegex.test(params.classId)) {
    redirect('/unauthorized');
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?redirectTo=/classroom/${params.classId}`);
  }

  const admin = createSupabaseAdmin();

  // 1. Fetch class details
  const { data: cls, error: clsErr } = await admin
    .from('classes')
    .select('*')
    .eq('id', params.classId)
    .is('archived_at', null)
    .maybeSingle();

  if (clsErr || !cls) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center p-6 text-center select-none font-sans">
        <div className="max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-2xl">
            ♟️
          </div>
          <h1 className="text-xl font-bold font-heading mb-2">Classroom Session Not Found</h1>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            The requested live classroom session does not exist, has been completed, or was archived.
          </p>
          <a
            href="/dashboard"
            className="inline-block py-2.5 px-6 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // 2. Fetch coach details cleanly
  let coachName = 'Academy Coach';
  let coachUserId = '';

  if (cls.coach_id) {
    const { data: coachProfile } = await admin
      .from('coach_profiles')
      .select('user_id, title')
      .eq('id', cls.coach_id)
      .maybeSingle();

    if (coachProfile) {
      coachUserId = coachProfile.user_id;
      const { data: coachUser } = await admin
        .from('users')
        .select('first_name, last_name')
        .eq('id', coachProfile.user_id)
        .maybeSingle();

      if (coachUser) {
        coachName = `${coachProfile.title || 'Coach'} ${coachUser.first_name} ${coachUser.last_name}`;
      }
    } else {
      const { data: directCoachUser } = await admin
        .from('users')
        .select('id, first_name, last_name')
        .eq('id', cls.coach_id)
        .maybeSingle();

      if (directCoachUser) {
        coachUserId = directCoachUser.id;
        coachName = `Coach ${directCoachUser.first_name} ${directCoachUser.last_name}`;
      }
    }
  }

  // 3. Fetch students details
  const studentsRes = await getClassStudents(params.classId);
  const students = studentsRes.success && studentsRes.data ? studentsRes.data : [];

  // 4. Resolve authenticated user's role and verify authorization
  const { data: dbUser } = await admin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = (dbUser?.role?.toLowerCase() || 'student') as 'admin' | 'coach' | 'student';

  let isAuthorized = false;
  let coachProfileId: string | null = null;

  if (role === 'admin') {
    isAuthorized = true;
  } else if (role === 'coach') {
    // Strictly verify if THIS coach is assigned to this class!
    const { data: cp } = await admin
      .from('coach_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    coachProfileId = cp?.id || null;

    if (
      cls.coach_id === user.id ||
      (coachProfileId && cls.coach_id === coachProfileId) ||
      coachUserId === user.id
    ) {
      isAuthorized = true;
    }
  } else if (role === 'student') {
    let { data: sp } = await admin
      .from('student_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!sp) {
      const { data: newSp } = await admin
        .from('student_profiles')
        .insert({ user_id: user.id, level: 'BEGINNER' })
        .select('id')
        .single();
      sp = newSp;
    }

    if (sp) {
      const { data: enrollment } = await admin
        .from('class_students')
        .select('id')
        .eq('class_id', params.classId)
        .or(`student_id.eq.${sp.id},student_id.eq.${user.id}`)
        .is('archived_at', null)
        .maybeSingle();

      if (enrollment) {
        isAuthorized = true;
      }
    } else {
      const { data: directEnrollment } = await admin
        .from('class_students')
        .select('id')
        .eq('class_id', params.classId)
        .eq('student_id', user.id)
        .is('archived_at', null)
        .maybeSingle();

      if (directEnrollment) {
        isAuthorized = true;
      }
    }

    if (cls.status === 'CANCELLED') isAuthorized = false;
  }

  if (!isAuthorized) {
    try {
      const { logClassroomAudit } = await import('@/lib/classroom-v2/audit');
      await logClassroomAudit({
        classId: params.classId,
        actorId: user.id,
        actorRole: role,
        action: 'UNAUTHORIZED_ATTEMPT_BLOCKED',
        metadata: { reason: 'User not authorized for this class' },
      });
    } catch {}

    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center p-6 text-center select-none font-sans">
        <div className="max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-2xl text-rose-400">
            🔒
          </div>
          <h1 className="text-xl font-bold font-heading mb-2">Access Denied</h1>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            You do not have permission to access this live classroom session. Only assigned coaches, enrolled students, or administrators may enter.
          </p>
          <a
            href="/dashboard"
            className="inline-block py-2.5 px-6 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all shadow-md"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // 4a. Check if class is COMPLETED or RECORDING_AVAILABLE (Authoritative DB check)
  if (cls.status === 'COMPLETED' || cls.status === 'RECORDING_AVAILABLE') {
    let reportNotes: string | null = null;
    const { data: report } = await admin
      .from('class_reports')
      .select('topics_covered, coach_notes')
      .eq('class_id', params.classId)
      .maybeSingle();

    if (report) {
      reportNotes = report.topics_covered || report.coach_notes || null;
    }

    let attendanceStatus: string | null = null;
    let feedback: string | null = null;
    if (role === 'student') {
      const { data: cs } = await admin
        .from('class_students')
        .select('attendance_status, notes')
        .eq('class_id', params.classId)
        .or(`student_id.eq.${user.id}`)
        .maybeSingle();

      attendanceStatus = cs?.attendance_status || 'COMPLETED';
      feedback = cs?.notes || null;
    }

    return (
      <ClassCompletedView
        classId={params.classId}
        className={cls.title || cls.topic || cls.name || 'Live Chess Classroom'}
        coachName={coachName}
        scheduledStart={cls.scheduled_start}
        durationMinutes={cls.duration_minutes || 60}
        reportNotes={reportNotes}
        attendanceStatus={attendanceStatus}
        feedback={feedback}
        role={role}
      />
    );
  }

  // 4b. Check Admin Early Start policy for Coach
  if (role === 'coach' && cls.status === 'SCHEDULED') {
    try {
      const { getSystemConfig } = await import('@/utils/systemConfig');
      const sysConfig = await getSystemConfig();
      const earlyStartAllowed = sysConfig.CLASSROOM_EARLY_START_ALLOWED !== 'false';
      const earlyStartMins = parseInt(sysConfig.CLASSROOM_EARLY_START_MINUTES || '30', 10);
      const scheduledTime = new Date(cls.scheduled_start).getTime();
      const earliestAllowedTime = scheduledTime - earlyStartMins * 60 * 1000;

      if (!earlyStartAllowed && Date.now() < scheduledTime) {
        return (
          <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center p-6 text-center select-none font-sans">
            <div className="max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-2xl text-amber-400">
                ⏱️
              </div>
              <h1 className="text-xl font-bold font-heading mb-2">Early Start Restricted</h1>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Early start is disabled by Academy policy. Please return at the scheduled class start time: {new Date(cls.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
              </p>
              <a
                href="/dashboard/coach/classes"
                className="inline-block py-2.5 px-6 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all shadow-md"
              >
                Return to Classes
              </a>
            </div>
          </div>
        );
      } else if (Date.now() < earliestAllowedTime) {
        return (
          <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center p-6 text-center select-none font-sans">
            <div className="max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-2xl text-amber-400">
                ⏱️
              </div>
              <h1 className="text-xl font-bold font-heading mb-2">Early Start Window Not Open</h1>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                You can start this class up to {earlyStartMins} minutes before the scheduled time. Earliest start: {new Date(earliestAllowedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
              </p>
              <a
                href="/dashboard/coach/classes"
                className="inline-block py-2.5 px-6 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all shadow-md"
              >
                Return to Classes
              </a>
            </div>
          </div>
        );
      }
    } catch (e) {
      console.warn('[Classroom Page] Early start check skipped:', e);
    }
  }

  // 5. Detect Video Provider & Isolate Zoom from Google Meet completely
  const isGoogleMeet =
    (cls as any).meeting_provider === 'GOOGLE_MEET' ||
    Boolean((cls as any).google_meet_uri && (cls as any).google_meet_uri.includes('meet.google.com')) ||
    Boolean(cls.zoom_join_url && cls.zoom_join_url.includes('meet.google.com'));

  const videoProvider: 'ZOOM' | 'GOOGLE_MEET' | 'JITSI' | 'CUSTOM' = isGoogleMeet
    ? 'GOOGLE_MEET'
    : cls.zoom_join_url?.includes('jit.si')
    ? 'JITSI'
    : 'ZOOM';

  // Only auto-provision Zoom meeting if ZOOM is selected and zoom_join_url is missing
  if (videoProvider === 'ZOOM' && !cls.zoom_join_url) {
    try {
      const { createClassMeeting } = await import('@/lib/video');
      const videoRes = await createClassMeeting(
        params.classId,
        cls.class_type,
        cls.scheduled_start,
        cls.duration_minutes,
        'ZOOM'
      );
      if (videoRes.success && videoRes.data) {
        cls.zoom_meeting_id = videoRes.data.meetingId;
        cls.zoom_join_url = videoRes.data.joinUrl;
        cls.zoom_start_url = videoRes.data.startUrl;
      }
    } catch (videoErr) {
      console.warn('Failed to provision Zoom meeting:', videoErr);
    }
  }

  // Purely isolated meeting URLs (Never cross-pollinate Zoom and Meet)
  const activeMeetingUrl = isGoogleMeet
    ? (cls.zoom_join_url || (cls as any).google_meet_uri || '')
    : (cls.zoom_join_url || '');
  const activeZoomMeetingId = isGoogleMeet ? '' : (cls.zoom_meeting_id || '');

  const mappedStudents = students.map((s) => ({
    studentProfileId: s.studentProfileId || s.id || '',
    userId: s.userId || s.user_id || '',
    firstName: s.firstName || '',
    lastName: s.lastName || '',
    email: s.email || '',
  }));

  const className = cls.title || cls.topic || cls.name || 'Live Chess Classroom';

  // 6. Resolve active live session
  const sessionRes = await getOrCreateActiveLiveSession(params.classId, user.id, role);
  const sessionId = sessionRes.success && sessionRes.data?.sessionId ? sessionRes.data.sessionId : null;
  const sessionStatus = sessionRes.data?.status || 'scheduled';

  const effectiveSessionId = sessionId || params.classId;

  // Development diagnostic log
  console.log('[CLASS JOIN DEBUG]', {
    authenticatedUserId: user.id,
    requestedId: params.classId,
    requestedIdType: 'class.id',
    classFound: Boolean(cls),
    sessionFound: Boolean(sessionId),
    classId: params.classId,
    sessionId: effectiveSessionId,
    coachId: cls.coach_id,
    meetingProvider: videoProvider,
    meetingId: activeZoomMeetingId || null,
    meetingUrl: activeMeetingUrl,
    authorization: isAuthorized ? 'AUTHORIZED' : 'DENIED',
    finalResult: role === 'student' && (!sessionId || sessionStatus === 'scheduled') ? 'WAITING_ROOM' : 'CLASSROOM_OPEN',
  });

  // 7. Student check: If no active session exists yet, show waiting room
  if (role === 'student' && (!sessionId || sessionStatus === 'scheduled')) {
    return (
      <ClassroomWaitingRoom
        classId={params.classId}
        className={className}
        coachName={coachName}
        scheduledStart={cls.scheduled_start}
        durationMinutes={cls.duration_minutes}
        meetingUrl={activeMeetingUrl}
      />
    );
  }

  // 8. Fetch canonical snapshot
  const initialSnapshot = await getCanonicalClassroomSnapshot(
    params.classId,
    effectiveSessionId,
    user.id,
    role
  );

  return (
    <ClassroomStateProvider
      initialSnapshot={initialSnapshot}
      classId={params.classId}
      sessionId={effectiveSessionId}
      userId={user.id}
      userName={`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Participant'}
      role={role}
      students={mappedStudents}
      coachName={coachName}
    >
      <ClassroomShell
        classId={params.classId}
        sessionId={effectiveSessionId}
        zoomMeetingId={activeZoomMeetingId}
        zoomPasscode="chesshub"
        coachName={coachName}
        scheduledStart={cls.scheduled_start}
        durationMinutes={cls.duration_minutes || 60}
        videoProvider={videoProvider}
        meetingUrl={activeMeetingUrl}
      />
    </ClassroomStateProvider>
  );
}
