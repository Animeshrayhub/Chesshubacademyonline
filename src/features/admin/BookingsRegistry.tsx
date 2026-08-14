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
  rescheduleBookingAction,
  createBookingAction,
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
  const [isPending, startTransition] = useTransition();

  // Dialog states
  const [assignBooking, setAssignBooking] = useState<DbBooking | null>(null);
  const [selectedCoachId, setSelectedCoachId] = useState('');

  const [rescheduleBooking, setRescheduleBooking] = useState<DbBooking | null>(null);
  const [newTimeInput, setNewTimeInput] = useState('');

  const [reviewBooking, setReviewBooking] = useState<DbBooking | null>(null);

  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [newBookingData, setNewBookingData] = useState({
    parent_name: '',
    parent_email: '',
    parent_phone: '',
    student_name: '',
    student_age: 8,
    preferred_time: 'Mon 5:00 PM EST',
  });
  const [createBookingError, setCreateBookingError] = useState('');

  // Convert state
  const [convertBooking, setConvertBooking] = useState<DbBooking | null>(null);
  const [password, setPassword] = useState('');
  const [convertError, setConvertError] = useState('');
  const [convertSuccess, setConvertSuccess] = useState(false);

  const pageSize = 10;

  // Filters
  const filtered = bookings.filter((b) => {
    const query = search.toLowerCase();
    const nameMatch =
      b.parent_name.toLowerCase().includes(query) ||
      b.parent_email.toLowerCase().includes(query) ||
      b.student_name.toLowerCase().includes(query);

    const statusMatch = statusFilter === 'ALL' || b.status.toLowerCase() === statusFilter.toLowerCase();
    return nameMatch && statusMatch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
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

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleBooking || !newTimeInput.trim()) return;
    const res = await rescheduleBookingAction(rescheduleBooking.id, newTimeInput.trim());
    if (res.success) {
      setRescheduleBooking(null);
      setNewTimeInput('');
    }
  };

  const handleCreateBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateBookingError('');
    if (!newBookingData.parent_name || !newBookingData.parent_email || !newBookingData.student_name) {
      setCreateBookingError('Parent Name, Email, and Student Name are required.');
      return;
    }
    const res = await createBookingAction(newBookingData);
    if (res.success) {
      setShowNewBookingModal(false);
      setNewBookingData({
        parent_name: '',
        parent_email: '',
        parent_phone: '',
        student_name: '',
        student_age: 8,
        preferred_time: 'Mon 5:00 PM EST',
      });
    } else {
      setCreateBookingError(res.error?.message || 'Failed to create booking request.');
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
    const actions: TableActionItem[] = [
      {
        label: 'Review Details',
        iconKey: 'eye',
        onClick: () => setReviewBooking(b),
      },
      {
        label: 'Reschedule Time',
        iconKey: 'clock',
        onClick: () => {
          setRescheduleBooking(b);
          setNewTimeInput(b.preferred_time || '');
        },
      },
    ];

    if (b.status === 'pending' || b.status === 'assigned') {
      actions.push({
        label: 'Assign Instructor',
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
        label: 'Onboard as Student Account',
        iconKey: 'users',
        onClick: () => {
          setConvertBooking(b);
          setConvertSuccess(false);
          setConvertError('');
          setPassword('');
        },
      });
      actions.push({
        label: 'Reject Request',
        iconKey: 'x',
        variant: 'danger',
        onClick: () => handleUpdateStatus(b.id, 'cancelled'),
      });
    }

    const coachObj = coaches.find((c) => c.id === b.assigned_coach_id);

    return {
      parent: (
        <div className="flex flex-col">
          <span className="font-bold text-text-primary text-xs">{b.parent_name}</span>
          <span className="text-[10px] text-text-secondary">{b.parent_email}</span>
          <span className="text-[10px] text-text-secondary">{b.parent_phone}</span>
        </div>
      ),
      student: (
        <div className="flex flex-col">
          <span className="font-semibold text-text-primary text-xs">{b.student_name}</span>
          <span className="text-[10px] text-text-secondary">{b.student_age} years old</span>
        </div>
      ),
      preferred: <span className="text-xs text-text-primary font-semibold">{b.preferred_time}</span>,
      coach: coachObj ? (
        <span className="text-xs font-semibold text-text-primary">
          GM/Coach {coachObj.first_name} {coachObj.last_name}
        </span>
      ) : (
        <span className="text-xs text-text-secondary italic">Unassigned</span>
      ),
      status: <StatusBadge status={b.status} />,
      actions: <TableActions actions={actions} />,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Demo Bookings Management"
          subtitle="Review, approve, reschedule, and onboard incoming free demo class requests into permanent student accounts."
        />
        <button
          type="button"
          onClick={() => setShowNewBookingModal(true)}
          className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <span>➕</span>
          <span>Add Demo Booking Request</span>
        </button>
      </div>

      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by parent/student name or email..."
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'ALL', label: 'All Demo Bookings' },
              { value: 'PENDING', label: 'Pending Review' },
              { value: 'ASSIGNED', label: 'Assigned / Scheduled' },
              { value: 'COMPLETED', label: 'Completed / Onboarded' },
              { value: 'CANCELLED', label: 'Cancelled / Rejected' },
            ],
          },
        ]}
      />

      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-card">
        <DashboardTable
          columns={columns}
          rows={rows}
          emptyTitle="No Demo Bookings Available"
          emptyDescription="Demo bookings requested via the website or added by admins will populate here automatically and persist permanently."
        />
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      {/* ── MODAL: REVIEW BOOKING DETAILS ───────────────────────────────────── */}
      <Modal
        isOpen={!!reviewBooking}
        onClose={() => setReviewBooking(null)}
        title="Demo Booking Request Details"
      >
        {reviewBooking && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-surface-light rounded-xl border border-border space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-text-secondary uppercase text-[10px]">Booking Reference</span>
                <StatusBadge status={reviewBooking.status} />
              </div>
              <p className="font-mono text-xs font-bold text-text-primary">ID: {reviewBooking.id}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <p className="text-[10px] font-extrabold text-slate-500 uppercase">Parent Name</p>
                <p className="font-bold text-text-primary">{reviewBooking.parent_name}</p>
                <p className="text-text-secondary text-[11px]">{reviewBooking.parent_email}</p>
                <p className="text-text-secondary text-[11px]">{reviewBooking.parent_phone}</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <p className="text-[10px] font-extrabold text-slate-500 uppercase">Student Name</p>
                <p className="font-bold text-text-primary">{reviewBooking.student_name}</p>
                <p className="text-text-secondary text-[11px]">Age: {reviewBooking.student_age} years</p>
                <p className="text-text-secondary text-[11px]">Preferred: {reviewBooking.preferred_time}</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setReviewBooking(null)}
                className="px-4 py-2 bg-primary text-white font-bold rounded-xl text-xs"
              >
                Close Details
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── MODAL: RESCHEDULE DEMO TIME ─────────────────────────────────────── */}
      <Modal
        isOpen={!!rescheduleBooking}
        onClose={() => setRescheduleBooking(null)}
        title="Reschedule Demo Class Time"
      >
        <form onSubmit={handleRescheduleSubmit} className="space-y-4">
          <p className="text-xs text-text-secondary leading-relaxed">
            Update the preferred session time for <strong>{rescheduleBooking?.student_name}</strong> (Parent: {rescheduleBooking?.parent_name}). Changes will save permanently to the database.
          </p>

          <Input
            id="reschedule-time-input"
            label="New Preferred Date & Time"
            placeholder="e.g. Wednesday, Aug 20 at 6:00 PM EST"
            value={newTimeInput}
            onChange={(e) => setNewTimeInput(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setRescheduleBooking(null)}
              className="px-4 py-2 border border-border hover:bg-surface-light rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !newTimeInput.trim()}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Save Rescheduled Time'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: MANUALLY ADD DEMO REQUEST ───────────────────────────────── */}
      <Modal
        isOpen={showNewBookingModal}
        onClose={() => setShowNewBookingModal(false)}
        title="Add Incoming Demo Class Request"
      >
        <form onSubmit={handleCreateBookingSubmit} className="space-y-3">
          {createBookingError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600">
              {createBookingError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="new-parent-name"
              label="Parent Full Name *"
              placeholder="e.g. Sarah Jenkins"
              value={newBookingData.parent_name}
              onChange={(e) => setNewBookingData((p) => ({ ...p, parent_name: e.target.value }))}
              required
            />
            <Input
              id="new-parent-email"
              label="Parent Email Address *"
              type="email"
              placeholder="sarah@example.com"
              value={newBookingData.parent_email}
              onChange={(e) => setNewBookingData((p) => ({ ...p, parent_email: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="new-parent-phone"
              label="Parent Phone / WhatsApp"
              placeholder="+1 (555) 019-2834"
              value={newBookingData.parent_phone}
              onChange={(e) => setNewBookingData((p) => ({ ...p, parent_phone: e.target.value }))}
            />
            <Input
              id="new-student-name"
              label="Child Full Name *"
              placeholder="e.g. Leo Jenkins"
              value={newBookingData.student_name}
              onChange={(e) => setNewBookingData((p) => ({ ...p, student_name: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="new-student-age" className="block text-xs font-bold text-text-secondary mb-1">
                Child Age (Years)
              </label>
              <input
                id="new-student-age"
                type="number"
                min="4"
                max="18"
                value={newBookingData.student_age}
                onChange={(e) => setNewBookingData((p) => ({ ...p, student_age: parseInt(e.target.value, 10) || 8 }))}
                className="w-full px-3 py-2 border border-border rounded-xl text-xs font-semibold text-text-primary"
              />
            </div>
            <Input
              id="new-preferred-time"
              label="Preferred Time Slot"
              placeholder="Mon 5:00 PM EST"
              value={newBookingData.preferred_time}
              onChange={(e) => setNewBookingData((p) => ({ ...p, preferred_time: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowNewBookingModal(false)}
              className="px-4 py-2 border border-border hover:bg-surface-light rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Create & Save Demo Request'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: ASSIGN INSTRUCTOR ────────────────────────────────────────── */}
      <Modal
        isOpen={!!assignBooking}
        onClose={() => setAssignBooking(null)}
        title="Assign Coach for Demo Class"
      >
        <p className="text-xs text-text-secondary mb-4 leading-relaxed">
          Choose an instructor to conduct the free demo class for <strong>{assignBooking?.student_name}</strong>.
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

      {/* ── MODAL: ONBOARD AS STUDENT ACCOUNT ──────────────────────────────── */}
      <Modal
        isOpen={!!convertBooking}
        onClose={() => setConvertBooking(null)}
        title="Onboard & Convert to Student Account"
      >
        <p className="text-xs text-text-secondary mb-4 leading-relaxed">
          This will create a permanent Student profile for <strong>{convertBooking?.student_name}</strong> using parent email <strong>{convertBooking?.parent_email}</strong>.
        </p>

        {convertSuccess ? (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-xs font-semibold text-green-700">
              ✅ The booking has been permanently converted into an active Student Account in the database.
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
