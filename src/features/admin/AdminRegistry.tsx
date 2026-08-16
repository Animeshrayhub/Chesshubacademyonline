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

import {
  createAdminAction,
  createStudentAction,
  createCoachAction,
  updateUserAction,
  disableUserAction,
  enableUserAction,
  archiveUserAction,
  resetPasswordAction,
  deleteUserAction,
} from '@/actions/users';

import type { DbUser } from '@/types/dashboard';

interface AdminRegistryProps {
  admins: DbUser[];
}

export default function AdminRegistry({ admins }: AdminRegistryProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [, startTransition] = useTransition();

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<DbUser | null>(null);
  
  // Password reset modal state
  const [resetUser, setResetUser] = useState<DbUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Status confirm modals
  const [confirmArchive, setConfirmArchive] = useState<DbUser | null>(null);
  const [confirmDisable, setConfirmDisable] = useState<DbUser | null>(null);
  const [confirmEnable, setConfirmEnable] = useState<DbUser | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DbUser | null>(null);

  const pageSize = 10;

  // Filter admins
  const filtered = admins.filter((a) => {
    const nameMatch = `${a.first_name} ${a.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase());
    
    let status = 'active';
    if (a.archived_at) status = 'archived';
    else if (!a.is_active) status = 'disabled';
    
    const statusMatch = statusFilter === 'ALL' || status === statusFilter.toLowerCase();
    
    return nameMatch && statusMatch;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleCreate = async (data: any) => {
    if (data.role === 'STUDENT') {
      return await createStudentAction(data);
    }
    if (data.role === 'COACH') {
      return await createCoachAction(data);
    }
    const res = await createAdminAction(data);
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

  const handleConfirmDelete = () => {
    if (!confirmDelete) return;
    startTransition(async () => {
      await deleteUserAction(confirmDelete.id);
      setConfirmDelete(null);
    });
  };

  // Build columns
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions', width: 'w-10' },
  ];

  // Map rows
  const rows = paginated.map((a) => {
    const actions: TableActionItem[] = [
      {
        label: 'Edit Details',
        iconKey: 'pencil',
        onClick: () => setEditUser(a),
      },
      {
        label: 'Reset Password',
        iconKey: 'shield',
        onClick: () => {
          setResetUser(a);
          setResetSuccess(false);
          setPasswordError('');
        },
      },
    ];

    if (a.is_active) {
      actions.push({
        label: 'Disable Account',
        iconKey: 'x',
        variant: 'danger',
        onClick: () => setConfirmDisable(a),
      });
    } else {
      actions.push({
        label: 'Enable Account',
        iconKey: 'checkSquare',
        variant: 'success',
        onClick: () => setConfirmEnable(a),
      });
    }

    actions.push({
      label: 'Delete Account',
      iconKey: 'x',
      variant: 'danger',
      onClick: () => setConfirmDelete(a),
    });

    let status = 'active';
    if (a.archived_at) status = 'archived';
    else if (!a.is_active) status = 'disabled';

    return {
      name: (
        <span className="font-bold text-text-primary">
          {a.first_name} {a.last_name}
        </span>
      ),
      email: <span className="text-xs text-text-secondary">{a.email}</span>,
      role: <RoleBadge role="ADMIN" className="capitalize bg-blue-50/50" />,
      status: <StatusBadge status={status} />,
      actions: <TableActions actions={actions} />,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin User Management"
        subtitle="Manage administrator accounts and system-wide configurations access."
        action={
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-surface-dark font-bold rounded-xl text-sm transition-all shadow-gold"
          >
            Add New Admin
          </button>
        }
      />

      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search admins by name or email..."
        filters={[
          {
            key: 'status',
            label: 'Status',
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
          emptyTitle="No Admins Registered"
          emptyDescription="Add an administrator using the button above to grant dashboard access."
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
        title="Create Admin Account"
      />

      {/* User Form Modal (Edit) */}
      {editUser && (
        <UserFormModal
          isOpen={true}
          onClose={() => setEditUser(null)}
          onSubmit={handleEdit}
          initialData={editUser}
          title={`Edit Profile: ${editUser.first_name} ${editUser.last_name}`}
        />
      )}

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={!!confirmArchive}
        title="Archive Admin Account?"
        description="This will soft-delete the admin. They will no longer be able to log in or manage settings."
        confirmLabel="Archive User"
        onConfirm={handleConfirmArchive}
        onCancel={() => setConfirmArchive(null)}
      />

      <ConfirmationModal
        isOpen={!!confirmDisable}
        title="Disable Admin Account?"
        description="The admin will be blocked from logging in. You can enable them again at any time."
        confirmLabel="Disable User"
        onConfirm={handleConfirmDisable}
        onCancel={() => setConfirmDisable(null)}
      />

      <ConfirmationModal
        isOpen={!!confirmEnable}
        title="Enable Admin Account?"
        description="The admin account will be activated, restoring their login permissions immediately."
        confirmLabel="Enable User"
        onConfirm={handleConfirmEnable}
        onCancel={() => setConfirmEnable(null)}
      />

      <ConfirmationModal
        isOpen={!!confirmDelete}
        title="Delete Admin Account Permanently?"
        description="This will permanently delete this account from Supabase Auth and database records. This action cannot be undone."
        confirmLabel="Delete Admin Account"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!resetUser}
        onClose={() => setResetUser(null)}
        title={`Reset Password: ${resetUser?.first_name} ${resetUser?.last_name}`}
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
              id="admin-reset-password"
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
    </div>
  );
}
