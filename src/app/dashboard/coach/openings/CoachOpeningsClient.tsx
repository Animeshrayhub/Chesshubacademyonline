'use client';

import React, { useState, useEffect } from 'react';
import type { DbOpening, DbStudentOpeningProgress, DbStudentChapterProgress, DbStudentOpeningScores } from '@/types/opening-teacher';

interface StudentData {
  id: string;
  username: string;
  name: string;
  email: string;
  current_track: string;
}

interface CoachOpeningsClientProps {
  initialOpenings: DbOpening[];
}

export default function CoachOpeningsClient({ initialOpenings }: CoachOpeningsClientProps) {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [progress, setProgress] = useState<DbStudentOpeningProgress[]>([]);
  const [scores, setScores] = useState<DbStudentOpeningScores[]>([]);
  const [chapterProgress, setChapterProgress] = useState<DbStudentChapterProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

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
        const rawProfiles = json.data.userProfiles || [];
        const profileMap = new Map(rawProfiles.map((p: any) => [p.id, p]));

        const studentList: StudentData[] = rawStudents.map((s: any) => {
          const prof: any = profileMap.get(s.id) || {};
          return {
            id: s.id,
            username: prof.username || s.id.substring(0, 8),
            name: `${prof.first_name || ''} ${prof.last_name || ''}`.trim() || prof.username || 'Student',
            email: prof.email || '',
            current_track: s.current_track || 'Beginner',
          };
        });

        setStudents(studentList);
        if (studentList.length > 0) {
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

  const handleDifficultyOverride = async (openingId: string, difficulty: string) => {
    if (!selectedStudentId) return;
    setSavingId(openingId);
    try {
      await fetch('/api/coach/openings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'difficulty_override',
          student_id: selectedStudentId,
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
    if (!selectedStudentId) return;
    setSavingId(chapterId);
    try {
      await fetch('/api/coach/openings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chapter_lock_toggle',
          student_id: selectedStudentId,
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

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
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
        </div>

        {/* Student Selector */}
        {students.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
            {students.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedStudentId(s.id)}
                className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all flex items-center gap-2 flex-shrink-0 ${
                  selectedStudentId === s.id
                    ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                }`}
              >
                <span>👤</span>
                <span>{s.name}</span>
                <span className="text-xs opacity-60 font-mono">({s.current_track})</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
            No assigned students found.
          </div>
        )}

        {/* Student Opening Progress Cards */}
        {selectedStudent && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Assigned Openings for {selectedStudent.name}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {initialOpenings.map(op => {
                const studentProg = progress.find(p => p.student_id === selectedStudentId && p.opening_id === op.id);
                const studentScore = scores.find(s => s.student_id === selectedStudentId && s.opening_id === op.id);

                return (
                  <div key={op.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-slate-500">{op.eco_code}</span>
                          <span className="text-xs text-slate-400">· {op.difficulty}</span>
                        </div>
                        <h3 className="font-bold text-white text-base">{op.name}</h3>
                      </div>

                      {/* Difficulty Override */}
                      <select
                        value={studentProg?.difficulty_override ?? op.difficulty}
                        onChange={e => handleDifficultyOverride(op.id, e.target.value)}
                        disabled={savingId === op.id}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                        title="Override student level"
                      >
                        <option value="Beginner">Beginner Track</option>
                        <option value="Intermediate">Intermediate Track</option>
                        <option value="Advanced">Advanced Track</option>
                      </select>
                    </div>

                    {/* Progress details */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-slate-500">Status:</span>{' '}
                        <span className="font-semibold text-white uppercase">{studentProg?.status ?? 'Not Started'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Overall Score:</span>{' '}
                        <span className="font-bold text-emerald-400">{studentProg?.overall_score ?? 0}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Mastery:</span>{' '}
                        <span className="font-semibold text-blue-300">{studentProg?.mastery_level ?? 'None'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Tactics Score:</span>{' '}
                        <span className="font-bold text-amber-400">{studentScore?.tactical_score ?? 0}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
