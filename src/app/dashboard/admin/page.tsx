import React from 'react';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import StatCard from '@/components/dashboard/ui/StatCard';
import QuickActionCard from '@/components/dashboard/ui/QuickActionCard';
import ActivityFeed from '@/components/dashboard/ui/ActivityFeed';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import type { StatCardData, QuickAction, ActivityItem, TableColumn } from '@/types/dashboard';

export const dynamic = 'force-dynamic';

async function fetchStats() {
  try {
    const admin = createSupabaseAdmin();
    const nowStr = new Date().toISOString();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Run all counts in parallel
    const [
      { count: totalClasses },
      { count: todayClasses },
      { count: upcomingClasses },
      { count: homeworkCount },
    ] = await Promise.all([
      admin.from('classes').select('*', { count: 'exact', head: true }).is('archived_at', null),
      admin.from('classes').select('*', { count: 'exact', head: true }).is('archived_at', null).gte('scheduled_start', todayStart.toISOString()).lte('scheduled_start', todayEnd.toISOString()),
      admin.from('classes').select('*', { count: 'exact', head: true }).is('archived_at', null).gt('scheduled_start', nowStr),
      admin.from('homework_assignments').select('*', { count: 'exact', head: true }).eq('status', 'assigned'),
    ]);

    return {
      totalClasses: totalClasses ?? 0,
      todayClasses: todayClasses ?? 0,
      upcomingClasses: upcomingClasses ?? 0,
      homework: homeworkCount ?? 0,
    };
  } catch {
    return { totalClasses: 0, todayClasses: 0, upcomingClasses: 0, homework: 0 };
  }
}

async function fetchRecentBookings() {
  try {
    const admin = createSupabaseAdmin();
    const { data } = await admin
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);
    return data ?? [];
  } catch {
    return [];
  }
}

async function fetchAuditLogs() {
  try {
    const admin = createSupabaseAdmin();
    const { data } = await admin
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function AdminOverviewPage() {
  const stats = await fetchStats();
  const recentBookings = await fetchRecentBookings();
  const auditLogs = await fetchAuditLogs();

  const statsCards: StatCardData[] = [
    {
      label: 'Total Classes',
      value: String(stats.totalClasses),
      iconKey: 'video',
      trend: 'neutral',
      trendValue: 'All scheduled sessions',
      colorScheme: 'blue',
    },
    {
      label: "Today's Classes",
      value: String(stats.todayClasses),
      iconKey: 'calendarDays',
      trend: 'neutral',
      trendValue: 'Scheduled for today',
      colorScheme: 'purple',
    },
    {
      label: 'Upcoming Classes',
      value: String(stats.upcomingClasses),
      iconKey: 'activity',
      trend: 'neutral',
      trendValue: 'Future sessions',
      colorScheme: 'gold',
    },
    {
      label: 'Pending Homework',
      value: String(stats.homework),
      iconKey: 'checkSquare',
      trend: 'neutral',
      trendValue: 'Awaiting reviews',
      colorScheme: 'green',
    },
  ];

  const quickActions: QuickAction[] = [
    {
      label: 'Add New Student',
      description: 'Create student account',
      href: '/dashboard/admin/students',
      iconKey: 'users',
      colorScheme: 'blue',
    },
    {
      label: 'Assign FIDE Coach',
      description: 'Onboard a new instructor',
      href: '/dashboard/admin/coaches',
      iconKey: 'graduationCap',
      colorScheme: 'purple',
    },
    {
      label: 'Broadcast News',
      description: 'Publish academy updates',
      href: '/dashboard/admin/announcements',
      iconKey: 'megaphone',
      colorScheme: 'gold',
    },
    {
      label: 'Configure System',
      description: 'Manage site settings',
      href: '/dashboard/admin/settings',
      iconKey: 'settings',
      colorScheme: 'green',
    },
  ];

  const activities: ActivityItem[] = auditLogs.map((log: any) => {
    const actorName = log.profiles?.display_name || 'System';
    const tableFriendly = log.table_name.replace(/_/g, ' ');
    const actionFriendly = log.action === 'INSERT' ? 'created' 
                         : log.action === 'UPDATE' ? 'updated' 
                         : 'deleted';
    
    return {
      id: log.id,
      type: 'system',
      description: `${actorName} ${actionFriendly} a ${tableFriendly} record`,
      timestamp: new Date(log.created_at).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      }),
      iconKey: log.action === 'INSERT' ? 'checkSquare' : log.action === 'DELETE' ? 'trash' : 'settings',
    };
  });

  if (activities.length === 0) {
    activities.push({
      id: 'act-empty',
      type: 'system',
      description: 'No recent database audit logs recorded.',
      timestamp: 'Today',
      iconKey: 'activity',
    });
  }

  const bookingColumns: TableColumn[] = [
    { key: 'student_name', label: 'Student' },
    { key: 'parent_name', label: 'Parent' },
    { key: 'preferred_time', label: 'Preferences' },
    { key: 'status', label: 'Status' },
  ];

  const bookingRows = recentBookings.map((b: any) => ({
    student_name: <span className="font-semibold text-text-primary">{b.student_name}</span>,
    parent_name: <span className="text-text-secondary">{b.parent_name}</span>,
    preferred_time: <span className="text-xs text-text-secondary">{b.preferred_time}</span>,
    status: (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
          b.status === 'pending'
            ? 'bg-amber-50 text-amber-700 border-amber-100'
            : 'bg-green-50 text-green-700 border-green-100'
        }`}
      >
        {b.status}
      </span>
    ),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Overview"
        subtitle="Manage academic profiles, course catalog, booking requests, and overall academy statistics."
      />

      {/* KPI Metrics */}
      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statsCards.map((stat, index) => (
          <StatCard key={index} data={stat} />
        ))}
      </dl>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-bold text-text-primary mb-3">Quick Management Shortcuts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <QuickActionCard key={index} action={action} />
          ))}
        </div>
      </div>

      {/* Recent Bookings & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-bold text-text-primary">Recent Booking Requests</h2>
          <DashboardTable
            columns={bookingColumns}
            rows={bookingRows}
            emptyTitle="No Bookings Yet"
            emptyDescription="New demo class requests from the public site will show up here."
            caption="Authorized Roles overview list"
          />
        </div>
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-text-primary">System Log</h2>
          <ActivityFeed items={activities} />
        </div>
      </div>
    </div>
  );
}
