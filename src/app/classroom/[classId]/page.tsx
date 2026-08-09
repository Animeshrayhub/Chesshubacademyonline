import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { getClassStudents } from '@/lib/classes';
import ClassroomWorkspace from '@/components/dashboard/ui/ClassroomWorkspace';

export const dynamic = 'force-dynamic';

export default async function ClassroomPage({ params }: { params: { classId: string } }) {
  // Allow standard UUIDs and mock IDs (alphanumeric strings with hyphens)
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
      <div className="min-h-screen bg-surface-dark text-white flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <h1 className="text-xl font-bold font-heading mb-2">Classroom Workspace Not Found</h1>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            The requested live classroom session does not exist, has been archived, or was cancelled by the academy administration.
          </p>
          <a
            href="/dashboard"
            className="inline-block py-3 px-6 rounded-xl font-bold text-sm bg-primary hover:bg-primary-dark text-white transition-all"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // 2. Fetch coach details cleanly with fallback
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
      // Fallback: check if cls.coach_id directly references a user ID in `users`
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

  const role = dbUser?.role?.toLowerCase() as 'admin' | 'coach' | 'student';

  let isAuthorized = false;
  if (role === 'admin' || role === 'coach') {
    isAuthorized = true;
  } else if (role === 'student') {
    const studentProfileIds = students.map((s) => s.studentProfileId);
    const { data: sp } = await admin
      .from('student_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (sp && studentProfileIds.includes(sp.id)) {
      if (cls.status === 'COMPLETED' || cls.status === 'RECORDING_AVAILABLE') {
        redirect(`/classroom/${params.classId}/review`);
      } else if (cls.status === 'CANCELLED') {
        redirect('/unauthorized');
      } else {
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl">🔒</span>
          </div>
          <h1 className="text-xl font-bold font-heading mb-2">403 Forbidden</h1>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            You do not have permission to access this live classroom session. Only assigned coaches, enrolled students, or administrators may enter.
          </p>
          <a
            href="/dashboard"
            className="inline-block py-3 px-6 rounded-xl font-bold text-sm bg-primary hover:bg-primary-dark text-white transition-all"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }


  // Video Meeting Link resolution: validate Zoom API or auto-provision Jitsi URL
  if (!cls.zoom_join_url) {
    if (role === 'coach' || role === 'admin') {
      try {
        const { createClassMeeting } = await import('@/lib/video');
        const videoRes = await createClassMeeting(params.classId, cls.class_type, cls.scheduled_start, cls.duration_minutes, 'JITSI');
        if (videoRes.success && videoRes.data) {
          cls.zoom_meeting_id = videoRes.data.meetingId;
          cls.zoom_join_url = videoRes.data.joinUrl;
          cls.zoom_start_url = videoRes.data.startUrl;
        }
      } catch (videoErr) {
        console.error('Failed to provision video meeting:', videoErr);
      }
    }

    if (!cls.zoom_join_url) {
      const safeId = params.classId.replace(/[^a-zA-Z0-9]/g, '');
      const defaultServer = process.env.NEXT_PUBLIC_JITSI_SERVER || 'https://meet.jit.si';
      cls.zoom_join_url = `${defaultServer}/ChessHub_Class_${safeId}`;
      cls.zoom_start_url = cls.zoom_join_url;
    }
  }

  const mappedStudents = students.map((s) => ({
    firstName: s.firstName,
    lastName: s.lastName,
    email: s.email,
  }));

  return (
    <ClassroomWorkspace
      classId={params.classId}
      role={role}
      userName={`${user.firstName} ${user.lastName}`}
      coachName={coachName}
      classType={cls.class_type}
      duration={cls.duration_minutes}
      scheduledStart={cls.scheduled_start}
      initialStatus={cls.status}
      students={mappedStudents}
      zoomStartUrl={cls.zoom_start_url || ''}
      zoomJoinUrl={cls.zoom_join_url || ''}
      userId={user.id}
      startedAt={cls.started_at || null}
      endedAt={cls.ended_at || null}
    />
  );
}
