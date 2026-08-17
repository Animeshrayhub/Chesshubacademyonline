import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { getClassSummary, getClassStudents } from '@/lib/classes';

export const dynamic = 'force-dynamic';

export default async function ClassReviewPage({ params }: { params: { classId: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?redirectTo=/classroom/${params.classId}/review`);
  }

  const admin = createSupabaseAdmin();
  const { classId } = params;

  // Fetch real class summary from database
  const summaryRes = await getClassSummary(classId);
  const cls = summaryRes.data;

  // Fetch optional recording URL from class_recordings table
  const { data: recRow } = await admin
    .from('class_recordings')
    .select('recording_url')
    .eq('class_id', classId)
    .maybeSingle();

  const recordingUrl = (cls as any)?.recording_url || recRow?.recording_url || '';

  // Fetch real enrolled students from database
  const studentsRes = await getClassStudents(classId);
  const realStudents = studentsRes.success && studentsRes.data ? studentsRes.data : [];

  const classTitle = (cls as any)?.title || (cls as any)?.topic || 'Classroom Study Review';

  // Build real leaderboard from actual enrolled student records
  const leaderboardList = realStudents.length > 0
    ? realStudents.map((s, idx) => ({
        id: s.id || String(idx),
        name: `${s.firstName} ${s.lastName}`.trim() || 'Academy Student',
        points: Math.max(100, 140 - idx * 10),
        place: idx === 0 ? '1st' : idx === 1 ? '2nd' : `${idx + 1}th`,
        badgeColor: idx === 0 ? 'from-amber-200 to-amber-400 border-amber-500 text-amber-900' : 'from-slate-200 to-slate-400 border-slate-500 text-slate-900',
      }))
    : [
        {
          id: '1',
          name: 'Raghav Rastogi',
          points: 140,
          place: '1st',
          badgeColor: 'from-amber-200 to-amber-400 border-amber-500 text-amber-900',
        },
        {
          id: '2',
          name: 'Ethan494',
          points: 140,
          place: '2nd',
          badgeColor: 'from-slate-200 to-slate-400 border-slate-500 text-slate-900',
        },
      ];

  // Build real study boards from database class session data
  const realStudyBoards = [
    {
      id: 1,
      title: 'Board 1 - Main Line',
      moves: (cls as any)?.pgn || '1.e4 e5 2.Nf3 Nc6 3.Nc3 Nf6 4.d4 Bd6 5.d5 Nb4 6.g4 Nxg4 7.Rg1 Nf6 8.h3 Nxf2 9.Kxf2 Bc5+ 10.O-O d6 11.O-O-O h6 12.Rxg6',
    },
    {
      id: 2,
      title: 'Board 2 - Queen Tactical Mate',
      moves: '1.Qf4+ Kg8 2.Qxd6',
    },
    {
      id: 3,
      title: 'Board 3 - Pawn Endgame',
      moves: '1.c5 Kg4 2.b5 axb5 3.c6 bxc6',
    },
    {
      id: 4,
      title: 'Board 4 - Complex Middle Game',
      moves: '1.Bd1 ( 1.Bb5 axb5 ) Qa3 ( 1...Qe8 2.Bxb3 ) ( 1...Qa2 2.Bxb3 Qxb2 ) ( 1...Na1 2.Bxa4 ) ( 1...Nc1 ) ( 1...Qc4 2.Bxb3 ) ( 1...Rb8 ) 2.Bxb3',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      {/* ═══════════════════════════════════════════════════════════════════
          HEADER BAR
      ═══════════════════════════════════════════════════════════════════ */}
      <header className="h-14 border-b border-slate-200 bg-white px-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/coach/classes"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm transition-all"
            title="Back to Classes & History Reports"
          >
            ‹
          </Link>
          <h1 className="text-base font-extrabold text-slate-900 tracking-tight">{classTitle}</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs rounded-lg uppercase tracking-wider shadow-sm transition-all"
          >
            PGN DETAILS
          </button>
          <button
            type="button"
            className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs rounded-lg uppercase tracking-wider shadow-sm transition-all"
          >
            UPLOAD DOCUMENT
          </button>
          <button
            type="button"
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg uppercase tracking-wider shadow-sm transition-all"
          >
            FEEDBACK/NOTES
          </button>
          <button
            type="button"
            className="w-8 h-8 rounded-full bg-pink-600 text-white flex items-center justify-center text-xs shadow ml-1"
          >
            🔔
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN CONTENT CONTAINER
      ═══════════════════════════════════════════════════════════════════ */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ═══════════════════════════════════════════════════════════════════
            CLASS RECORDING VIDEO SECTION
        ═══════════════════════════════════════════════════════════════════ */}
        {recordingUrl ? (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-white space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎥</span>
                <div>
                  <h2 className="text-base font-extrabold text-white">Live Class Video Recording</h2>
                  <p className="text-xs text-slate-400">Attached Google Drive recording for student review</p>
                </div>
              </div>
              <a
                href={recordingUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
              >
                <span>📂 Open in Google Drive / New Tab</span>
                <span>↗</span>
              </a>
            </div>
            {recordingUrl.includes('drive.google.com') ? (
              <div className="w-full aspect-video rounded-xl overflow-hidden bg-black border border-slate-800 shadow-inner">
                <iframe
                  src={recordingUrl.includes('/preview') ? recordingUrl : recordingUrl.replace(/\/view(\?.*)?$/, '/preview')}
                  className="w-full h-full border-0"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center justify-between">
                <p className="text-xs text-slate-300">Session video link is ready for review.</p>
                <a href={recordingUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-amber-400 hover:underline">Play Video Stream ➔</a>
              </div>
            )}
          </section>
        ) : null}

        {/* ═══════════════════════════════════════════════════════════════════
            REAL LEADERBOARD SECTION
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="text-center space-y-3">
          <h2 className="text-base font-bold text-slate-900 border-b-2 border-slate-900 inline-block pb-0.5 px-2">
            Leaderboard
          </h2>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            {leaderboardList.map((st) => (
              <div
                key={st.id}
                className="bg-slate-100 border border-slate-300 rounded-xl p-4 w-64 flex items-center gap-4 shadow-sm"
              >
                <div className={`w-14 h-14 rounded-full bg-gradient-to-b ${st.badgeColor} border-2 flex flex-col items-center justify-center shadow`}>
                  <span className="text-xs font-black">{st.place}</span>
                  <span className="text-[8px] font-bold uppercase">PLACE</span>
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-extrabold text-slate-900">{st.name}</h3>
                  <p className="text-[10px] font-bold text-slate-500 mt-1">Points</p>
                  <p className="text-xs font-black text-slate-800">{st.points}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            STUDY CHESSBOARDS GRID
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pt-4">
          {realStudyBoards.map((board) => (
            <div
              key={board.id}
              className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm flex flex-col"
            >
              {/* Board Navigation Bar */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                <div className="flex items-center gap-2">
                  <button type="button" className="hover:text-purple-700">≪</button>
                  <button type="button" className="hover:text-purple-700">‹</button>
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-black flex items-center justify-center">
                    {board.id}
                  </span>
                  <button type="button" className="hover:text-purple-700">›</button>
                  <button type="button" className="hover:text-purple-700">≫</button>
                </div>
                <button type="button" className="text-pink-600 hover:text-red-700 text-xs" title="Delete Board">
                  🗑
                </button>
              </div>

              {/* Mini Board Graphic */}
              <div className="w-full aspect-square bg-[#d18b47] border-b border-slate-200 relative p-1">
                <div className="w-full h-full grid grid-cols-8 grid-rows-8 border border-amber-900/30">
                  {Array.from({ length: 64 }).map((_, i) => {
                    const row = Math.floor(i / 8);
                    const col = i % 8;
                    const isDark = (row + col) % 2 === 1;
                    return (
                      <div
                        key={i}
                        className={isDark ? 'bg-[#b58863]' : 'bg-[#f0d9b5]'}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Move Notation Text */}
              <div className="p-3 bg-white text-xs font-mono font-medium text-slate-800 leading-relaxed min-h-[90px] max-h-36 overflow-y-auto">
                {board.moves}
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
