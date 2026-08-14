import React from 'react';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase/auth';
import { getOpeningDetail } from '@/lib/openings';
import { CHAPTER_ICONS, CHAPTER_LABELS, MASTERY_LABELS, MASTERY_COLORS } from '@/types/opening-teacher';
import type { OpeningChapterWithProgress } from '@/types/opening-teacher';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { openingId: string } }) {
  return {
    title: 'Opening Detail | ChessHub Academy AI Opening Teacher',
  };
}

export default async function OpeningDetailPage({
  params,
}: {
  params: { openingId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const result = await getOpeningDetail(params.openingId, user.id);
  if (!result.success || !result.data) notFound();

  const opening = result.data;
  const chapters = (opening.chapters ?? []) as OpeningChapterWithProgress[];
  const mastery = opening.progress?.mastery_level ?? 'not_started';
  const scores = opening.scores;

  // Find the first incomplete chapter to "continue from"
  const firstUnlockedIncomplete = chapters.find(
    ch =>
      (ch.progress?.is_unlocked || ch.chapter_num === 1) &&
      ch.progress?.status !== 'completed'
  );
  const continueChapter = firstUnlockedIncomplete?.chapter_num ?? 1;

  const SCORE_CATEGORIES = [
    { key: 'knowledge_score', label: 'Knowledge', icon: '📚' },
    { key: 'move_recognition_score', label: 'Move Recognition', icon: '🎯' },
    { key: 'plans_score', label: 'Plans & Ideas', icon: '🧠' },
    { key: 'tactical_score', label: 'Tactics', icon: '⚔️' },
    { key: 'responses_score', label: 'Responses', icon: '🔄' },
    { key: 'practical_score', label: 'Practical Play', icon: '♟️' },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/10 to-slate-950 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <Link href="/dashboard/student" className="hover:text-white transition-colors">Dashboard</Link>
          <span>›</span>
          <Link href="/dashboard/student/openings" className="hover:text-white transition-colors">Opening Teacher</Link>
          <span>›</span>
          <span className="text-white">{opening.name}</span>
        </div>

        {/* ── Opening Header ──────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/60 rounded-2xl overflow-hidden mb-6">
          <div className={`h-1 w-full ${
            mastery === 'mastered' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
            mastery === 'strong'   ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
            mastery === 'familiar' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
            mastery === 'learning' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
            'bg-slate-700'
          }`} />

          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-6">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-600">
                    ECO {opening.eco_code}
                  </span>
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                    opening.difficulty === 'Beginner' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
                    opening.difficulty === 'Intermediate' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
                    'text-red-400 bg-red-500/10 border-red-500/30'
                  }`}>
                    {opening.difficulty}
                  </span>
                  <span className="text-xs text-slate-400">{opening.style} Opening</span>
                  <span className="text-xs text-slate-400">
                    {opening.color === 'white' ? '⬜ White' : opening.color === 'black' ? '⬛ Black' : '⬜⬛ Both'}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{opening.name}</h1>
                {opening.name_hindi && (
                  <p className="text-slate-400 mb-3">{opening.name_hindi}</p>
                )}
                {opening.description && (
                  <p className="text-slate-300 text-sm leading-relaxed max-w-2xl">{opening.description}</p>
                )}

                {/* Opening moves & Action buttons */}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {opening.opening_moves && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Moves:</span>
                      <span className="text-sm font-mono text-blue-300 bg-blue-950/40 border border-blue-800/30 px-3 py-1 rounded-lg">
                        {opening.opening_moves}
                      </span>
                    </div>
                  )}

                  <a
                    href={`/api/opening/${opening.id}/export-pgn`}
                    download
                    className="inline-flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <span>📥</span>
                    <span>Download PGN Study</span>
                  </a>

                  {mastery === 'mastered' && (
                    <Link
                      href="/dashboard/student/certificates"
                      className="inline-flex items-center gap-1.5 text-xs bg-purple-950/60 hover:bg-purple-900/60 border border-purple-700/50 text-purple-200 px-3 py-1.5 rounded-lg transition-colors font-medium"
                    >
                      <span>📜</span>
                      <span>Mastery Certificate</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Overall score + mastery */}
              <div className="flex flex-col items-center gap-3 sm:flex-shrink-0">
                <div className="w-24 h-24 rounded-2xl bg-slate-800/80 border border-slate-700 flex flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-white">
                    {opening.progress?.overall_score ?? 0}
                    <span className="text-lg text-slate-400">%</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Overall</div>
                </div>
                <span className={`text-xs font-medium px-3 py-1 rounded-full border ${MASTERY_COLORS[mastery]}`}>
                  {MASTERY_LABELS[mastery]}
                </span>
              </div>
            </div>

            {/* Tags */}
            {opening.tags && opening.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-slate-700/60">
                {opening.tags.map(tag => (
                  <span key={tag} className="text-xs text-slate-400 bg-slate-800 border border-slate-700 rounded-full px-2 py-0.5">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Score Breakdown ──────────────────────────────────────────────── */}
        {scores && (
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-white mb-4">Score Breakdown</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {SCORE_CATEGORIES.map(({ key, label, icon }) => {
                const val = (scores as any)[key] as number ?? 0;
                return (
                  <div key={key} className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/40">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-base">{icon}</span>
                      <span className="text-xs text-slate-400">{label}</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-1">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
                        style={{ width: `${val}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-white">{val}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Chapter List ──────────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">8-Chapter Curriculum</h2>
            <Link
              href={`/dashboard/student/openings/${opening.id}/chapter/${continueChapter}`}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-blue-500/20"
            >
              {opening.progress?.status === 'not_started' ? '🚀 Start Learning' : '▶ Continue'}
            </Link>
          </div>

          <div className="space-y-2">
            {chapters.length === 0
              ? // No chapters loaded — show numbered placeholders
                Array.from({ length: 8 }, (_, i) => i + 1).map(num => (
                  <ChapterRow
                    key={num}
                    chapterNum={num}
                    title={`Chapter ${num}`}
                    isUnlocked={num === 1}
                    isCompleted={false}
                    score={0}
                    openingId={opening.id}
                    chapterType={'basic_idea' as any}
                  />
                ))
              : chapters.map(ch => (
                  <ChapterRow
                    key={ch.id}
                    chapterNum={ch.chapter_num}
                    title={ch.title}
                    isUnlocked={ch.chapter_num === 1 || (ch.progress?.is_unlocked ?? false)}
                    isCompleted={ch.progress?.status === 'completed'}
                    score={ch.progress?.score ?? 0}
                    openingId={opening.id}
                    chapterType={ch.chapter_type}
                    estimatedMinutes={ch.estimated_minutes}
                  />
                ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAPTER ROW COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function ChapterRow({
  chapterNum,
  title,
  isUnlocked,
  isCompleted,
  score,
  openingId,
  chapterType,
  estimatedMinutes,
}: {
  chapterNum: number;
  title: string;
  isUnlocked: boolean;
  isCompleted: boolean;
  score: number;
  openingId: string;
  chapterType: string;
  estimatedMinutes?: number;
}) {
  const icon = CHAPTER_ICONS[chapterType as keyof typeof CHAPTER_ICONS] ?? '📖';
  const href = `/dashboard/student/openings/${openingId}/chapter/${chapterNum}`;

  const content = (
    <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
      isCompleted
        ? 'bg-emerald-900/20 border-emerald-700/30 hover:border-emerald-600/50'
        : isUnlocked
        ? 'bg-slate-800/60 border-slate-700/60 hover:border-blue-500/50 hover:bg-slate-800/80 cursor-pointer'
        : 'bg-slate-900/40 border-slate-800/60 opacity-60 cursor-not-allowed'
    }`}>
      {/* Number + Icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-base ${
        isCompleted
          ? 'bg-emerald-500/20 border border-emerald-500/30'
          : isUnlocked
          ? 'bg-blue-600/20 border border-blue-600/30'
          : 'bg-slate-800 border border-slate-700'
      }`}>
        {isCompleted ? '✓' : isUnlocked ? icon : '🔒'}
      </div>

      {/* Chapter info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono">Ch {chapterNum}</span>
          {isCompleted && (
            <span className="text-xs text-emerald-400 font-medium">Completed</span>
          )}
          {!isUnlocked && !isCompleted && (
            <span className="text-xs text-slate-500">Locked</span>
          )}
        </div>
        <p className={`font-medium text-sm ${
          isCompleted ? 'text-emerald-200' : isUnlocked ? 'text-white' : 'text-slate-500'
        }`}>
          {title}
        </p>
      </div>

      {/* Score + time */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {estimatedMinutes && (
          <span className="text-xs text-slate-500">{estimatedMinutes} min</span>
        )}
        {isCompleted && score > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-16 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${score}%` }}
              />
            </div>
            <span className="text-xs font-medium text-emerald-400">{score}%</span>
          </div>
        )}
        {isUnlocked && !isCompleted && (
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-400">
            <path d="M8.59 16.34l4.58-4.59-4.58-4.59L10 5.75l6 6-6 6z" />
          </svg>
        )}
      </div>
    </div>
  );

  if (!isUnlocked || isCompleted) {
    return (
      <div key={chapterNum}>
        {isCompleted ? (
          <Link href={href}>{content}</Link>
        ) : (
          <div>{content}</div>
        )}
      </div>
    );
  }

  return <Link href={href}>{content}</Link>;
}
