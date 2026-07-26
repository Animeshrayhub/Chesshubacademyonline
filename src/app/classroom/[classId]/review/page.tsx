import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { getClassSummary, getClassStudents } from '@/lib/classes';
import SessionReviewEditor from '@/components/dashboard/ui/SessionReviewEditor';
import ClassAttendanceTracker from '@/components/dashboard/ui/ClassAttendanceTracker';


export const dynamic = 'force-dynamic';

export default async function ClassReviewPage({ params }: { params: { classId: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?redirectTo=/classroom/${params.classId}/review`);
  }

  const admin = createSupabaseAdmin();
  const { classId } = params;

  // Fetch class summary
  const summaryRes = await getClassSummary(classId);
  if (!summaryRes.success || !summaryRes.data) {
    return (
      <div className="min-h-screen bg-surface-dark text-white flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <h1 className="text-xl font-bold font-heading mb-2">Session Not Found</h1>
          <p className="text-sm text-slate-400 mb-6">
            This session review could not be loaded.
          </p>
          <Link href="/dashboard" className="inline-block py-3 px-6 rounded-xl font-bold text-sm bg-primary hover:bg-primary-dark text-white transition-all">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const cls = summaryRes.data;

  // Fetch coach name
  const { data: coachProfile } = await admin
    .from('coach_profiles')
    .select('user_id, title')
    .eq('id', cls.coach_id)
    .maybeSingle();

  const { data: coachUser } = coachProfile
    ? await admin.from('users').select('first_name, last_name').eq('id', coachProfile.user_id).maybeSingle()
    : { data: null };

  const coachName = coachUser
    ? `${coachProfile?.title || 'Coach'} ${coachUser.first_name} ${coachUser.last_name}`
    : 'Academy Coach';

  // Fetch students
  const studentsRes = await getClassStudents(classId);
  const students = studentsRes.success && studentsRes.data ? studentsRes.data : [];

  // Resolve role
  const { data: dbUser } = await admin.from('users').select('role').eq('id', user.id).single();
  const role = dbUser?.role?.toLowerCase() as 'admin' | 'coach' | 'student';

  // Authorization check — allow all authenticated academy users (admin, coach, student) to view session feedback
  let isAuthorized = false;
  if (role === 'admin' || role === 'coach' || role === 'student') {
    isAuthorized = true;
  }

  if (!isAuthorized) {
    redirect('/unauthorized');
  }


  const isCoachOrAdmin = role === 'coach' || role === 'admin';
  const dateStr = new Date(cls.scheduled_start).toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  // Calculate actual real-time live duration when coach ended session
  let actualDurationDisplay = `${cls.duration_minutes} min`;
  const clsObj = cls as any;
  if (clsObj.updated_at && clsObj.created_at) {
    const startMs = new Date(clsObj.scheduled_start || clsObj.created_at).getTime();
    const endMs = new Date(clsObj.updated_at).getTime();
    const diffMs = endMs - startMs;
    if (diffMs > 0) {
      const realMins = Math.max(1, Math.round(diffMs / (1000 * 60)));
      actualDurationDisplay = `${realMins} min (Live Session)`;
    }
  }

  return (
    <div className="min-h-screen bg-surface-dark text-white">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-xs font-semibold"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
          <div className="h-4 w-px bg-slate-800" />
          <div>
            <h1 className="text-sm font-bold font-heading">Session Review</h1>
            <p className="text-[10px] text-slate-400">Class ID: {classId.substring(0, 8)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/classroom/${classId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary-dark text-white transition-all shadow-sm"
          >
            <span>♟️</span>
            <span>Re-join Classroom Board</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            SESSION ENDED
          </span>
        </div>
      </header>

      {/* Main */}
      <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left: Main content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Hero card */}
          <div className="bg-gradient-to-br from-primary/20 via-slate-900 to-slate-950 border border-primary/20 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold font-heading">Great Session!</h2>
                <p className="text-xs text-slate-400">This class has been completed and recorded.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-6">
              <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Coach</span>
                <span className="text-sm font-semibold text-white leading-tight">{coachName}</span>
              </div>
              <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Date</span>
                <span className="text-sm font-semibold text-white leading-tight">{dateStr}</span>
              </div>
              <div className="bg-slate-900/60 border border-indigo-500/30 bg-indigo-500/10 rounded-xl p-3">
                <span className="text-[10px] text-indigo-300 font-extrabold uppercase tracking-wider block mb-1">⚡ Real-time Duration</span>
                <span className="text-sm font-black text-amber-300 leading-tight">{actualDurationDisplay}</span>
              </div>
              <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Scheduled</span>
                <span className="text-sm font-semibold text-slate-300 leading-tight">{cls.duration_minutes} min</span>
              </div>
              <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Type</span>
                <span className="text-sm font-semibold text-white leading-tight">{cls.class_type}</span>
              </div>
            </div>
          </div>


          {/* Attendance Tracker Section */}
          <ClassAttendanceTracker classId={classId} initialStudents={students} isCoach={isCoachOrAdmin} />

          {/* Review/Notes section */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 shadow-xl">

            {isCoachOrAdmin ? (
              /* Coach: editable */
              <SessionReviewEditor classId={classId} initialNotes={cls.session_notes || ''} />
            ) : (
              /* Student: read-only */
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-base font-bold text-white">What We Covered Today</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Session notes written by your coach
                  </p>
                </div>
                {cls.session_notes ? (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-mono min-h-[180px]">
                    {cls.session_notes}
                  </div>
                ) : (
                  <div className="bg-slate-950/40 border border-dashed border-slate-700 rounded-xl p-8 text-center">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-slate-400">Notes Pending</p>
                    <p className="text-xs text-slate-500 mt-1">Your coach hasn&apos;t added session notes yet. Check back soon!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">

          {/* Students */}
          {isCoachOrAdmin && students.length > 0 && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-xs font-bold text-accent uppercase tracking-wider mb-3">Students in This Session</h3>
              <div className="space-y-2">
                {students.map((s, i) => (
                  <div key={i} className="flex items-center gap-2.5 bg-slate-950/40 border border-slate-800/40 p-3 rounded-xl">
                    <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                      {s.firstName[0]}{s.lastName[0]}
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{s.firstName} {s.lastName}</p>
                      <p className="text-[9px] text-slate-500">{s.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next steps */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-xs font-bold text-accent uppercase tracking-wider mb-3">Next Steps</h3>
            <div className="space-y-2.5 text-xs text-slate-400">
              {isCoachOrAdmin ? (
                <>
                  <p className="flex items-start gap-2">
                    <span className="text-accent mt-0.5">→</span>
                    Write session notes above to help students remember what was covered.
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-accent mt-0.5">→</span>
                    Assign homework from the student dashboard.
                  </p>
                </>
              ) : (
                <>
                  <p className="flex items-start gap-2">
                    <span className="text-accent mt-0.5">→</span>
                    Review the session notes above.
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-accent mt-0.5">→</span>
                    Check your homework assignments in the dashboard.
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-accent mt-0.5">→</span>
                    Practice on Lichess and work on today&apos;s tactical puzzles.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* CTA */}
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 w-full py-3 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-xl transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
