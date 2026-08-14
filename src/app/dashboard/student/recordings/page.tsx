import React from 'react';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import { getStudentClassRecordings } from '@/lib/students';
import type { TableColumn } from '@/types/dashboard';

export const dynamic = 'force-dynamic';

const COLUMNS: TableColumn[] = [
  { key: 'title', label: 'Video Lecture Title' },
  { key: 'category', label: 'Library Category' },
  { key: 'date', label: 'Recording Date' },
  { key: 'action', label: 'View Recording' },
];

export default async function StudentAllRecordingsPage() {
  const recordingsRes = await getStudentClassRecordings();
  const recordings = recordingsRes.success && recordingsRes.data ? recordingsRes.data : [];

  const rows = recordings.map((rec) => {
    const formattedDate = new Date(rec.recordedDate).toLocaleDateString('en-US', {
      dateStyle: 'medium',
    });
    const mins = Math.floor((rec.durationSeconds || 0) / 60);
    return {
      title: <span className="font-semibold text-text-primary text-xs">Class Session recording {rec.id.substring(0, 5)}</span>,
      category: (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
          {rec.classType} Class ({mins} mins)
        </span>
      ),
      date: <span className="text-text-secondary text-xs" suppressHydrationWarning>{formattedDate}</span>,
      action: (
        <a
          href={rec.recordingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-dark transition-colors inline-block"
        >
          Watch Lecture
        </a>
      ),
    };
  });

  return (
    <div className="space-y-4">
      <TableSearchBar placeholder="Search session archives..." className="max-w-md" />
      <DashboardTable
        columns={COLUMNS}
        rows={rows}
        emptyTitle="No Recordings Available"
        emptyDescription="Your class recording archive is currently empty. Check back once your first private lesson is complete."
        caption="Student Class recordings archive"
      />
    </div>
  );
}
