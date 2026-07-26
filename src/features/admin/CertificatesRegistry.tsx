'use client';

import React, { useState, useTransition } from 'react';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import FilterBar from '@/components/dashboard/ui/FilterBar';
import TableActions, { type TableActionItem } from '@/components/dashboard/ui/TableActions';
import Pagination from '@/components/dashboard/ui/Pagination';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

import ConfirmationModal from '@/components/dashboard/ui/ConfirmationModal';

import { issueCertificateAction, deleteCertificateAction } from '@/actions/certificates';
import { formatShortDate } from '@/utils/formatDate';

import type { AdminCertificateRow, AdminStudentRow } from '@/types/dashboard';

interface CertificatesRegistryProps {
  certificates: AdminCertificateRow[];
  students: AdminStudentRow[];
}

export default function CertificatesRegistry({ certificates, students }: CertificatesRegistryProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [, startTransition] = useTransition();

  // Create state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [title, setTitle] = useState('');
  const [fileUrl, setFileUrl] = useState('');

  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  // Confirm delete state
  const [deleteItem, setDeleteItem] = useState<AdminCertificateRow | null>(null);

  const pageSize = 10;

  // Sync state
  React.useEffect(() => {
    if (!isFormOpen) {
      setStudentId('');
      setTitle('');
      setFileUrl('');
      setFormError('');
    }
  }, [isFormOpen]);

  // Filters
  const filtered = certificates.filter((c) => {
    const studentName = c.student ? `${c.student.first_name} ${c.student.last_name}`.toLowerCase() : '';
    return studentName.includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase());
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !title.trim()) {
      setFormError('Student and Certificate Title are required');
      return;
    }

    setLoading(true);
    setFormError('');

    const res = await issueCertificateAction({
      student_id: studentId,
      title,
      file_url: fileUrl || undefined,
    });

    setLoading(false);
    if (res.success) {
      setIsFormOpen(false);
    } else {
      setFormError(res.error?.message || 'Failed to issue certificate.');
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteItem) return;
    startTransition(async () => {
      await deleteCertificateAction(deleteItem.id);
      setDeleteItem(null);
    });
  };

  // Columns
  const columns = [
    { key: 'student', label: 'Student Details' },
    { key: 'course', label: 'Completed Course' },
    { key: 'issued', label: 'Issue Date' },
    { key: 'actions', label: 'Actions', width: 'w-10' },
  ];

  // Map rows
  const rows = paginated.map((c) => {
    const actions: TableActionItem[] = [
      {
        label: 'Delete Certificate',
        iconKey: 'trash',
        variant: 'danger',
        onClick: () => setDeleteItem(c),
      },
    ];

    if (c.file_url) {
      const url = c.file_url.startsWith('http')
        ? c.file_url
        : `/api/signed-url?bucket=certificates&path=${encodeURIComponent(c.file_url)}`;
      actions.unshift({
        label: 'Download / View PDF',
        iconKey: 'externalLink',
        onClick: () => window.open(url, '_blank'),
      });
    }

    return {
      student: c.student ? (
        <div className="flex flex-col">
          <span className="font-bold text-text-primary">
            {c.student.first_name} {c.student.last_name}
          </span>
          <span className="text-[10px] text-text-secondary">{c.student.email}</span>
        </div>
      ) : (
        <span className="text-xs text-text-secondary italic">Unknown Student</span>
      ),
      course: <span className="text-xs font-semibold text-text-primary">{c.title}</span>,
      issued: <span className="text-xs text-text-secondary">{formatShortDate(c.issued_at)}</span>,
      actions: <TableActions actions={actions} />,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Graduation Certificates"
        subtitle="Review, approve, generate, and sign student completion badges for graduation tracks."
        action={
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-surface-dark font-bold rounded-xl text-sm transition-all shadow-gold"
          >
            Issue Certificate
          </button>
        }
      />

      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search issued credentials..."
      />

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <DashboardTable
          columns={columns}
          rows={rows}
          emptyTitle="No Certificates Issued"
          emptyDescription="Graduated student profiles will display certificate badges here once approved by head coaches."
        />
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Issue Completion Certificate"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600">
              {formError}
            </div>
          )}

          <div>
            <label htmlFor="student-select" className="block text-xs font-bold text-text-secondary mb-1">
              Select Student
            </label>
            <select
              id="student-select"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="block w-full text-xs font-semibold text-text-primary bg-white border border-border rounded-xl px-3 py-2 pr-8 focus:outline-none cursor-pointer"
              required
            >
              <option value="">Select Student...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name} ({s.email})
                </option>
              ))}
            </select>
          </div>

          <Input
            id="cert-title"
            label="Course / Certificate Title"
            placeholder="e.g. Master Openings & Endgame Tactics"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <Input
            id="cert-fileUrl"
            label="Certificate PDF URL (Optional)"
            placeholder="https://example.com/certificate.pdf"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
          />

          <div className="flex justify-end gap-2.5 pt-4 border-t border-border mt-6">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 border border-border hover:bg-surface-light rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <Button
              type="submit"
              variant="gold"
              loading={loading}
              className="px-5 text-xs font-bold shadow-gold"
            >
              Issue Certificate
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteItem}
        title="Delete Certificate?"
        description="This will permanently delete this student's certificate record from the registry."
        confirmLabel="Delete Certificate"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  );
}
