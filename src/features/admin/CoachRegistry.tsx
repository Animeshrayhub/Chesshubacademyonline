'use client';

import React, { useState, useTransition } from 'react';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import FilterBar from '@/components/dashboard/ui/FilterBar';
import RoleBadge from '@/components/dashboard/ui/RoleBadge';
import StatusBadge from '@/components/dashboard/ui/StatusBadge';
import TableActions, { type TableActionItem } from '@/components/dashboard/ui/TableActions';
import Pagination from '@/components/dashboard/ui/Pagination';
import UserFormModal from '@/components/dashboard/ui/UserFormModal';
import ConfirmationModal from '@/components/dashboard/ui/ConfirmationModal';
import Input from '@/components/ui/Input';
import Link from 'next/link';
import Modal from '@/components/ui/Modal';
import AdminCoachPhotoModal from '@/components/dashboard/ui/AdminCoachPhotoModal';


import { updateCoachProfileAction } from '@/actions/coaches';
import {
  createCoachAction,
  createStudentAction,
  createAdminAction,
  updateUserAction,
  disableUserAction,
  enableUserAction,
  archiveUserAction,
  resetPasswordAction,
} from '@/actions/users';

import type { AdminCoachRow } from '@/types/dashboard';

interface CoachRegistryProps {
  coaches: AdminCoachRow[];
}

