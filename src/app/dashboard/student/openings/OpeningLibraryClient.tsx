'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import OpeningCard from '@/features/openings/OpeningCard';
import WeaknessPanel from '@/features/openings/revision/WeaknessPanel';
import type { OpeningWithProgress, OpeningDifficulty, DbStudentOpeningMistake } from '@/types/opening-teacher';

interface OpeningLibraryClientProps {
  openings: OpeningWithProgress[];
  inProgress: OpeningWithProgress[];
  beginner: OpeningWithProgress[];
  intermediate: OpeningWithProgress[];
  advanced: OpeningWithProgress[];
  studentName: string;
}

type FilterDifficulty = 'All' | OpeningDifficulty;
type FilterColor = 'All' | 'white' | 'black';
type ActiveTab = 'library' | 'in-progress' | 'mastered' | 'weaknesses';

export default function OpeningLibraryClient({
  openings,
  inProgress,
  beginner,
  intermediate,
  advanced,
  studentName,
}: OpeningLibraryClientProps) {
  const [search, setSearch] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<FilterDifficulty>('All');
  const [filterColor, setFilterColor] = useState<FilterColor>('All');
  const [activeTab, setActiveTab] = useState<ActiveTab>('library');
  const [mistakes, setMistakes] = useState<DbStudentOpeningMistake[]>([]);

  useEffect(() => {
    fetch('/api/opening/revision')
      .then(res => res.json())
      .then(data => {
        if (data.data) setMistakes(data.data);
      })
      .catch(() => {});
  }, []);

  const mastered = openings.filter(o => o.progress?.mastery_level === 'mastered');
  const unresolvedCount = mistakes.filter(m => !m.is_resolved).length;

  const filteredOpenings = useMemo(() => {
    return openings.filter(o => {
      const matchSearch = !search ||
        o.name.toLowerCase().includes(search.toLowerCase()) ||
        o.eco_code.toLowerCase().includes(search.toLowerCase()) ||
        (o.name_hindi && o.name_hindi.includes(search));

      const matchDifficulty = filterDifficulty === 'All' || o.difficulty === filterDifficulty;
      const matchColor = filterColor === 'All' || o.color === filterColor || o.color === 'both';

      return matchSearch && matchDifficulty && matchColor;
    });
  }, [openings, search, filterDifficulty, filterColor]);

  const totalStarted = openings.filter(o => o.progress?.status !== 'not_started' && o.progress).length;
  const avgScore = openings.reduce((acc, o) => acc + (o.progress?.overall_score ?? 0), 0) /
    Math.max(totalStarted, 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 pb-16">

      {/* ── Hero Header ───────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-transparent" />
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-rule='evenodd'%3E%3Crect width='20' height='20'/%3E%3Crect x='20' y='20' width='20' height='20'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
            <Link href="/dashboard/student" className="hover:text-white transition-colors">Dashboard</Link>
            <span>›</span>
            <span className="text-white">AI Opening Teacher</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-2xl shadow-lg shadow-blue-500/30">
                  ♟
                </div>
                <div>
                  <p className="text-sm text-blue-300 font-medium">AI-Powered Chess Coach</p>
                  <h1 className="text-3xl font-bold text-white">Opening Teacher</h1>
                </div>
              </div>
              <p className="text-slate-300 text-base max-w-2xl leading-relaxed mb-4">
                Master chess openings with your personal AI coach. Learn the ideas behind each move,
                practice interactively, and track your progress across 20+ openings.
              </p>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/dashboard/student/openings/repertoire"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
                >
                  <span>📖</span>
                  <span>My Repertoire</span>
                </Link>

                <Link
                  href="/dashboard/student/openings/analyze"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all"
                >
                  <span>🔍</span>
                  <span>Analyze Game PGN</span>
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4 flex-shrink-0">
              {[
                { label: 'Openings Started', value: totalStarted },
                { label: 'Mastered', value: mastered.length },
                { label: 'Avg. Score', value: `${Math.round(avgScore)}%` },
              ].map(({ label, value }) => (
                <div key={label} className="text-center bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-3">
                  <div className="text-2xl font-bold text-white">{value}</div>
                  <div className="text-xs text-slate-400">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* ── Continue Learning Banner ─────────────────────────────────────── */}
        {inProgress.length > 0 && (
          <div className="mb-8">
            <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
              <span className="text-green-400">▶</span>
              Continue Learning
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {inProgress.slice(0, 3).map(op => (
                <Link
                  key={op.id}
                  href={`/dashboard/student/openings/${op.id}`}
                  className="flex-shrink-0 w-72 bg-gradient-to-br from-blue-900/60 to-slate-800/80 border border-blue-700/40 rounded-xl p-4 hover:border-blue-500/60 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-blue-400">{op.eco_code}</span>
                    <span className="text-xs text-blue-300">{op.difficulty}</span>
                  </div>
                  <h3 className="font-semibold text-white mb-1 group-hover:text-blue-200 transition-colors">
                    {op.name}
                  </h3>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                      style={{ width: `${op.progress?.overall_score ?? 0}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-400">{op.progress?.overall_score ?? 0}% complete</span>
                    <span className="text-xs text-blue-400 group-hover:translate-x-0.5 transition-transform">Continue →</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 mb-6 bg-slate-900/60 border border-slate-700/60 rounded-xl p-1 w-fit flex-wrap">
          {[
            { id: 'library', label: 'All Openings', count: openings.length },
            { id: 'in-progress', label: 'In Progress', count: inProgress.length },
            { id: 'mastered', label: 'Mastered', count: mastered.length },
            { id: 'weaknesses', label: 'My Weaknesses', count: unresolvedCount },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs opacity-70">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* ── Search & Filters ──────────────────────────────────────────────── */}
        {activeTab === 'library' && (
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
              <input
                type="search"
                placeholder="Search openings by name, ECO code..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60 transition-colors"
                aria-label="Search openings"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={filterDifficulty}
                onChange={e => setFilterDifficulty(e.target.value as FilterDifficulty)}
                className="px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/60 transition-colors"
                aria-label="Filter by difficulty"
              >
                <option value="All">All Levels</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>

              <select
                value={filterColor}
                onChange={e => setFilterColor(e.target.value as FilterColor)}
                className="px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/60 transition-colors"
                aria-label="Filter by color"
              >
                <option value="All">All Colors</option>
                <option value="white">⬜ White</option>
                <option value="black">⬛ Black</option>
              </select>
            </div>
          </div>
        )}

        {/* ── Content ──────────────────────────────────────────────────────── */}
        {activeTab === 'library' && (
          <div className="space-y-8">
            {/* Group by difficulty if not searching */}
            {!search && filterDifficulty === 'All' ? (
              <>
                {[
                  { label: '🌱 Beginner', items: beginner },
                  { label: '🔶 Intermediate', items: intermediate },
                  { label: '🔴 Advanced', items: advanced },
                ].map(({ label, items }) => (
                  items.length > 0 && (
                    <section key={label}>
                      <h2 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">
                        {label} ({items.length} openings)
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {items.map(op => (
                          <OpeningCard key={op.id} opening={op} />
                        ))}
                      </div>
                    </section>
                  )
                ))}
              </>
            ) : (
              <>
                <p className="text-sm text-slate-400">
                  {filteredOpenings.length} result{filteredOpenings.length !== 1 ? 's' : ''}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredOpenings.map(op => (
                    <OpeningCard key={op.id} opening={op} />
                  ))}
                </div>
                {filteredOpenings.length === 0 && (
                  <div className="text-center py-16 text-slate-400">
                    <div className="text-4xl mb-3">🔍</div>
                    <p className="text-lg font-medium text-white mb-1">No openings found</p>
                    <p className="text-sm">Try a different search or filter</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'in-progress' && (
          <div>
            {inProgress.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <div className="text-4xl mb-3">📚</div>
                <p className="text-lg font-medium text-white mb-2">Start your first opening</p>
                <p className="text-sm mb-4">Click "All Openings" to explore the library</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('library')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500 transition-colors"
                >
                  Browse Library
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {inProgress.map(op => <OpeningCard key={op.id} opening={op} />)}
              </div>
            )}
          </div>
        )}

        {activeTab === 'mastered' && (
          <div>
            {mastered.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <div className="text-4xl mb-3">🏆</div>
                <p className="text-lg font-medium text-white mb-2">No mastered openings yet</p>
                <p className="text-sm">Complete all 8 chapters with 100% to master an opening</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {mastered.map(op => <OpeningCard key={op.id} opening={op} />)}
              </div>
            )}
          </div>
        )}

        {activeTab === 'weaknesses' && (
          <WeaknessPanel mistakes={mistakes} />
        )}
      </div>
    </div>
  );
}
