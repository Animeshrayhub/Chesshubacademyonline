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
  convertInquiryToDemoBookingAction,
} from '@/actions/bookings';

import type { DbBooking, AdminCoachRow } from '@/types/dashboard';

interface BookingsRegistryProps {
  bookings: DbBooking[];
  coaches: AdminCoachRow[];
}

const QUICK_REPLY_TEMPLATES = {
  programs: {
    label: 'Programs & Pricing',
    subject: 'ChessHub Academy — Programs & Pricing Overview',
    body: (parentName: string) => `Hi ${parentName},

Thank you for reaching out to ChessHub Academy!

We offer structured, 1-on-1 Grandmaster-led coaching across Beginner, Intermediate, and Tournament Prep levels.

Our coaching packages include:
• Starter (12 live 1-on-1 sessions) — ₹7,200 ($99 USD)
• Standard (24 live 1-on-1 sessions) — ₹13,800 ($189 USD) [Most Popular]
• Premium (48 live 1-on-1 sessions) — ₹26,400 ($349 USD) [Best Value]

All programs include personalized roadmaps, homework puzzle sets, session recordings, and live game reviews.

You can also book a Free 1-on-1 Demo Session anytime: https://chesshubacademy.online/book-demo

Looking forward to helping your child excel at chess!

Warm regards,
ChessHub Academy Admissions Team
WhatsApp: +91 70086 65245
https://chesshubacademy.online`,
  },
  demo: {
    label: 'Free Demo Invitation',
    subject: 'Your Free 1-on-1 Chess Demo Class with ChessHub Academy',
    body: (parentName: string) => `Hi ${parentName},

Thank you for your inquiry with ChessHub Academy!

We would love to invite your child to an interactive, 45-minute Free 1-on-1 Demo Class with one of our FIDE-rated coaches. During the session, we will assess your child's playing level and share a personalized chess learning plan.

Please let us know what day and time (in your local timezone) works best, or book directly at:
https://chesshubacademy.online/book-demo

Feel free to reply to this email or message us on WhatsApp at +91 70086 65245.

Best regards,
ChessHub Academy Admissions Team`,
  },
  schedule: {
    label: 'Schedule & Curriculum',
    subject: 'ChessHub Academy — Class Schedule & Syllabus Details',
    body: (parentName: string) => `Hi ${parentName},

Thanks for contacting ChessHub Academy!

Our classes are conducted 1-on-1 online via interactive chessboard and Zoom. We schedule sessions flexibly based on your availability across worldwide timezones (US, Europe, India, UAE, Australia).

Our curriculum covers:
1. Tactical pattern recognition and calculation
2. Opening repertoire tailored to your child's style
3. Middle-game strategy and master game analysis
4. Endgame fundamentals and tournament psychology

Let us know your child's age and previous chess experience so we can recommend the ideal coach!

Best regards,
ChessHub Academy Coaching Team
+91 70086 65245`,
  },
  custom: {
    label: 'Custom Reply',
    subject: 'Regarding your inquiry with ChessHub Academy',
    body: (parentName: string) => `Hi ${parentName},

Thank you for contacting ChessHub Academy.



Best regards,
ChessHub Academy Team
+91 70086 65245
https://chesshubacademy.online`,
  },
};

