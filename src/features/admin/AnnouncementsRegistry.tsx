'use client';

import React, { useState, useTransition } from 'react';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import FilterBar from '@/components/dashboard/ui/FilterBar';
import StatusBadge from '@/components/dashboard/ui/StatusBadge';
import TableActions, { type TableActionItem } from '@/components/dashboard/ui/TableActions';
import Pagination from '@/components/dashboard/ui/Pagination';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

import ConfirmationModal from '@/components/dashboard/ui/ConfirmationModal';

import {
  createAnnouncementAction,
  updateAnnouncementAction,
  deleteAnnouncementAction,
} from '@/actions/announcements';
import { formatShortDate } from '@/utils/formatDate';

import type { DbAnnouncement } from '@/types/dashboard';

interface AnnouncementsRegistryProps {
  announcements: DbAnnouncement[];
}

export default function AnnouncementsRegistry({ announcements }: AnnouncementsRegistryProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [, startTransition] = useTransition();

  // Create/Edit states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<DbAnnouncement | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetRole, setTargetRole] = useState<'ALL' | 'COACH' | 'STUDENT'>('ALL');
  const [isPublished, setIsPublished] = useState(false);

  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  // Confirm delete state
  const [deleteItem, setDeleteItem] = useState<DbAnnouncement | null>(null);

  const pageSize = 10;

  // Sync edit data
  React.useEffect(() => {
    if (editItem) {
      setTitle(editItem.title);
      setBody(editItem.body);
      
      const roles = editItem.target_roles;
      if (roles.includes('COACH') && roles.includes('STUDENT')) setTargetRole('ALL');
      else if (roles.includes('COACH')) setTargetRole('COACH');
      else setTargetRole('STUDENT');

      setIsPublished(editItem.is_published);
      setIsFormOpen(true);
    } else {
      setTitle('');
      setBody('');
      setTargetRole('ALL');
      setIsPublished(false);
    }
    setFormError('');
  }, [editItem]);

  // Filters
  const filtered = announcements.filter((a) => {
    return a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.body.toLowerCase().includes(search.toLowerCase());
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setFormError('Title and Body are required');
      return;
    }

    setLoading(true);
    setFormError('');

    const target_roles = targetRole === 'ALL' ? ['COACH', 'STUDENT'] : [targetRole];

    let res;
    if (editItem) {
      res = await updateAnnouncementAction(editItem.id, {
        title,
        body,
        target_roles,
        is_published: isPublished,
      });
    } else {
      res = await createAnnouncementAction({
        title,
        body,
        target_roles,
        is_published: isPublished,
      });
    }

    setLoading(false);
    if (res.success) {
      setIsFormOpen(false);
      setEditItem(null);
    } else {
      setFormError(res.error?.message || 'Action failed.');
    }
  };

  const handleTogglePublish = (announcement: DbAnnouncement) => {
    startTransition(async () => {
      await updateAnnouncementAction(announcement.id, {
        is_published: !announcement.is_published,
      });
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteItem) return;
    startTransition(async () => {
      await deleteAnnouncementAction(deleteItem.id);
      setDeleteItem(null);
    });
  };

  // Columns
  const columns = [
    { key: 'title', label: 'Announcement Title' },
    { key: 'target', label: 'Audience Group' },
    { key: 'status', label: 'Status' },
    { key: 'date', label: 'Broadcast Date' },
    { key: 'actions', label: 'Actions', width: 'w-10' },
  ];

  // Map rows
  const rows = paginated.map((a) => {
    const actions: TableActionItem[] = [
      {
        label: 'Edit details',
        iconKey: 'pencil',
        onClick: () => setEditItem(a),
      },
      {
        label: a.is_published ? 'Unpublish' : 'Publish Broadcast',
        iconKey: a.is_published ? 'x' : 'checkSquare',
        onClick: () => handleTogglePublish(a),
      },
      {
        label: 'Delete',
        iconKey: 'trash',
        variant: 'danger',
        onClick: () => setDeleteItem(a),
      },
    ];

    const targetLabel = a.target_roles.length > 1 ? 'All Members' : a.target_roles[0] || 'Members';
    const dateStr = a.published_at ? formatShortDate(a.published_at) : 'Draft';

    return {
      title: (
        <div className="flex flex-col">
          <span className="font-bold text-text-primary">{a.title}</span>
          <span className="text-[10px] text-text-secondary line-clamp-1">{a.body}</span>
        </div>
      ),
      target: (
        <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 border border-blue-100 rounded-full">
          {targetLabel}
        </span>
      ),
      status: <StatusBadge status={a.is_published ? 'active' : 'disabled'} />,
      date: <span className="text-xs text-text-secondary">{dateStr}</span>,
      actions: <TableActions actions={actions} />,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements & Broadcasts"
        subtitle="Publish notices and news updates directly to member dashboard headers."
        action={
          <button
            type="button"
            onClick={() => {
              setEditItem(null);
              setIsFormOpen(true);
            }}
            className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-surface-dark font-bold rounded-xl text-sm transition-all shadow-gold"
          >
            Create Announcement
          </button>
        }
      />

      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search broadcast logs..."
      />

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <DashboardTable
          columns={columns}
          rows={rows}
          emptyTitle="No Broadcast Announcements"
          emptyDescription="Draft and broadcast notifications to publish alerts directly to member dashboard headers."
        />
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      {/* Create / Edit Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditItem(null);
        }}
        title={editItem ? 'Edit Broadcast Announcement' : 'Draft New Announcement'}
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600">
              {formError}
            </div>
          )}

          <Input
            id="ann-title"
            label="Announcement Title"
            placeholder="e.g. Academy Maintenance Window"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <Select
            id="ann-target"
            label="Target Audience Group"
            options={[
              { value: 'ALL', label: 'All Coaches & Students' },
              { value: 'COACH', label: 'Coaches Only' },
              { value: 'STUDENT', label: 'Students & Parents Only' },
            ]}
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value as any)}
          />

          <Textarea
            id="ann-body"
            label="Announcement Message"
            placeholder="Enter details of your announcement here..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            required
          />

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is-published"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
            <label htmlFor="is-published" className="text-xs font-bold text-text-primary cursor-pointer select-none">
              Publish this announcement immediately
            </label>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-border mt-6">
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setEditItem(null);
              }}
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
              {editItem ? 'Save Updates' : 'Broadcast Alert'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteItem}
        title="Delete Announcement?"
        description="This will permanently delete the announcement broadcast. It will no longer display on dashboards."
        confirmLabel="Delete Broadcast"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  );
}
