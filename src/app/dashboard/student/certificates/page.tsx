import React from 'react';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import type { TableColumn } from '@/types/dashboard';

export const dynamic = 'force-dynamic';

const COLUMNS: TableColumn[] = [
  { key: 'title', label: 'Certificate Name' },
  { key: 'issued', label: 'Date Issued' },
  { key: 'action', label: 'Actions' },
];

export default async function StudentCertificatesPage() {
  const user = await getCurrentUser();
  const admin = createSupabaseAdmin();

  let certificates: any[] = [];
  if (user) {
    const { data } = await admin
      .from('certificates')
      .select('*')
      .eq('student_id', user.id)
      .order('issued_at', { ascending: false });
    certificates = data ?? [];
  }

  const rows = certificates.map((c) => {
    const dateStr = new Date(c.issued_at).toLocaleDateString('en-US', {
      dateStyle: 'medium',
    });
    const url = c.file_url?.startsWith('http')
      ? c.file_url
      : `/api/signed-url?bucket=certificates&path=${encodeURIComponent(c.file_url || '')}`;

    return {
      title: <span className="font-semibold text-text-primary text-xs">{c.title}</span>,
      issued: <span className="text-text-secondary text-xs">{dateStr}</span>,
      action: c.file_url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1 bg-accent text-surface-dark rounded-lg text-xs font-bold hover:bg-accent-hover transition-colors inline-block"
        >
          Download PDF
        </a>
      ) : (
        <span className="text-slate-400 text-xs italic">No PDF attached</span>
      ),
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Graduation Certificates"
        subtitle="View and download your official academy course graduation badges and graduation track credentials."
      />

      <DashboardTable
        columns={COLUMNS}
        rows={rows}
        emptyTitle="No Certificates Issued Yet"
        emptyDescription="Your graduation certificates will appear here once you complete a curriculum track and receive approval from the head instructor."
        caption="Student Certificates List"
      />
    </div>
  );
}
