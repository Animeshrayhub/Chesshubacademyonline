import React from 'react';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import { getStudentDashboardStats } from '@/lib/students';

export const dynamic = 'force-dynamic';

export default async function StudentProgressPage() {
  const statsRes = await getStudentDashboardStats();
  const stats = statsRes.success && statsRes.data ? statsRes.data : {
    completedHomework: 0,
    classesToday: 0,
    activeAssignments: 0,
    certificates: 0,
    level: 'Beginner',
    lichess: null,
  };

  const getPercent = (completed: number, active: number) => {
    const total = completed + active;
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const homeworkProgress = getPercent(stats.completedHomework, stats.activeAssignments);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Learning Progress"
        subtitle="Track your curriculum milestone achievements, workbook submission history, and ratings progression."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Course Track Progression Card */}
        <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
          <h3 className="text-base font-bold text-text-primary">Academy Course Track</h3>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary font-medium">Current Level:</span>
              <span className="font-bold text-primary uppercase">{stats.level}</span>
            </div>
            
            {/* Progress Visual Bar */}
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{
                  width: stats.level === 'ADVANCED' ? '100%' : stats.level === 'INTERMEDIATE' ? '66%' : '33%',
                }}
              ></div>
            </div>
            
            <div className="flex justify-between text-[10px] text-text-secondary font-semibold">
              <span>Beginner</span>
              <span>Intermediate</span>
              <span>Advanced</span>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-between text-xs">
            <span className="text-text-secondary">Issued Certificates:</span>
            <span className="font-bold text-text-primary">{stats.certificates} Badges</span>
          </div>
        </div>

        {/* Homework & Tactics Accuracy Card */}
        <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
          <h3 className="text-base font-bold text-text-primary">Workbook Task Completion</h3>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary font-medium">Completed:</span>
              <span className="font-bold text-text-primary">{stats.completedHomework} / {stats.completedHomework + stats.activeAssignments} Exercises</span>
            </div>
            
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-accent h-full transition-all duration-300"
                style={{ width: `${homeworkProgress}%` }}
              ></div>
            </div>

            <div className="flex justify-between text-[10px] text-text-secondary font-semibold">
              <span>0% Done</span>
              <span>{homeworkProgress}% Complete</span>
              <span>100% Mastered</span>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-between text-xs">
            <span className="text-text-secondary">Pending Reviews:</span>
            <span className="font-bold text-text-primary">{stats.activeAssignments} Sheets</span>
          </div>
        </div>
      </div>

      {/* Lichess Ratings Tracker Block */}
      {stats.lichess && (
        <div className="bg-white rounded-2xl border border-border shadow-card p-6">
          <h3 className="text-base font-bold text-text-primary mb-4">Lichess Performance Tracker</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-4 bg-slate-50 border border-border/80 rounded-xl space-y-1">
              <span className="text-[10px] text-text-secondary uppercase font-bold block">Tactical Puzzle Rating</span>
              <span className="text-2xl font-extrabold text-text-primary font-mono">{stats.lichess.ratings.puzzle}</span>
              <p className="text-[10px] text-text-secondary">Measures tactical accuracy and mate-in-N scores.</p>
            </div>
            <div className="p-4 bg-slate-50 border border-border/80 rounded-xl space-y-1">
              <span className="text-[10px] text-text-secondary uppercase font-bold block">Rapid Rating</span>
              <span className="text-2xl font-extrabold text-text-primary font-mono">{stats.lichess.ratings.rapid}</span>
              <p className="text-[10px] text-text-secondary">Measures standard chess performance in live sessions.</p>
            </div>
            <div className="p-4 bg-slate-50 border border-border/80 rounded-xl space-y-1">
              <span className="text-[10px] text-text-secondary uppercase font-bold block">Blitz Rating</span>
              <span className="text-2xl font-extrabold text-text-primary font-mono">{stats.lichess.ratings.blitz}</span>
              <p className="text-[10px] text-text-secondary font-medium">Measures lightning-fast speed and tactical responses.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
