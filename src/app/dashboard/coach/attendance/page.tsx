import React from 'react';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import AttendanceRegistry from '@/features/coach/AttendanceRegistry';
import { getCoachClasses, getCoachAttendanceLogs } from '@/lib/coaches';

export const dynamic = 'force-dynamic';

export default async function CoachAttendancePage() {
  const classesRes = await getCoachClasses();
  const logsRes = await getCoachAttendanceLogs();

  const classes = classesRes.success && classesRes.data ? classesRes.data : [];
  const logs = logsRes.success && logsRes.data ? logsRes.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Records"
        subtitle="Log student presence, note late arrivals, and record reasons for absences."
      />

      <AttendanceRegistry classes={classes} initialLogs={logs} />
    </div>
  );
}
