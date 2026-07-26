import React from 'react';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import { getCoachClassRecordings } from '@/lib/coaches';
import type { TableColumn } from '@/types/dashboard';

export const dynamic = 'force-dynamic';

const COLUMNS: TableColumn[] = [
  { key: 'title', label: 'Recording Name' },
  { key: 'category', label: 'Library Category' },
  { key: 'date', label: 'Recording Date' },
  { key: 'duration', label: 'Duration' },
  { key: 'action', label: 'View File' },
];

export default async function AllRecordingsPage() {
  const recordingsRes = await getCoachClassRecordings();
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
          {rec.classType} Class
        </span>
      ),
      date: <span className="text-text-secondary text-xs">{formattedDate}</span>,
      duration: <span className="text-text-secondary text-xs">{mins} mins</span>,
      action: (
        <a
          href={rec.recordingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-dark transition-colors inline-block"
        >
          Watch
        </a>
      ),
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <TableSearchBar placeholder="Search recordings catalog..." className="max-w-md flex-1" />
      </div>
      <DashboardTable
        columns={COLUMNS}
        rows={rows}
        emptyTitle="No Recordings Available"
        emptyDescription="Upload recorded class video streams to populate the academy video libraries."
        caption="Coach Class Recordings"
      />
    </div>
  );
}