export default function CoachRegistry({ coaches }: CoachRegistryProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [, startTransition] = useTransition();

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminCoachRow | null>(null);
  
  // Password reset modal state
  const [resetUser, setResetUser] = useState<AdminCoachRow | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Status confirm modals
  const [confirmArchive, setConfirmArchive] = useState<AdminCoachRow | null>(null);
  const [confirmDisable, setConfirmDisable] = useState<AdminCoachRow | null>(null);
  const [confirmEnable, setConfirmEnable] = useState<AdminCoachRow | null>(null);
  const [photoCoach, setPhotoCoach] = useState<AdminCoachRow | null>(null);


  const pageSize = 10;

  // Filter coaches
  const filtered = coaches.filter((c) => {
    const nameMatch = `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    
    let status = 'active';
    if (c.archived_at) status = 'archived';
    else if (!c.is_active) status = 'disabled';
    
    const statusMatch = statusFilter === 'ALL' || status === statusFilter.toLowerCase();
    
    return nameMatch && statusMatch;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleCreate = async (data: any) => {
    if (data.role === 'STUDENT') {
      return await createStudentAction(data);
    }
    if (data.role === 'ADMIN') {
      return await createAdminAction(data);
    }
    const res = await createCoachAction(data);
    return res;
  };

  const handleEdit = async (data: any) => {
    if (!editUser) return { success: false };
    const res = await updateUserAction(editUser.id, data);
    return res;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    setPasswordError('');
    const res = await resetPasswordAction(resetUser.id, newPassword);
    if (res.success) {
      setResetSuccess(true);
      setNewPassword('');
    } else {
      setPasswordError(res.error?.message || 'Failed to reset password');
    }
  };

  const handleConfirmArchive = () => {
    if (!confirmArchive) return;
    startTransition(async () => {
      await archiveUserAction(confirmArchive.id);
      setConfirmArchive(null);
    });
  };

  const handleConfirmDisable = () => {
    if (!confirmDisable) return;
    startTransition(async () => {
      await disableUserAction(confirmDisable.id);
      setConfirmDisable(null);
    });
  };

  const handleConfirmEnable = () => {
    if (!confirmEnable) return;
    startTransition(async () => {
      await enableUserAction(confirmEnable.id);
      setConfirmEnable(null);
    });
  };

  // Build columns
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'title', label: 'FIDE Title' },
    { key: 'students', label: 'Assigned Students' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions', width: 'w-10' },
  ];

  // Map rows
  const rows = paginated.map((c) => {
    const actions: TableActionItem[] = [
      {
        label: 'View Registry details',
        iconKey: 'eye',
        onClick: () => {
          window.location.href = `/dashboard/admin/coaches/${c.id}`;
        },
      },
      {
        label: 'Edit Details',
        iconKey: 'pencil',
        onClick: () => setEditUser(c),
      },
      {
        label: 'Set Profile Photo (Google Drive)',
        iconKey: 'pencil',
        onClick: () => setPhotoCoach(c),
      },
      {
        label: 'Reset Password',
        iconKey: 'shield',
        onClick: () => {
          setResetUser(c);
          setResetSuccess(false);
          setPasswordError('');
        },
      },
    ];


    if (c.is_active) {
      actions.push({
        label: 'Disable Account',
        iconKey: 'x',
        variant: 'danger',
        onClick: () => setConfirmDisable(c),
      });
    } else {
      actions.push({
        label: 'Enable Account',
        iconKey: 'checkSquare',
        variant: 'success',
        onClick: () => setConfirmEnable(c),
      });
    }

    actions.push({
      label: 'Archive (Soft Delete)',
      iconKey: 'trash',
      variant: 'danger',
      onClick: () => setConfirmArchive(c),
    });

    let status = 'active';
    if (c.archived_at) status = 'archived';
    else if (!c.is_active) status = 'disabled';

    return {
      name: (
        <Link href={`/dashboard/admin/coaches/${c.id}`} className="font-bold text-text-primary hover:text-primary transition-colors">
          {c.first_name} {c.last_name}
        </Link>
      ),
      email: <span className="text-xs text-text-secondary">{c.email}</span>,
      title: <RoleBadge role="COACH" className="bg-purple-50/50" />,
      students: (
        <span className="text-xs font-semibold text-text-primary">
          {c.assigned_student_count} Students
        </span>
      ),
      status: <StatusBadge status={status} />,
      actions: <TableActions actions={actions} />,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coaches Registry"
        subtitle="Manage grandmaster and international master accounts, assignments, and availability profiles."
        action={
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-surface-dark font-bold rounded-xl text-sm transition-all shadow-gold"
          >
            Onboard Coach
          </button>
        }
      />

      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search coaches by name or email..."
        filters={[
          {
            key: 'status',
            label: 'Availability',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'ALL', label: 'All Statuses' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'DISABLED', label: 'Disabled' },
            ],
          },
        ]}
      />

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <DashboardTable
          columns={columns}
          rows={rows}
          emptyTitle="No Coaches Onboarded"
          emptyDescription="Onboard a FIDE rated Grandmaster or International Master to begin scheduling and coaching sessions."
        />
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      {/* User Form Modal (Create) */}
      <UserFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
        title="Onboard FIDE Coach"
      />

      {/* User Form Modal (Edit) */}
      {editUser && (
        <UserFormModal
          isOpen={true}
          onClose={() => setEditUser(null)}
          onSubmit={handleEdit}
          initialData={editUser}
          title={`Edit Details: Coach ${editUser.first_name} ${editUser.last_name}`}
        />
      )}

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={!!confirmArchive}
        title="Archive Coach Account?"
        description="This will soft-delete the coach. They will no longer be able to log in or manage students."
        confirmLabel="Archive User"
        onConfirm={handleConfirmArchive}
        onCancel={() => setConfirmArchive(null)}
      />

      <ConfirmationModal
        isOpen={!!confirmDisable}
        title="Disable Coach Account?"
        description="The coach will be blocked from logging in. You can enable them again at any time."
        confirmLabel="Disable User"
        onConfirm={handleConfirmDisable}
        onCancel={() => setConfirmDisable(null)}
      />

      <ConfirmationModal
        isOpen={!!confirmEnable}
        title="Enable Coach Account?"
        description="The coach account will be activated, restoring their login permissions immediately."
        confirmLabel="Enable User"
        onConfirm={handleConfirmEnable}
        onCancel={() => setConfirmEnable(null)}
      />

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!resetUser}
        onClose={() => setResetUser(null)}
        title={`Reset Password: Coach ${resetUser?.first_name} ${resetUser?.last_name}`}
      >
        <p className="text-xs text-text-secondary mb-4 leading-relaxed">
          Enter a new secure password for this user. This will update their authentication record immediately.
        </p>

        {resetSuccess ? (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-xs font-semibold text-green-700">
              Password has been updated successfully.
            </div>
            <button
              type="button"
              onClick={() => setResetUser(null)}
              className="w-full px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <Input
              id="coach-reset-password"
              label="New Password"
              type="password"
              placeholder="Min 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={passwordError}
              required
            />
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setResetUser(null)}
                className="px-4 py-2 border border-border hover:bg-surface-light rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Save Password
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Admin Coach Photo Manager Modal */}
      {photoCoach && (
        <AdminCoachPhotoModal
          isOpen={true}
          onClose={() => setPhotoCoach(null)}
          coachName={`${photoCoach.first_name} ${photoCoach.last_name}`}
          currentImageUrl={photoCoach.profile?.photo_url || ''}
          onSaveImageUrl={async (newUrl) => {
            await updateCoachProfileAction(photoCoach.id, { photo_url: newUrl });
            setPhotoCoach(null);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