export default function BookingsRegistry({ bookings, coaches }: BookingsRegistryProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'BOOKINGS' | 'INQUIRIES'>('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Dialog states
  const [assignBooking, setAssignBooking] = useState<DbBooking | null>(null);
  const [selectedCoachId, setSelectedCoachId] = useState('');

  const [rescheduleBooking, setRescheduleBooking] = useState<DbBooking | null>(null);
  const [newTimeInput, setNewTimeInput] = useState('');

  const [reviewBooking, setReviewBooking] = useState<DbBooking | null>(null);

  // Quick Reply state
  const [quickReplyBooking, setQuickReplyBooking] = useState<DbBooking | null>(null);
  const [replyTemplateKey, setReplyTemplateKey] = useState<keyof typeof QUICK_REPLY_TEMPLATES>('programs');
  const [replySubject, setReplySubject] = useState('');
  const [replyBody, setReplyBody] = useState('');

  // Convert Inquiry to Demo state
  const [convertInquiryBooking, setConvertInquiryBooking] = useState<DbBooking | null>(null);
  const [inquiryChildName, setInquiryChildName] = useState('');
  const [inquiryChildAge, setInquiryChildAge] = useState(8);
  const [inquiryPreferredTime, setInquiryPreferredTime] = useState('');
  const [isConvertingInquiry, setIsConvertingInquiry] = useState(false);
  const [convertInquiryError, setConvertInquiryError] = useState('');

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

  // Open Quick Reply
  const handleOpenQuickReply = (b: DbBooking) => {
    setQuickReplyBooking(b);
    setReplyTemplateKey('programs');
    const tpl = QUICK_REPLY_TEMPLATES.programs;
    setReplySubject(tpl.subject);
    setReplyBody(tpl.body(b.parent_name));
  };

  const handleTemplateSelect = (key: keyof typeof QUICK_REPLY_TEMPLATES) => {
    setReplyTemplateKey(key);
    if (!quickReplyBooking) return;
    const tpl = QUICK_REPLY_TEMPLATES[key];
    setReplySubject(tpl.subject);
    setReplyBody(tpl.body(quickReplyBooking.parent_name));
  };

  // Open Convert Inquiry
  const handleOpenConvertInquiry = (b: DbBooking) => {
    setConvertInquiryBooking(b);
    setInquiryChildName(b.parent_name ? `${b.parent_name.split(' ')[0]}'s Child` : '');
    setInquiryChildAge(8);
    setInquiryPreferredTime('Tomorrow 6:00 PM IST');
    setConvertInquiryError('');
  };

  const handleConvertInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertInquiryBooking) return;
    if (!inquiryChildName.trim() || !inquiryPreferredTime.trim()) {
      setConvertInquiryError('Student Name and Preferred Time are required.');
      return;
    }
    setIsConvertingInquiry(true);
    setConvertInquiryError('');
    try {
      const res = await convertInquiryToDemoBookingAction(convertInquiryBooking.id, {
        student_name: inquiryChildName.trim(),
        student_age: Number(inquiryChildAge) || 8,
        preferred_time: inquiryPreferredTime.trim(),
      });
      if (res.success) {
        setConvertInquiryBooking(null);
      } else {
        setConvertInquiryError(res.error?.message || 'Failed to convert inquiry.');
      }
    } catch (err: any) {
      setConvertInquiryError(err?.message || 'Failed to convert inquiry.');
    } finally {
      setIsConvertingInquiry(false);
    }
  };

  // Filters
  const filtered = bookings.filter((b) => {
    const query = search.toLowerCase();
    const nameMatch =
      b.parent_name.toLowerCase().includes(query) ||
      b.parent_email.toLowerCase().includes(query) ||
      b.student_name.toLowerCase().includes(query);

    const isInquiry = b.student_name?.startsWith('[Inquiry:') || b.student_name?.includes('Inquiry:');

    const typeMatch =
      typeFilter === 'ALL' ||
      (typeFilter === 'INQUIRIES' ? isInquiry : !isInquiry);

    const statusMatch =
      statusFilter === 'ALL' || b.status.toLowerCase() === statusFilter.toLowerCase();

    return nameMatch && typeMatch && statusMatch;
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
    const isInquiry = b.student_name?.startsWith('[Inquiry:') || b.student_name?.includes('Inquiry:');
    const inquirySubjectMatch = b.student_name?.match(/\[Inquiry:\s*([^\]]+)\]/);
    const subject = inquirySubjectMatch ? inquirySubjectMatch[1] : 'Inquiry';

    const actions: TableActionItem[] = [];

    if (isInquiry) {
      actions.push({
        label: '⚡ Quick Reply',
        iconKey: 'checkSquare',
        onClick: () => handleOpenQuickReply(b),
      });
      actions.push({
        label: '🎯 Convert to Demo',
        iconKey: 'graduationCap',
        onClick: () => handleOpenConvertInquiry(b),
      });
      actions.push({
        label: 'Review Inquiry',
        iconKey: 'eye',
        onClick: () => setReviewBooking(b),
      });
      if (b.status === 'pending') {
        actions.push({
          label: 'Mark as Contacted',
          iconKey: 'check',
          variant: 'success',
          onClick: () => handleUpdateStatus(b.id, 'assigned'),
        });
      }
      if (b.status === 'assigned') {
        actions.push({
          label: 'Mark as Resolved',
          iconKey: 'check',
          variant: 'success',
          onClick: () => handleUpdateStatus(b.id, 'completed'),
        });
      }
      actions.push({
        label: 'Dismiss Inquiry',
        iconKey: 'x',
        variant: 'danger',
        onClick: () => handleUpdateStatus(b.id, 'cancelled'),
      });
    } else {
      actions.push(
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
        }
      );

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
    }

    const coachObj = coaches.find((c) => c.id === b.assigned_coach_id);

    return {
      parent: (
        <div className="flex flex-col">
          <span className="font-bold text-text-primary text-xs">{b.parent_name}</span>
          <span className="text-[10px] text-text-secondary">{b.parent_email}</span>
          {b.parent_phone && b.parent_phone !== 'N/A' && (
            <span className="text-[10px] text-text-secondary">{b.parent_phone}</span>
          )}
        </div>
      ),
      student: (
        <div className="flex flex-col">
          {isInquiry ? (
            <div className="flex flex-col gap-1 items-start">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wide">
                Query: {subject}
              </span>
              <span className="text-[10px] text-text-secondary">Web Contact Form</span>
            </div>
          ) : (
            <>
              <span className="font-semibold text-text-primary text-xs">{b.student_name}</span>
              <span className="text-[10px] text-text-secondary">{b.student_age} years old</span>
            </>
          )}
        </div>
      ),
      preferred: (
        <span className="text-xs text-text-primary font-medium line-clamp-2 max-w-[200px]" title={b.preferred_time}>
          {b.preferred_time}
        </span>
      ),
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
        searchPlaceholder="Search by parent/student name, email, or query subject..."
        filters={[
          {
            key: 'type',
            label: 'Category',
            value: typeFilter,
            onChange: (val) => setTypeFilter(val as any),
            options: [
              { value: 'ALL', label: 'All Requests & Inquiries' },
              { value: 'BOOKINGS', label: 'Demo Bookings Only' },
              { value: 'INQUIRIES', label: 'Contact Inquiries Only' },
            ],
          },
          {
            key: 'status',
            label: 'Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'ALL', label: 'All Statuses' },
              { value: 'PENDING', label: 'New / Pending Review' },
              { value: 'ASSIGNED', label: 'Contacted / Scheduled' },
              { value: 'COMPLETED', label: 'Resolved / Converted' },
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
        title={
          reviewBooking?.student_name?.startsWith('[Inquiry:')
            ? "Contact Query & Inquiry Details"
            : "Demo Booking Request Details"
        }
      >
        {reviewBooking && (() => {
          const isInquiry = reviewBooking.student_name?.startsWith('[Inquiry:') || reviewBooking.student_name?.includes('Inquiry:');
          const inquirySubjectMatch = reviewBooking.student_name?.match(/\[Inquiry:\s*([^\]]+)\]/);
          const subject = inquirySubjectMatch ? inquirySubjectMatch[1] : 'Inquiry';

          return (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-surface-light rounded-xl border border-border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-text-secondary uppercase text-[10px]">Reference</span>
                  <StatusBadge status={reviewBooking.status} />
                </div>
                <p className="font-mono text-xs font-bold text-text-primary">ID: {reviewBooking.id}</p>
              </div>

              {isInquiry ? (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white uppercase tracking-wide">
                        Inquiry Subject
                      </span>
                      <span className="font-bold text-blue-900">{subject}</span>
                    </div>
                    <div className="pt-2 text-text-primary">
                      <p className="text-[10px] font-extrabold text-blue-800 uppercase">Sender Information</p>
                      <p className="font-bold text-text-primary text-sm">{reviewBooking.parent_name}</p>
                      <p className="text-text-secondary">Email: <a href={`mailto:${reviewBooking.parent_email}`} className="text-primary hover:underline">{reviewBooking.parent_email}</a></p>
                      {reviewBooking.parent_phone && reviewBooking.parent_phone !== 'N/A' && (
                        <p className="text-text-secondary">Phone: <a href={`tel:${reviewBooking.parent_phone}`} className="text-primary hover:underline">{reviewBooking.parent_phone}</a></p>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <p className="text-[10px] font-extrabold text-slate-500 uppercase">Message Content</p>
                    <p className="text-text-primary whitespace-pre-wrap leading-relaxed text-xs">
                      {reviewBooking.preferred_time?.replace(/^Subject:\s*[^|]+\|\s*Message:\s*/i, '') || reviewBooking.preferred_time}
                    </p>
                  </div>
                </div>
              ) : (
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
              )}

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
          );
        })()}
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

      {/* ── MODAL: QUICK REPLY & OUTREACH ─────────────────────────────────── */}
      <Modal
        isOpen={!!quickReplyBooking}
        onClose={() => setQuickReplyBooking(null)}
        title="⚡ Quick Reply & Instant Outreach"
      >
        {quickReplyBooking && (
          <div className="space-y-4 text-xs">
            {/* Recipient Bar */}
            <div className="p-3 bg-surface-light rounded-xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="font-bold text-text-primary text-sm">{quickReplyBooking.parent_name}</p>
                <p className="text-text-secondary">{quickReplyBooking.parent_email}</p>
              </div>
              {quickReplyBooking.parent_phone && quickReplyBooking.parent_phone !== 'N/A' && (
                <div className="text-right">
                  <span className="text-[10px] text-text-secondary uppercase font-semibold">WhatsApp / Phone</span>
                  <p className="font-bold text-emerald-700">{quickReplyBooking.parent_phone}</p>
                </div>
              )}
            </div>

            {/* Template Selector Chips */}
            <div>
              <label className="block text-[11px] font-bold text-text-secondary mb-1.5 uppercase">
                Select Pre-composed Response Template
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.keys(QUICK_REPLY_TEMPLATES) as Array<keyof typeof QUICK_REPLY_TEMPLATES>).map((key) => {
                  const tpl = QUICK_REPLY_TEMPLATES[key];
                  const isSelected = replyTemplateKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleTemplateSelect(key)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all text-center ${
                        isSelected
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-white text-text-secondary border-border hover:border-slate-300 hover:text-text-primary'
                      }`}
                    >
                      {tpl.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subject Input */}
            <Input
              id="reply-subject"
              label="Email Subject"
              value={replySubject}
              onChange={(e) => setReplySubject(e.target.value)}
              required
            />

            {/* Message Body Textarea */}
            <div>
              <label htmlFor="reply-body" className="block text-xs font-bold text-text-primary mb-1">
                Message Body (Customizable)
              </label>
              <textarea
                id="reply-body"
                rows={8}
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                className="w-full p-3 rounded-xl border border-border text-xs text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent font-sans leading-relaxed"
              />
            </div>

            {/* Dispatch Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  handleUpdateStatus(quickReplyBooking.id, 'assigned');
                  setQuickReplyBooking(null);
                }}
                className="px-3 py-2 text-text-secondary hover:text-text-primary text-xs font-semibold"
              >
                ✓ Mark as Contacted (No email)
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {quickReplyBooking.parent_phone && quickReplyBooking.parent_phone !== 'N/A' && (
                  <a
                    href={`https://wa.me/${quickReplyBooking.parent_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(replyBody)}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      handleUpdateStatus(quickReplyBooking.id, 'assigned');
                      setQuickReplyBooking(null);
                    }}
                    className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <span>💬 WhatsApp</span>
                  </a>
                )}

                <a
                  href={`mailto:${quickReplyBooking.parent_email}?subject=${encodeURIComponent(replySubject)}&body=${encodeURIComponent(replyBody)}`}
                  onClick={() => {
                    handleUpdateStatus(quickReplyBooking.id, 'assigned');
                    setQuickReplyBooking(null);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <span>✉️ Open in Email & Mark Contacted</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── MODAL: CONVERT INQUIRY TO DEMO BOOKING ──────────────────────────── */}
      <Modal
        isOpen={!!convertInquiryBooking}
        onClose={() => setConvertInquiryBooking(null)}
        title="🎯 Convert Inquiry to Free Demo Booking"
      >
        {convertInquiryBooking && (
          <form onSubmit={handleConvertInquirySubmit} className="space-y-4 text-xs">
            <p className="text-text-secondary leading-relaxed">
              Convert this general inquiry into an active, scheduled demo booking request for <strong>{convertInquiryBooking.parent_name}</strong>.
            </p>

            {convertInquiryError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl font-semibold text-red-600">
                {convertInquiryError}
              </div>
            )}

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase">Parent Contact Info</span>
              <p className="font-bold text-text-primary">{convertInquiryBooking.parent_name}</p>
              <p className="text-text-secondary">{convertInquiryBooking.parent_email} • {convertInquiryBooking.parent_phone}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                id="inquiry-child-name"
                label="Student / Child Full Name *"
                placeholder="e.g. Leo Sharma"
                value={inquiryChildName}
                onChange={(e) => setInquiryChildName(e.target.value)}
                required
              />
              <Input
                id="inquiry-child-age"
                label="Student Age (years) *"
                type="number"
                min={4}
                max={18}
                value={inquiryChildAge}
                onChange={(e) => setInquiryChildAge(Number(e.target.value))}
                required
              />
            </div>

            <Input
              id="inquiry-preferred-time"
              label="Preferred Session Date & Time *"
              placeholder="e.g. Friday at 6:00 PM IST"
              value={inquiryPreferredTime}
              onChange={(e) => setInquiryPreferredTime(e.target.value)}
              required
            />

            <div className="flex justify-end gap-2.5 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setConvertInquiryBooking(null)}
                className="px-4 py-2 border border-border hover:bg-surface-light rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isConvertingInquiry || !inquiryChildName.trim() || !inquiryPreferredTime.trim()}
                className="px-5 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-all disabled:opacity-50 shadow-md"
              >
                {isConvertingInquiry ? 'Converting...' : 'Convert to Demo Booking'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
