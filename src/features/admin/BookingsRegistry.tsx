'use client';

import React, { useState, useTransition } from 'react';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import FilterBar from '@/components/dashboard/ui/FilterBar';
import StatusBadge from '@/components/dashboard/ui/StatusBadge';
import TableActions, { type TableActionItem } from '@/components/dashboard/ui/TableActions';
import Pagination from '@/components/dashboard/ui/Pagination';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';

import {
  updateBookingStatusAction,
  assignCoachToBookingAction,
  convertBookingToStudentAction,
} from '@/actions/bookings';

import type { DbBooking, AdminCoachRow } from '@/types/dashboard';

interface BookingsRegistryProps {
  bookings: DbBooking[];
  coaches: AdminCoachRow[];
}

export default function BookingsRegistry({ bookings, coaches }: BookingsRegistryProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [, startTransition] = useTransition();

  // Dialog states
  const [assignBooking, setAssignBooking] = useState<DbBooking | null>(null);
  const [selectedCoachId, setSelectedCoachId] = useState('');
  const [convertBooking, setConvertBooking] = useState<DbBooking | null>(null);
  
  // Convert state
  const [password, setPassword] = useState('');
  const [convertError, setConvertError] = useState('');
  const [convertSuccess, setConvertSuccess] = useState(false);

  const pageSize = 10;

  // Filters
  const filtered = bookings.filter((b) => {
    const query = search.toLowerCase();
    const nameMatch = b.parent_name.toLowerCase().includes(query) ||
      b.parent_email.toLowerCase().includes(query) ||
      b.student_name.toLowerCase().includes(query);
    
    const statusMatch = statusFilter === 'ALL' || b.status.toLowerCase() === statusFilter.toLowerCase();
    return nameMatch && statusMatch;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleUpdateStatus = (bookingId: string, status: any) => {
    startTransition(async () => {
      await updateBookingStatusAction(bookingId, status);
    });
  };

  const handleAssignCoachSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignBooking || !selectedCoachId) return;
    const res = await assignCoachToBookingAction(assignBooking.id, selectedCoachId);
    if (res.success) {
      setAssignBooking(null);
      setSelectedCoachId('');
    }
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertBooking) return;
    if (password.length < 6) {
      setConvertError('Password must be at least 6 characters');
      return;
    }
    setConvertError('');
    const res = await convertBookingToStudentAction(convertBooking.id, password);
    if (res.success) {
      setConvertSuccess(true);
      setPassword('');
    } else {
      setConvertError(res.error?.message || 'Failed to convert account.');
    }
  };

  // Build columns
  const columns = [
    { key: 'parent', label: 'Parent Details' },
    { key: 'student', label: 'Child Details' },
    { key: 'preferred', label: 'Time Preference' },
    { key: 'coach', label: 'Assigned Coach' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions', width: 'w-10' },
  ];

  // Map rows
  const rows = paginated.map((b) => {
    const actions: TableActionItem[] = [];

    if (b.status === 'pending' || b.status === 'assigned') {
      actions.push({
        label: 'Assign Coach',
        iconKey: 'graduationCap',
        onClick: () => {
          setAssignBooking(b);
          setSelectedCoachId(b.assigned_coach_id || '');
        },
      });
      actions.push({
        label: 'Approve & Confirm',
        iconKey: 'checkSquare',
        variant: 'success',
        onClick: () => handleUpdateStatus(b.id, 'assigned'),
      });
      actions.push({
        label: 'Reject Request',
        iconKey: 'x',
        variant: 'danger',
        onClick: () => handleUpdateStatus(b.id, 'cancelled'),
      });
      actions.push({
        label: 'Convert to Student Account',
        iconKey: 'users',
        onClick: () => {
          setConvertBooking(b);
          setConvertSuccess(false);
          setConvertError('');
          setPassword('');
        },
      });
    }

    const coachName = coaches.find((c) => c.id === b.assigned_coach_id);

    return {
      parent: (
        <div className="flex flex-col">
          <span className="font-bold text-text-primary">{b.parent_name}</span>
          <span className="text-[10px] text-text-secondary">{b.parent_email}</span>
          <span className="text-[10px] text-text-secondary">{b.parent_phone}</span>
        </div>
      ),
      student: (
        <div className="flex flex-col">
          <span className="font-semibold text-text-primary">{b.student_name}</span>
          <span className="text-xs text-text-secondary">{b.student_age} years old</span>
        </div>
      ),
      preferred: <span className="text-xs text-text-primary font-semibold">{b.preferred_time}</span>,
      coach: coachName ? (
        <span className="text-xs font-semibold text-text-primary">
          Coach {coachName.first_name} {coachName.last_name}
        </span>
      ) : (
        <span className="text-xs text-text-secondary italic">Unassigned</span>
      ),
      status: <StatusBadge status={b.status} />,
      actions: actions.length > 0 ? <TableActions actions={actions} /> : <span className="text-xs text-text-secondary">-</span>,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Demo Bookings"
        subtitle="Review, approve, reschedule, and onboard incoming free demo class requests into students."
      />

      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search bookings by parent/student name or email..."
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'ALL', label: 'All Bookings' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'ASSIGNED', label: 'Assigned / Approved' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ],
          },
        ]}
      />

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <DashboardTable
          columns={columns}
          rows={rows}
          emptyTitle="No Demo Bookings Available"
          emptyDescription="Demo bookings requested via the public marketing page will populate here automatically."
        />
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      {/* Assign Coach Modal */}
      <Modal
        isOpen={!!assignBooking}
        onClose={() => setAssignBooking(null)}
        title="Assign Coach for Demo Class"
      >
        <p className="text-xs text-text-secondary mb-4 leading-relaxed">
          Choose one of our FIDE Grandmasters or international coaches to conduct the free demo class for {assignBooking?.student_name}.
        </p>

        <form onSubmit={handleAssignCoachSubmit} className="space-y-4">
          <div>
            <label htmlFor="coach-select" className="block text-xs font-bold text-text-secondary mb-1">
              Select Instructor
            </label>
            <select
              id="coach-select"
              value={selectedCoachId}
              onChange={(e) => setSelectedCoachId(e.target.value)}
              className="block w-full text-xs font-semibold text-text-primary bg-white border border-border rounded-xl px-3 py-2 pr-8 focus:outline-none cursor-pointer"
              required
            >
              <option value="">Select Instructor...</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  GM/Coach {c.first_name} {c.last_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setAssignBooking(null)}
              className="px-4 py-2 border border-border hover:bg-surface-light rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedCoachId}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
            >
              Assign Coach
            </button>
          </div>
        </form>
      </Modal>

      {/* Convert to Student Account Modal */}
      <Modal
        isOpen={!!convertBooking}
        onClose={() => setConvertBooking(null)}
        title="Convert to Student Account"
      >
        <p className="text-xs text-text-secondary mb-4 leading-relaxed">
          This will create a permanent Student profile for {convertBooking?.student_name} using parent email {convertBooking?.parent_email}.
        </p>

        {convertSuccess ? (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-xs font-semibold text-green-700">
              The booking has been successfully converted into an active Student Account.
            </div>
            <button
              type="button"
              onClick={() => setConvertBooking(null)}
              className="w-full px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleConvertSubmit} className="space-y-4">
            {convertError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600">
                {convertError}
              </div>
            )}
            <Input
              id="booking-student-password"
              label="Choose Password for Student Login"
              type="password"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={convertError}
              required
            />
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConvertBooking(null)}
                className="px-4 py-2 border border-border hover:bg-surface-light rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-surface-dark rounded-xl text-xs font-bold transition-colors"
              >
                Create Student Account
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
