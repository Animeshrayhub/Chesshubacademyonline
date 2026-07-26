import React from 'react';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import ThemePerformanceChart from '@/features/homework/ThemePerformanceChart';
import { getHomeworkAnalytics } from '@/lib/homework/puzzles';
import { assertCoach } from '@/lib/permissions';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    homeworkId: string;
  };
}

export default async function CoachHomeworkAnalyticsPage({ params }: PageProps) {
  const { homeworkId } = params;

  try {
    await assertCoach();
    const analyticsRes = await getHomeworkAnalytics(homeworkId);

    if (!analyticsRes.success || !analyticsRes.data) {
      notFound();
    }

    const data = analyticsRes.data;

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <PageHeader
            title={`Analytics: ${data.chapterTitle || 'Homework Assignment'}`}
            subtitle={`Workbook: ${data.workbookTitle || 'Curriculum'} · Detailed accuracy, hint usage, and theme performance.`}
          />
          <Link
            href="/dashboard/coach/homework"
            className="self-start sm:self-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-text-primary text-xs font-bold rounded-xl transition-colors"
          >
            ← Back to Homework
          </Link>
        </div>

        {/* Aggregate KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-border shadow-card">
            <div className="text-xs font-bold text-text-secondary uppercase">Assigned Students</div>
            <div className="text-2xl font-extrabold text-text-primary mt-1">{data.totalStudents}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">
              {data.completedCount} completed ({data.passedCount} passed)
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-border shadow-card">
            <div className="text-xs font-bold text-text-secondary uppercase">Average Accuracy</div>
            <div className={`text-2xl font-extrabold mt-1 ${data.avgAccuracy >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {data.avgAccuracy}%
            </div>
            <div className="text-[11px] text-text-secondary mt-1">Goal: ≥90% for auto-unlock</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-border shadow-card">
            <div className="text-xs font-bold text-text-secondary uppercase">Average Score</div>
            <div className="text-2xl font-extrabold text-primary mt-1">{data.avgScore} pts</div>
            <div className="text-[11px] text-text-secondary mt-1">Per student aggregate</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-border shadow-card">
            <div className="text-xs font-bold text-text-secondary uppercase">Avg Hints Used</div>
            <div className="text-2xl font-extrabold text-amber-600 mt-1">{data.avgHintsUsed}</div>
            <div className="text-[11px] text-text-secondary mt-1">Avg time: {data.avgTimeSeconds}s per puzzle</div>
          </div>
        </div>

        {/* Theme Performance & Student Roster Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tactical Theme Breakdown */}
          <div className="lg:col-span-1">
            <ThemePerformanceChart
              data={data.themeBreakdown}
              title="Class Theme Breakdown"
            />
          </div>

          {/* Student Roster Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-text-primary">Student Progress Roster</h4>
              <span className="text-xs text-text-secondary">{data.studentBreakdown.length} students</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-text-secondary text-[10px] uppercase font-bold">
                    <th className="pb-2">Student</th>
                    <th className="pb-2">Solved</th>
                    <th className="pb-2">Accuracy</th>
                    <th className="pb-2">Score</th>
                    <th className="pb-2">Hints</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.studentBreakdown.map((st) => (
                    <tr key={st.studentId} className="hover:bg-slate-50/50">
                      <td className="py-3 font-bold text-text-primary">{st.studentName}</td>
                      <td className="py-3 font-mono">{st.solved} / {st.total}</td>
                      <td className="py-3 font-mono font-bold">
                        <span className={st.accuracy >= 90 ? 'text-emerald-600' : 'text-amber-600'}>
                          {st.accuracy}%
                        </span>
                      </td>
                      <td className="py-3 font-mono text-primary font-bold">{st.score}</td>
                      <td className="py-3 font-mono text-amber-600">{st.hintsUsed}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          st.status === 'passed' ? 'bg-emerald-100 text-emerald-800' :
                          st.status === 'failed' ? 'bg-red-100 text-red-800' :
                          st.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {st.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {data.studentBreakdown.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-text-secondary italic">
                        No students have attempted this homework yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (err) {
    console.error('[CoachHomeworkAnalyticsPage]', err);
    notFound();
  }
}
