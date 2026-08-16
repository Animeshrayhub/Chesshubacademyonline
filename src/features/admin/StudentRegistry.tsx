'use client';

import React, { useState, useTransition } from 'react';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import FilterBar from '@/components/dashboard/ui/FilterBar';
import StatusBadge from '@/components/dashboard/ui/StatusBadge';
import TableActions, { type TableActionItem } from '@/components/dashboard/ui/TableActions';
import Pagination from '@/components/dashboard/ui/Pagination';
import UserFormModal from '@/components/dashboard/ui/UserFormModal';
import ConfirmationModal from '@/components/dashboard/ui/ConfirmationModal';
import Input from '@/components/ui/Input';
import Link from 'next/link';
import Modal from '@/components/ui/Modal';


import {
  createStudentAction,
  createCoachAction,
  createAdminAction,
  updateUserAction,
  disableUserAction,
  enableUserAction,
  archiveUserAction,
  resetPasswordAction,
  deleteUserAction,
} from '@/actions/users';

import type { AdminStudentRow, StudentLevel } from '@/types/dashboard';

import { useRouter } from 'next/navigation';

interface StudentRegistryProps {
  students: AdminStudentRow[];
  coaches?: any[];
}

export default function StudentRegistry({ students, coaches }: StudentRegistryProps) {
  const router = useRouter();
  const [studentList, setStudentList] = useState<AdminStudentRow[]>(students);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [, startTransition] = useTransition();

  // Sync state when props update
  React.useEffect(() => {
    setStudentList(students);
  }, [students]);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminStudentRow | null>(null);
  
  // Password reset modal state
  const [resetUser, setResetUser] = useState<AdminStudentRow | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Status confirm modals
  const [confirmArchive, setConfirmArchive] = useState<AdminStudentRow | null>(null);
  const [confirmDisable, setConfirmDisable] = useState<AdminStudentRow | null>(null);
  const [confirmEnable, setConfirmEnable] = useState<AdminStudentRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminStudentRow | null>(null);

  const pageSize = 10;

  // Filter students
  const filtered = studentList.filter((s) => {
    const nameMatch = `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    
    const level = s.profile?.level || 'BEGINNER';
    const levelMatch = levelFilter === 'ALL' || level === levelFilter;
    
    let status = 'active';
    if (s.archived_at) status = 'archived';
    else if (!s.is_active) status = 'disabled';
    
    const statusMatch = statusFilter === 'ALL' || status === statusFilter.toLowerCase();
    
    return nameMatch && levelMatch && statusMatch;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleCreate = async (data: any) => {
    let res;
    if (data.role === 'COACH') {
      res = await createCoachAction(data);
    } else if (data.role === 'ADMIN') {
      res = await createAdminAction(data);
    } else {
      res = await createStudentAction(data);
    }
    if (res.success) {
      router.refresh();
    }
    return res;
  };

  const handleEdit = async (data: any) => {
    if (!editUser) return { success: false };
    const res = await updateUserAction(editUser.id, data);
    if (res.success) {
      setStudentList((prev) =>
        prev.map((s) => (s.id === editUser.id ? { ...s, ...data } : s))
      );
      router.refresh();
    }
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
    const targetId = confirmArchive.id;
    setStudentList((prev) => prev.filter((s) => s.id !== targetId));
    setConfirmArchive(null);
    startTransition(async () => {
      await archiveUserAction(targetId);
      router.refresh();
    });
  };

  const handleConfirmDisable = () => {
    if (!confirmDisable) return;
    const targetId = confirmDisable.id;
    setStudentList((prev) =>
      prev.map((s) => (s.id === targetId ? { ...s, is_active: false } : s))
    );
    setConfirmDisable(null);
    startTransition(async () => {
      await disableUserAction(targetId);
      router.refresh();
    });
  };

  const handleConfirmEnable = () => {
    if (!confirmEnable) return;
    const targetId = confirmEnable.id;
    setStudentList((prev) =>
      prev.map((s) => (s.id === targetId ? { ...s, is_active: true } : s))
    );
    setConfirmEnable(null);
    startTransition(async () => {
      await enableUserAction(targetId);
      router.refresh();
    });
  };

  const handleConfirmDelete = () => {
    if (!confirmDelete) return;
    const targetId = confirmDelete.id;
    setStudentList((prev) => prev.filter((s) => s.id !== targetId));
    setConfirmDelete(null);
    startTransition(async () => {
      await deleteUserAction(targetId);
      router.refresh();
    });
  };

  // Build columns
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'level', label: 'Level' },
    { key: 'coach', label: 'Coach' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions', width: 'w-10' },
  ];

  // Map rows
  const rows = paginated.map((s) => {
    const actions: TableActionItem[] = [
      {
        label: 'View Profile',
        iconKey: 'eye',
        onClick: () => {
          window.location.href = `/dashboard/admin/students/${s.id}`;
        },
      },
      {
        label: 'Edit Details',
        iconKey: 'pencil',
        onClick: () => setEditUser(s),
      },
      {
        label: 'Reset Password',
        iconKey: 'shield',
        onClick: () => {
          setResetUser(s);
          setResetSuccess(false);
          setPasswordError('');
        },
      },
    ];

    if (s.is_active) {
      actions.push({
        label: 'Disable Account',
        iconKey: 'x',
        variant: 'danger',
        onClick: () => setConfirmDisable(s),
      });
    } else {
      actions.push({
        label: 'Enable Account',
        iconKey: 'checkSquare',
        variant: 'success',
        onClick: () => setConfirmEnable(s),
      });
    }

    actions.push({
      label: 'Delete Account',
      iconKey: 'x',
      variant: 'danger',
      onClick: () => setConfirmDelete(s),
    });

    let status = 'active';
    if (s.archived_at) status = 'archived';
    else if (!s.is_active) status = 'disabled';

    return {
      name: (
        <Link href={`/dashboard/admin/students/${s.id}`} className="font-bold text-text-primary hover:text-primary transition-colors">
          {s.first_name} {s.last_name}
        </Link>
      ),
      email: <span className="text-xs text-text-secondary">{s.email}</span>,
      level: (() => {
        const lvl = (s.profile?.level ?? 'BEGINNER') as string;
        const colorMap: Record<string, string> = {
          BEGINNER: 'bg-green-50 text-green-700 border border-green-100',
          INTERMEDIATE: 'bg-blue-50 text-blue-700 border border-blue-100',
          ADVANCED: 'bg-purple-50 text-purple-700 border border-purple-100',
        };
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${colorMap[lvl] ?? colorMap.BEGINNER}`}>
            {lvl.charAt(0) + lvl.slice(1).toLowerCase()}
          </span>
        );
      })(),
      coach: s.assigned_coach ? (
        <span className="text-xs font-semibold text-text-primary">
          Coach {s.assigned_coach.first_name}
        </span>
      ) : (
        <span className="text-xs text-text-secondary italic">Unassigned</span>
      ),
      status: <StatusBadge status={status} />,
      actions: <TableActions actions={actions} />,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Registry"
        subtitle="Manage student profiles, skill progression levels, parent details, and coaches assignments."
        action={
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-surface-dark font-bold rounded-xl text-sm transition-all shadow-gold"
          >
            Add New Student
          </button>
        }
      />

      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search students by name or email..."
        filters={[
          {
            key: 'level',
            label: 'Track',
            value: levelFilter,
            onChange: setLevelFilter,
            options: [
              { value: 'ALL', label: 'All Levels' },
              { value: 'BEGINNER', label: 'Beginner' },
              { value: 'INTERMEDIATE', label: 'Intermediate' },
              { value: 'ADVANCED', label: 'Advanced' },
            ],
          },
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
          emptyTitle="No Students Onboarded"
          emptyDescription="Onboard a student using the button above to begin managing their profiles."
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
        title="Create Student Account"
        coaches={coaches}
      />

      {/* User Form Modal (Edit) */}
      {editUser && (
        <UserFormModal
          isOpen={true}
          onClose={() => setEditUser(null)}
          onSubmit={handleEdit}
          initialData={editUser}
          title={`Edit Profile: ${editUser.first_name} ${editUser.last_name}`}
          coaches={coaches}
        />
      )}

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={!!confirmArchive}
        title="Archive Student Account?"
        description="This will soft-delete the student. They will no longer be able to log in or appear in active classroom rosters."
        confirmLabel="Archive User"
        onConfirm={handleConfirmArchive}
        onCancel={() => setConfirmArchive(null)}
      />

      <ConfirmationModal
        isOpen={!!confirmDisable}
        title="Disable Student Account?"
        description="The student will be blocked from logging in. You can enable them again at any time."
        confirmLabel="Disable User"
        onConfirm={handleConfirmDisable}
        onCancel={() => setConfirmDisable(null)}
      />

      <ConfirmationModal
        isOpen={!!confirmEnable}
        title="Enable Student Account?"
        description="The student account will be activated, restoring their login permissions immediately."
        confirmLabel="Enable User"
        onConfirm={handleConfirmEnable}
        onCancel={() => setConfirmEnable(null)}
      />

      <ConfirmationModal
        isOpen={!!confirmDelete}
        title="Delete Student Account Permanently?"
        description="This will permanently delete this account from Supabase Auth and database records. This action cannot be undone."
        confirmLabel="Delete User Account"
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
              id="student-reset-password"
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
