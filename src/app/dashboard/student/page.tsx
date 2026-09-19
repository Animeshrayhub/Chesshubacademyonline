import React from 'react';
import { getStudentDashboardStats, getStudentHomework } from '@/lib/students';
import { getStudentActivities } from '@/lib/activity';
import { getCurrentUser } from '@/lib/supabase/auth';
import { getLatestPublishedAnnouncement } from '@/lib/announcements';
import { getAcademyTournaments } from '@/lib/tournaments';
import StudentDashboardClient from '@/features/student/StudentDashboardClient';
import type { ActivityItem } from '@/types/dashboard';

export const dynamic = 'force-dynamic';

export default async function StudentOverviewPage() {
  const user = await getCurrentUser();
  const [statsRes, homeworkRes, activeAnnouncement, tournaments, activitiesRes] = await Promise.all([
    getStudentDashboardStats(),
    getStudentHomework(),
    getLatestPublishedAnnouncement(),
    getAcademyTournaments(),
    getStudentActivities(user?.id || '', 8),
  ]);

  const stats = statsRes.success && statsRes.data ? statsRes.data : {
    completedHomework: 0,
    classesToday: 0,
    activeAssignments: 0,
    certificates: 0,
    completedClasses: 0,
    totalEnrolledClasses: 0,
    attendanceRate: 0,
    level: 'Beginner',
    xp: 0,
    streak: 0,
    shields: 0,
    todaySolved: false,
    todayLoggedIn: true,
    isFirstLoginToday: false,
    loginBonusXp: 0,
    unlockedMilestone: null,
    solvedDates: [] as string[],
    equippedPet: 'dragon',
    equippedGear: 'none',
    unlockedGear: ['none'] as string[],
    lichess: null,
    nextClass: 'None',
    puzzleStats: null,
    weakMotifs: [
      { name: 'Pin Tactics', accuracy: 68, missedCount: 2, icon: '📌' },
      { name: 'Knight Forks', accuracy: 72, missedCount: 3, icon: '🍴' },
      { name: 'Back Rank Mate', accuracy: 75, missedCount: 1, icon: '🏰' },
    ],
    recentRecording: null,
    liveClass: null,
    botTierInfo: {
      level: 1,
      name: 'Level 1 — Pawn',
      description: 'Beginner (400)',
      rating: 400,
      avatarIcon: '♟️',
      trainingPoints: 0,
      pointsToNext: 400,
      nextLevelName: 'Level 2 — Knight',
    },
    dailyPuzzlesProgress: {
      solvedToday: 0,
      target: 3,
    },
  };

  const rawActivities = activitiesRes.success && activitiesRes.data ? activitiesRes.data : [];
  const activities: ActivityItem[] = rawActivities.map((act) => ({
    id: act.id,
    type: (act.activityType.toLowerCase() === 'class' ? 'class' : act.activityType.toLowerCase() === 'homework' ? 'homework' : 'puzzle') as any,
    description: act.description,
    timestamp: act.timestamp,
    iconKey: act.iconKey as any,
  }));

  const assignments = homeworkRes.success && homeworkRes.data ? homeworkRes.data : [];

  return (
    <StudentDashboardClient
      user={{
        id: user?.id || '',
        firstName: user?.firstName || 'Champion',
        lastName: user?.lastName || '',
        email: user?.email || '',
        role: user?.role || 'STUDENT',
      }}
      stats={stats}
      assignments={assignments}
      activities={activities}
      tournaments={tournaments || []}
      activeAnnouncement={activeAnnouncement || null}
    />
  );
}
