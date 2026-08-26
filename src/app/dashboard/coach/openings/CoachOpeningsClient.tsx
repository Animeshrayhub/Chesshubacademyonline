'use client';

import React, { useState, useEffect } from 'react';
import type { DbOpening, DbStudentOpeningProgress, DbStudentChapterProgress, DbStudentOpeningScores } from '@/types/opening-teacher';

interface StudentData {
  id: string;
  username: string;
  name: string;
  email: string;
  current_track: string;
  assigned_coach_id?: string | null;
}

interface CoachData {
  id: string;
  username: string;
  name: string;
  email: string;
}

interface CoachOpeningsClientProps {
  initialOpenings: DbOpening[];
  isAdminView?: boolean;
}

export default function CoachOpeningsClient({ initialOpenings, isAdminView = false }: CoachOpeningsClientProps) {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [allStudents, setAllStudents] = useState<StudentData[]>([]);
  const [coaches, setCoaches] = useState<CoachData[]>([]);
  const [selectedCoachId, setSelectedCoachId] = useState<string>('ALL');

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [progress, setProgress] = useState<DbStudentOpeningProgress[]>([]);
  const [scores, setScores] = useState<DbStudentOpeningScores[]>([]);
  const [chapterProgress, setChapterProgress] = useState<DbStudentChapterProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showOpeningAssignModal, setShowOpeningAssignModal] = useState(false);
  const [selectedOpeningToAssign, setSelectedOpeningToAssign] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/coach/openings');
      const json = await res.json();

      if (json.data) {
        const rawStudents = json.data.students || [];
        const rawAllStudents = json.data.allStudents || [];
        const rawCoaches = json.data.coaches || [];
        const rawProfiles = json.data.userProfiles || [];
        const profileMap = new Map(rawProfiles.map((p: any) => [p.id, p]));

        const formatStudent = (s: any): StudentData => {
          const prof: any = profileMap.get(s.id) || {};
          return {
            id: s.id,
            username: prof.username || s.id.substring(0, 8),
            name: `${prof.first_name || ''} ${prof.last_name || ''}`.trim() || prof.username || 'Student',
            email: prof.email || '',
            current_track: s.current_track || 'Beginner',
            assigned_coach_id: s.assigned_coach_id,
          };
        };

        const studentList = rawStudents.map(formatStudent);
        const formattedAllStudents = rawAllStudents.map(formatStudent);

        const coachList: CoachData[] = rawCoaches.map((c: any) => ({
          id: c.id,
          username: c.username,
          name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.username || 'Coach',
          email: c.email || '',
        }));

        setStudents(studentList);
        setAllStudents(formattedAllStudents);
        setCoaches(coachList);

        if (studentList.length > 0 && !selectedStudentId) {
          setSelectedStudentId(studentList[0].id);
        }

        setProgress(json.data.progress || []);
        setScores(json.data.scores || []);
        setChapterProgress(json.data.chapterProgress || []);
      }
    } catch (err) {
      console.error('[Fetch Coach Openings]', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStudents = selectedCoachId === 'ALL'
    ? (isAdminView ? allStudents : students)
    : allStudents.filter(s => s.assigned_coach_id === selectedCoachId);

  const selectedStudent = filteredStudents.find(s => s.id === selectedStudentId) || filteredStudents[0];

  const handleAssignStudent = async (studentId: string) => {
    setSavingId(studentId);
    try {
      await fetch('/api/coach/openings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign_student', student_id: studentId }),
      });
      await fetchData();
    } finally {
      setSavingId(null);
    }
  };

  const handleUnassignStudent = async (studentId: string) => {
    setSavingId(studentId);
    try {
      await fetch('/api/coach/openings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unassign_student', student_id: studentId }),
      });
      await fetchData();
    } finally {
      setSavingId(null);
    }
  };

  const handleTrackChange = async (studentId: string, current_track: string) => {
    setSavingId(studentId);
    try {
      await fetch('/api/coach/openings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_student_track', student_id: studentId, current_track }),
      });
      await fetchData();
    } finally {
      setSavingId(null);
    }
  };

  const handleAssignOpeningToStudent = async (openingId: string) => {
    if (!selectedStudent) return;
    setSavingId(openingId);
    try {
      await fetch('/api/coach/openings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign_opening', student_id: selectedStudent.id, opening_id: openingId }),
      });
      await fetchData();
      setShowOpeningAssignModal(false);
    } finally {
      setSavingId(null);
    }
  };

  const handleDifficultyOverride = async (openingId: string, difficulty: string) => {
    if (!selectedStudent) return;
    setSavingId(openingId);
    try {
      await fetch('/api/coach/openings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'difficulty_override',
          student_id: selectedStudent.id,
          opening_id: openingId,
          difficulty_override: difficulty,
        }),
      });
      await fetchData();
    } finally {
      setSavingId(null);
    }
  };

  const handleChapterLockToggle = async (openingId: string, chapterId: string, currentUnlocked: boolean) => {
    if (!selectedStudent) return;
    setSavingId(chapterId);
    try {
      await fetch('/api/coach/openings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chapter_lock_toggle',
          student_id: selectedStudent.id,
          opening_id: openingId,
          chapter_id: chapterId,
          is_unlocked: !currentUnlocked,
        }),
      });
      await fetchData();
    } finally {
      setSavingId(null);
    }
  };

  const handleResetProgress = async (openingId: string) => {
    if (!selectedStudent) return;
    if (!confirm('Are you sure you want to reset this student\'s opening progress?')) return;
    setSavingId(openingId);
    try {
      await fetch('/api/coach/openings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_progress',
          student_id: selectedStudent.id,
          opening_id: openingId,
        }),
      });
      await fetchData();
    } finally {
      setSavingId(null);
    }
  };

  const unassignedStudents = allStudents.filter(s => !s.assigned_coach_id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 p-6 text-white">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-xl text-blue-400">
                ♟
              </div>
              <h1 className="text-2xl font-bold text-white">Opening Assignments & Progress</h1>
            </div>
            <p className="text-slate-400 text-sm">
              Inspect assigned student opening performance, adjust difficulty tracks, and override chapter locks.
            </p>
          </div>

          {/* Actions: Admin Coach Filter + Add Student Button */}
          <div className="flex items-center gap-3 flex-wrap">
            {isAdminView && (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                <span className="text-slate-400 font-medium">Filter Coach:</span>
                <select
                  value={selectedCoachId}
                  onChange={(e) => setSelectedCoachId(e.target.value)}
                  className="bg-transparent text-white font-bold focus:outline-none"
                >
                  <option value="ALL" className="bg-slate-900 text-white">All Coaches ({coaches.length})</option>
                  {coaches.map(c => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowAssignModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
            >
              <span>👤+</span>
              <span>Assign Students to Roster ({unassignedStudents.length} available)</span>
            </button>
          </div>
        </div>

        {/* Student Selector Bar */}
        {filteredStudents.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Select Student ({filteredStudents.length})
              </p>
              {selectedStudent && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-400">Primary Track:</span>
                  <select
                    value={selectedStudent.current_track}
                    onChange={(e) => handleTrackChange(selectedStudent.id, e.target.value)}
                    disabled={savingId === selectedStudent.id}
                    className="bg-slate-900 border border-blue-500/40 rounded-lg px-2 py-1 text-white font-bold focus:outline-none"
                  >
                    <option value="Beginner">Beginner Track</option>
                    <option value="Intermediate">Intermediate Track</option>
                    <option value="Advanced">Advanced Track</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowOpeningAssignModal(true)}
                    className="px-3 py-1 bg-emerald-600/30 hover:bg-emerald-600/60 text-emerald-300 border border-emerald-500/40 font-bold rounded-lg transition-all"
                  >
                    + Assign Opening
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
              {filteredStudents.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedStudentId(s.id)}
                  className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all flex items-center gap-2 flex-shrink-0 ${
                    selectedStudent?.id === s.id
                      ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20 font-bold'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span>👤</span>
                  <span>{s.name}</span>
                  <span className="text-xs opacity-60 font-mono">({s.current_track})</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Empty State Fallback with instant action button */
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-900/30 border border-blue-500/30 flex items-center justify-center text-3xl mx-auto">
              👥
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">No Assigned Students Found</h3>
              <p className="text-slate-400 text-xs max-w-md mx-auto">
                You currently have no students assigned to your opening teacher roster. Assign students to inspect their opening performance and manage chapter locks.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAssignModal(true)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all"
            >
              🚀 Assign Students Now
            </button>
          </div>
        )}

        {/* Student Opening Progress Cards */}
        {selectedStudent && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                Opening Performance Repertoire for {selectedStudent.name}
              </h2>
              <span className="text-xs text-slate-500 font-mono">{initialOpenings.length} Repertoires Total</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {initialOpenings.map(op => {
                const studentProg = progress.find(p => p.student_id === selectedStudent.id && p.opening_id === op.id);
                const studentScore = scores.find(s => s.student_id === selectedStudent.id && s.opening_id === op.id);
                const isAssigned = !!studentProg;

                return (
                  <div key={op.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl relative">
                    
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-blue-400 font-bold">{op.eco_code}</span>
                          <span className="text-xs text-slate-400">· {op.difficulty}</span>
                          {isAssigned && (
                            <span className="text-[10px] px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700/50 rounded font-bold">
                              Assigned
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-white text-base">{op.name}</h3>
                      </div>

                      {/* Difficulty Override */}
                      <div className="flex items-center gap-2">
                        <select
                          value={studentProg?.difficulty_override ?? op.difficulty}
                          onChange={e => handleDifficultyOverride(op.id, e.target.value)}
                          disabled={savingId === op.id}
                          className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500 font-semibold"
                          title="Override student level for this opening"
                        >
                          <option value="Beginner">Beginner</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Advanced">Advanced</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleResetProgress(op.id)}
                          disabled={savingId === op.id || !isAssigned}
                          title="Reset progress for this opening"
                          className="px-2 py-1 bg-red-950/60 hover:bg-red-900 border border-red-700/40 text-red-300 text-xs rounded-lg transition-all disabled:opacity-30"
                        >
                          🔄
                        </button>
                      </div>
                    </div>

                    {/* Progress Detail Cards */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-slate-500 font-medium">Status:</span>{' '}
                        <span className="font-bold text-white uppercase">{studentProg?.status ?? 'Not Started'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Overall Score:</span>{' '}
                        <span className="font-extrabold text-emerald-400">{studentProg?.overall_score ?? 0}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Mastery:</span>{' '}
                        <span className="font-semibold text-blue-300">{studentProg?.mastery_level ?? 'Novice'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Tactics Accuracy:</span>{' '}
                        <span className="font-extrabold text-amber-400">{studentScore?.tactical_score ?? 0}%</span>
                      </div>
                    </div>

                    {/* Performance Progress Bars */}
                    <div className="space-y-2 pt-1">
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1">
                          <span>Repertoire Knowledge Score</span>
                          <span className="text-emerald-400">{studentScore?.knowledge_score ?? 0}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, studentScore?.knowledge_score ?? 0)}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1">
                          <span>Tactical Solution Accuracy</span>
                          <span className="text-amber-400">{studentScore?.tactical_score ?? 0}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, studentScore?.tactical_score ?? 0)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Chapter Lock / Unlock Toggles */}
                    <div className="border-t border-slate-800 pt-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Chapter Lock Controls:</p>
                      <div className="space-y-1.5">
                        {((op as any).chapters || [
                          { id: `ch_${op.id}_1`, title: 'Chapter 1: Key Lines & Moves' },
                          { id: `ch_${op.id}_2`, title: 'Chapter 2: Tactical Patterns' },
                          { id: `ch_${op.id}_3`, title: 'Chapter 3: Model Games' },
                        ]).map((ch: any) => {
                          const chProg = chapterProgress.find(cp => cp.student_id === selectedStudent.id && cp.chapter_id === ch.id);
                          const isUnlocked = chProg ? chProg.is_unlocked : true;

                          return (
                            <div key={ch.id} className="flex items-center justify-between bg-slate-950/50 px-2.5 py-1.5 rounded-lg text-xs">
                              <span className="text-slate-300 font-medium text-[11px] truncate max-w-[220px]">{ch.title}</span>
                              <button
                                type="button"
                                onClick={() => handleChapterLockToggle(op.id, ch.id, isUnlocked)}
                                disabled={savingId === ch.id}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                                  isUnlocked
                                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/50 hover:bg-emerald-900'
                                    : 'bg-red-950/80 text-red-300 border-red-700/50 hover:bg-red-900'
                                }`}
                              >
                                {isUnlocked ? '🔓 Unlocked' : '🔒 Locked'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ── MODAL: ASSIGN STUDENTS TO ROSTER ── */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">👤+</span>
                <h3 className="font-bold text-base text-white">Assign Students to Coach Roster</h3>
              </div>
              <button type="button" onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-400">
              Select students from the academy list below to assign them to your active opening management roster:
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {allStudents.map(s => {
                const isAssigned = s.assigned_coach_id !== null && s.assigned_coach_id !== undefined;
                return (
                  <div key={s.id} className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div>
                      <p className="text-xs font-bold text-white">{s.name}</p>
                      <p className="text-[10px] text-slate-500">{s.email || `@${s.username}`} · Track: {s.current_track}</p>
                    </div>

                    {isAssigned ? (
                      <button
                        type="button"
                        onClick={() => handleUnassignStudent(s.id)}
                        disabled={savingId === s.id}
                        className="px-3 py-1 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-700/40 text-xs font-bold rounded-lg transition-all"
                      >
                        Unassign
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAssignStudent(s.id)}
                        disabled={savingId === s.id}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all shadow"
                      >
                        + Assign to Me
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ASSIGN SPECIFIC OPENING ── */}
      {showOpeningAssignModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">♟</span>
                <h3 className="font-bold text-base text-white">Assign Opening to {selectedStudent.name}</h3>
              </div>
              <button type="button" onClick={() => setShowOpeningAssignModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {initialOpenings.map(op => (
                <div key={op.id} className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-[10px] text-blue-400 font-mono font-bold">{op.eco_code}</span>
                    <p className="text-xs font-bold text-white">{op.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAssignOpeningToStudent(op.id)}
                    disabled={savingId === op.id}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all shadow"
                  >
                    Assign Opening
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
