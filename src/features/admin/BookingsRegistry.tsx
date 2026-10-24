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
  confirmBookingAction,
  updateBookingMeetingUrlAction,
  cancelBookingAction,
  convertBookingToStudentAction,
  rescheduleBookingAction,
  createBookingAction,
  convertInquiryToDemoBookingAction,
} from '@/actions/bookings';

import { generateWhatsAppClickToChatUrl } from '@/lib/notifications/whatsapp';
import { getBookingReference, isValidGoogleMeetUrl } from '@/lib/bookings/shared';
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

Our classes are conducted 1-on-1 online via interactive chessboard and Zoom/Meet. We schedule sessions flexibly based on your availability across worldwide timezones (US, Europe, India, UAE, Australia).

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

const TIMEZONE_LIST = [
  'Asia/Kolkata (IST, GMT+5:30)',
  'America/New_York (EST/EDT, GMT-5)',
  'America/Chicago (CST/CDT, GMT-6)',
  'America/Los_Angeles (PST/PDT, GMT-8)',
  'Europe/London (GMT/BST)',
  'Europe/Berlin (CET/CEST)',
  'Asia/Dubai (GST, GMT+4)',
  'Asia/Singapore (SGT, GMT+8)',
  'Australia/Sydney (AEST)',
];

export default function BookingsRegistry({ bookings, coaches }: BookingsRegistryProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'BOOKINGS' | 'INQUIRIES'>('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Dialog states
  const [assignBooking, setAssignBooking] = useState<DbBooking | null>(null);
  const [selectedCoachId, setSelectedCoachId] = useState('');

  // Confirm & Schedule modal state
  const [confirmModalBooking, setConfirmModalBooking] = useState<DbBooking | null>(null);
  const [confirmCoachId, setConfirmCoachId] = useState('');
  const [confirmTime, setConfirmTime] = useState('');
  const [confirmTimezone, setConfirmTimezone] = useState('Asia/Kolkata');
  const [confirmMeetUrl, setConfirmMeetUrl] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [confirmSuccess, setConfirmSuccess] = useState(false);

  // Edit Google Meet modal state
  const [editMeetBooking, setEditMeetBooking] = useState<DbBooking | null>(null);
  const [meetUrlInput, setMeetUrlInput] = useState('');
  const [meetUrlError, setMeetUrlError] = useState('');
  const [meetUrlSuccess, setMeetUrlSuccess] = useState(false);

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
    setIsConvertingInquiry(true);
    setConvertInquiryError('');

    try {
      const res = await convertInquiryToDemoBookingAction(convertInquiryBooking.id, {
        student_name: inquiryChildName.trim(),
        student_age: Number(inquiryChildAge),
        preferred_time: inquiryPreferredTime.trim(),
      });

      if (!res.success) {
        setConvertInquiryError(res.error?.message || 'Failed to convert inquiry.');
        setIsConvertingInquiry(false);
        return;
      }

      setIsConvertingInquiry(false);
      setConvertInquiryBooking(null);
    } catch {
      setConvertInquiryError('Unexpected network error. Try again.');
      setIsConvertingInquiry(false);
    }
  };

  // Open Confirm Modal
  const handleOpenConfirmModal = (b: DbBooking) => {
    setConfirmModalBooking(b);
    setConfirmCoachId(b.assigned_coach_id || coaches[0]?.id || '');
    setConfirmTime(b.preferred_time || '');
    setConfirmTimezone('Asia/Kolkata');
    setConfirmMeetUrl(b.zoom_meeting_url || '');
    setConfirmError('');
    setConfirmSuccess(false);
  };

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmModalBooking) return;
    if (!confirmCoachId) {
      setConfirmError('Please select a coach for this session.');
      return;
    }
    if (!confirmTime.trim()) {
      setConfirmError('Please specify the confirmed session date and time.');
      return;
    }
    if (confirmMeetUrl.trim() && !isValidGoogleMeetUrl(confirmMeetUrl.trim())) {
      setConfirmError('Invalid Google Meet link. Must start with https://meet.google.com/');
      return;
    }

    setConfirmError('');
    startTransition(async () => {
      const res = await confirmBookingAction({
        bookingId: confirmModalBooking.id,
        coachUserId: confirmCoachId,
        confirmedTime: confirmTime.trim(),
        timeZone: confirmTimezone,
        googleMeetUrl: confirmMeetUrl.trim() || undefined,
      });

      if (res.success) {
        setConfirmSuccess(true);
        setTimeout(() => {
          setConfirmModalBooking(null);
          setConfirmSuccess(false);
        }, 1200);
      } else {
        setConfirmError(res.error?.message || 'Failed to confirm booking.');
      }
    });
  };

  // Open Edit Meet Modal
  const handleOpenEditMeet = (b: DbBooking) => {
    setEditMeetBooking(b);
    setMeetUrlInput(b.zoom_meeting_url || '');
    setMeetUrlError('');
    setMeetUrlSuccess(false);
  };

  const handleEditMeetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMeetBooking) return;
    if (meetUrlInput.trim() && !isValidGoogleMeetUrl(meetUrlInput.trim())) {
      setMeetUrlError('Invalid Google Meet link. Must start with https://meet.google.com/');
      return;
    }
    setMeetUrlError('');
    startTransition(async () => {
      const res = await updateBookingMeetingUrlAction(editMeetBooking.id, meetUrlInput.trim());
      if (res.success) {
        setMeetUrlSuccess(true);
        setTimeout(() => {
          setEditMeetBooking(null);
          setMeetUrlSuccess(false);
        }, 1000);
      } else {
        setMeetUrlError(res.error?.message || 'Failed to update Google Meet link.');
      }
    });
  };

  const handleUpdateStatus = (id: string, status: any) => {
    startTransition(async () => {
      await updateBookingStatusAction(id, status);
    });
  };

  const handleCancelBooking = (id: string) => {
    if (confirm('Are you sure you want to cancel this booking request? The parent will be notified.')) {
      startTransition(async () => {
        await cancelBookingAction(id, 'Cancelled by administrator.');
      });
    }
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
    const age = Number(newBookingData.student_age);
    if (isNaN(age) || age < 3 || age > 100) {
      setCreateBookingError('Student age must be an integer between 3 and 100.');
      return;
    }

    const res = await createBookingAction({
      ...newBookingData,
      student_age: age,
    });

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
    { key: 'parent', label: 'Parent Details & Outreach' },
    { key: 'student', label: 'Student / Booking Ref' },
    { key: 'preferred', label: 'Time & Classroom Link' },
    { key: 'coach', label: 'Assigned Coach' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions', width: 'w-10' },
  ];

  // Filtering
  const filtered = bookings.filter((b) => {
    const isInquiry = b.student_name?.startsWith('[Inquiry:') || b.student_name?.includes('Inquiry:');
    if (typeFilter === 'BOOKINGS' && isInquiry) return false;
    if (typeFilter === 'INQUIRIES' && !isInquiry) return false;

    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchParent = b.parent_name?.toLowerCase().includes(q);
      const matchEmail = b.parent_email?.toLowerCase().includes(q);
      const matchStudent = b.student_name?.toLowerCase().includes(q);
      const matchPhone = b.parent_phone?.toLowerCase().includes(q);
      const matchRef = getBookingReference(b.id).toLowerCase().includes(q);
      if (!matchParent && !matchEmail && !matchStudent && !matchPhone && !matchRef) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Map rows
  const rows = paginated.map((b) => {
    const isInquiry = b.student_name?.startsWith('[Inquiry:') || b.student_name?.includes('Inquiry:');
    const inquirySubjectMatch = b.student_name?.match(/\[Inquiry:\s*([^\]]+)\]/);
    const subject = inquirySubjectMatch ? inquirySubjectMatch[1] : 'Inquiry';
    const bookingRef = getBookingReference(b.id);

    const waUrl = b.parent_phone
      ? generateWhatsAppClickToChatUrl({
          recipientPhone: b.parent_phone,
          parentName: b.parent_name,
          studentName: b.student_name,
          bookingRef,
          status: b.status as any,
          sessionTime: b.preferred_time,
          meetLink: b.zoom_meeting_url || undefined,
        })
      : '';

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
      actions.push({
        label: 'Dismiss Inquiry',
        iconKey: 'x',
        variant: 'danger',
        onClick: () => handleCancelBooking(b.id),
      });
    } else {
      actions.push({
        label: 'Review Full Details',
        iconKey: 'eye',
        onClick: () => setReviewBooking(b),
      });

      if (b.status === 'pending' || b.status === 'assigned') {
        actions.push({
          label: '✅ Approve & Confirm Demo',
          iconKey: 'checkSquare',
          variant: 'success',
          onClick: () => handleOpenConfirmModal(b),
        });

        actions.push({
          label: '🔗 Google Meet Link',
          iconKey: 'video',
          onClick: () => handleOpenEditMeet(b),
        });

        actions.push({
          label: 'Reschedule Time',
          iconKey: 'clock',
          onClick: () => {
            setRescheduleBooking(b);
            setNewTimeInput(b.preferred_time || '');
          },
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
          label: 'Cancel Booking',
          iconKey: 'x',
          variant: 'danger',
          onClick: () => handleCancelBooking(b.id),
        });
      }
    }

    const coachObj = coaches.find((c) => c.id === b.assigned_coach_id);

    return {
      parent: (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-text-primary text-xs">{b.parent_name}</span>
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open WhatsApp Chat with Parent"
                className="inline-flex items-center text-[10px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold transition-colors"
              >
                💬 WhatsApp
              </a>
            )}
          </div>
          <span className="text-[10px] text-text-secondary">{b.parent_email}</span>
          {b.parent_phone && b.parent_phone !== 'N/A' && (
            <span className="text-[10px] text-text-secondary">{b.parent_phone}</span>
          )}
        </div>
      ),
      student: (
        <div className="flex flex-col gap-0.5">
          {isInquiry ? (
            <div className="flex flex-col gap-1 items-start">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wide">
                Query: {subject}
              </span>
              <span className="text-[10px] text-text-secondary">Web Contact Form</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-text-primary text-xs">{b.student_name}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-bold">
                  {bookingRef}
                </span>
              </div>
              <span className="text-[10px] text-text-secondary font-medium">
                {b.student_age} years old
              </span>
            </>
          )}
        </div>
      ),
      preferred: (
        <div className="flex flex-col gap-1 max-w-[220px]">
          <span className="text-xs text-text-primary font-medium line-clamp-2" title={b.preferred_time}>
            {b.preferred_time}
          </span>
          {b.zoom_meeting_url ? (
            <a
              href={b.zoom_meeting_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 w-fit"
            >
              <span>🎥 Meet Link</span>
              <span>↗</span>
            </a>
          ) : b.status === 'assigned' ? (
            <span className="text-[10px] text-amber-600 font-medium">⚠️ No Meet link set</span>
          ) : null}
        </div>
      ),
      coach: coachObj ? (
        <span className="text-xs font-semibold text-text-primary">
          Coach {coachObj.first_name} {coachObj.last_name}
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
          title="Demo Bookings & Outreach Management"
          subtitle="Review incoming demo requests, assign coaches, confirm Google Meet links, and onboard students."
        />
        <button
          type="button"
          onClick={() => setShowNewBookingModal(true)}
          className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <span>➕</span>
          <span>Add Demo Booking</span>
        </button>
      </div>

      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by parent, student, email, phone, or reference..."
        filters={[
          {
            key: 'type',
            label: 'Type',
            value: typeFilter,
            onChange: (val) => {
              setTypeFilter(val as any);
              setPage(1);
            },
            options: [
              { value: 'ALL', label: 'All Items' },
              { value: 'BOOKINGS', label: 'Demo Bookings Only' },
              { value: 'INQUIRIES', label: 'Contact Queries Only' },
            ],
          },
          {
            key: 'status',
            label: 'Status',
            value: statusFilter,
            onChange: (val) => {
              setStatusFilter(val);
              setPage(1);
            },
            options: [
              { value: 'ALL', label: 'All Statuses' },
              { value: 'pending', label: 'Pending Approval' },
              { value: 'assigned', label: 'Confirmed / Assigned' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ],
          },
        ]}
      />

      <DashboardTable
        columns={columns}
        rows={rows}
        emptyTitle="No bookings found"
        emptyDescription="No bookings or inquiries match your filter criteria."
      />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* ── MODAL: APPROVE & CONFIRM DEMO (With Meet Link & Double-Booking Guard) ── */}
      <Modal
        isOpen={!!confirmModalBooking}
        onClose={() => setConfirmModalBooking(null)}
        title="Approve & Confirm Demo Chess Class"
      >
        {confirmModalBooking && (
          <form onSubmit={handleConfirmSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900">Student: {confirmModalBooking.student_name} ({confirmModalBooking.student_age} yrs)</span>
                <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-amber-300 font-bold">
                  {getBookingReference(confirmModalBooking.id)}
                </span>
              </div>
              <p className="text-amber-800">
                Parent: {confirmModalBooking.parent_name} • {confirmModalBooking.parent_email}
              </p>
            </div>

            {confirmError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-semibold leading-relaxed">
                ❌ {confirmError}
              </div>
            )}

            {confirmSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 font-bold">
                ✅ Demo class confirmed successfully! Confirmation email dispatched to parent.
              </div>
            )}

            <div>
              <label htmlFor="confirm-coach-select" className="block font-bold text-text-primary mb-1">
                Assign FIDE Instructor *
              </label>
              <select
                id="confirm-coach-select"
                value={confirmCoachId}
                onChange={(e) => setConfirmCoachId(e.target.value)}
                className="w-full text-xs font-semibold text-text-primary bg-white border border-border rounded-xl px-3 py-2.5 focus:outline-none"
                required
              >
                <option value="">Select Instructor...</option>
                {coaches.map((c) => (
                  <option key={c.id} value={c.id}>
                    Coach {c.first_name} {c.last_name} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Input
                  id="confirm-session-time"
                  label="Confirmed Session Date & Time *"
                  placeholder="e.g. Oct 28, 2026 6:30 PM"
                  value={confirmTime}
                  onChange={(e) => setConfirmTime(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="confirm-timezone" className="block text-xs font-medium text-text-primary mb-1.5">
                  Session Time Zone
                </label>
                <select
                  id="confirm-timezone"
                  value={confirmTimezone}
                  onChange={(e) => setConfirmTimezone(e.target.value)}
                  className="w-full text-xs font-semibold bg-white border border-border rounded-xl px-3 py-2.5"
                >
                  {TIMEZONE_LIST.map((tz) => (
                    <option key={tz} value={tz.split(' ')[0]}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Input
                id="confirm-meet-link"
                label="Google Meet Classroom Link (Manual Link)"
                placeholder="https://meet.google.com/xxx-yyyy-zzz"
                value={confirmMeetUrl}
                onChange={(e) => setConfirmMeetUrl(e.target.value)}
              />
              <p className="text-[11px] text-text-secondary mt-1">
                Enter the Google Meet link generated for this session. It will be sent in the parent confirmation email and reminders.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setConfirmModalBooking(null)}
                className="px-4 py-2 border border-border hover:bg-surface-light rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || confirmSuccess}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-md disabled:opacity-50"
              >
                {isPending ? 'Confirming & Notifying...' : 'Confirm Demo & Send Email'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── MODAL: EDIT GOOGLE MEET LINK ───────────────────────────────────── */}
      <Modal
        isOpen={!!editMeetBooking}
        onClose={() => setEditMeetBooking(null)}
        title="Update Google Meet Classroom Link"
      >
        {editMeetBooking && (
          <form onSubmit={handleEditMeetSubmit} className="space-y-4 text-xs">
            <p className="text-text-secondary">
              Update the Google Meet URL for <strong>{editMeetBooking.student_name}</strong> (Ref:{' '}
              {getBookingReference(editMeetBooking.id)}).
            </p>

            {meetUrlError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 font-semibold">
                {meetUrlError}
              </div>
            )}

            {meetUrlSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 font-bold">
                ✅ Google Meet link updated successfully!
              </div>
            )}

            <Input
              id="edit-meet-url"
              label="Google Meet URL *"
              placeholder="https://meet.google.com/xxx-yyyy-zzz"
              value={meetUrlInput}
              onChange={(e) => setMeetUrlInput(e.target.value)}
              required
            />

            <div className="flex justify-end gap-2.5 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setEditMeetBooking(null)}
                className="px-4 py-2 border border-border hover:bg-surface-light rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || meetUrlSuccess}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-colors"
              >
                {isPending ? 'Saving...' : 'Save Meet Link'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── MODAL: REVIEW FULL DETAILS ──────────────────────────────────────── */}
      <Modal
        isOpen={!!reviewBooking}
        onClose={() => setReviewBooking(null)}
        title="Demo Booking Detailed Inspection"
      >
        {reviewBooking && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 bg-surface-light rounded-xl border border-border">
              <div>
                <span className="text-[10px] text-text-secondary uppercase font-bold">Booking Reference</span>
                <p className="font-mono font-bold text-primary text-sm">{getBookingReference(reviewBooking.id)}</p>
              </div>
              <StatusBadge status={reviewBooking.status} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-surface-light rounded-xl border border-border">
                <span className="text-[10px] text-text-secondary uppercase font-bold">Parent Details</span>
                <p className="font-bold text-text-primary mt-1">{reviewBooking.parent_name}</p>
                <p className="text-text-secondary">{reviewBooking.parent_email}</p>
                <p className="text-text-secondary">{reviewBooking.parent_phone}</p>
              </div>
              <div className="p-3 bg-surface-light rounded-xl border border-border">
                <span className="text-[10px] text-text-secondary uppercase font-bold">Student Details</span>
                <p className="font-bold text-text-primary mt-1">{reviewBooking.student_name}</p>
                <p className="text-text-secondary">{reviewBooking.student_age} years old</p>
                <p className="text-text-secondary text-[11px] mt-1">Created: {new Date(reviewBooking.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="p-3 bg-surface-light rounded-xl border border-border space-y-1">
              <span className="text-[10px] text-text-secondary uppercase font-bold">Time & Classroom Link</span>
              <p className="font-semibold text-text-primary">{reviewBooking.preferred_time}</p>
              {reviewBooking.zoom_meeting_url ? (
                <div className="pt-1">
                  <a
                    href={reviewBooking.zoom_meeting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-200 font-bold"
                  >
                    <span>🎥 Open Google Meet Session</span>
                    <span>↗</span>
                  </a>
                </div>
              ) : (
                <p className="text-amber-700 italic text-[11px]">No Google Meet link assigned yet.</p>
              )}
            </div>

            {/* Quick Actions inside Review */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border">
              {reviewBooking.parent_phone && reviewBooking.parent_phone !== 'N/A' && (
                <a
                  href={generateWhatsAppClickToChatUrl({
                    recipientPhone: reviewBooking.parent_phone,
                    parentName: reviewBooking.parent_name,
                    studentName: reviewBooking.student_name,
                    bookingRef: getBookingReference(reviewBooking.id),
                    status: reviewBooking.status as any,
                    sessionTime: reviewBooking.preferred_time,
                    meetLink: reviewBooking.zoom_meeting_url || undefined,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <span>💬 Chat on WhatsApp</span>
                </a>
              )}

              <div className="flex items-center gap-2">
                {reviewBooking.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => {
                      const b = reviewBooking;
                      setReviewBooking(null);
                      handleOpenConfirmModal(b);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                  >
                    Confirm Demo
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setReviewBooking(null)}
                  className="px-4 py-1.5 border border-border hover:bg-surface-light rounded-xl font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── MODAL: MANUAL CREATE DEMO REQUEST ──────────────────────────────── */}
      <Modal
        isOpen={showNewBookingModal}
        onClose={() => setShowNewBookingModal(false)}
        title="Add Demo Booking Request"
      >
        <form onSubmit={handleCreateBookingSubmit} className="space-y-4 text-xs">
          {createBookingError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 font-semibold">
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
              label="Student Full Name *"
              placeholder="e.g. Leo Jenkins"
              value={newBookingData.student_name}
              onChange={(e) => setNewBookingData((p) => ({ ...p, student_name: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="new-student-age" className="block text-xs font-bold text-text-secondary mb-1">
                Student Age (3–100 years) *
              </label>
              <input
                id="new-student-age"
                type="number"
                min="3"
                max="100"
                value={newBookingData.student_age}
                onChange={(e) =>
                  setNewBookingData((p) => ({ ...p, student_age: parseInt(e.target.value, 10) || 8 }))
                }
                className="w-full px-3 py-2 border border-border rounded-xl text-xs font-semibold text-text-primary"
                required
              />
            </div>
            <Input
              id="new-preferred-time"
              label="Preferred Time Slot *"
              placeholder="Mon 5:00 PM EST"
              value={newBookingData.preferred_time}
              onChange={(e) => setNewBookingData((p) => ({ ...p, preferred_time: e.target.value }))}
              required
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowNewBookingModal(false)}
              className="px-4 py-2 border border-border hover:bg-surface-light rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-colors disabled:opacity-50"
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
                  Coach {c.first_name} {c.last_name}
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

      {/* ── MODAL: RESCHEDULE TIME ─────────────────────────────────────────── */}
      <Modal
        isOpen={!!rescheduleBooking}
        onClose={() => setRescheduleBooking(null)}
        title="Reschedule Demo Class"
      >
        <form onSubmit={handleRescheduleSubmit} className="space-y-4 text-xs">
          <p className="text-text-secondary">
            Enter the new proposed time for <strong>{rescheduleBooking?.student_name}</strong>.
          </p>
          <Input
            id="reschedule-time"
            label="New Session Time *"
            placeholder="e.g. Saturday 10:00 AM IST"
            value={newTimeInput}
            onChange={(e) => setNewTimeInput(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setRescheduleBooking(null)}
              className="px-4 py-2 border border-border hover:bg-surface-light rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newTimeInput.trim()}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-colors disabled:opacity-50"
            >
              Save & Notify Parent
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

            <div>
              <span className="block text-[10px] font-extrabold text-text-secondary uppercase mb-1.5">
                Choose Response Template
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(QUICK_REPLY_TEMPLATES) as Array<keyof typeof QUICK_REPLY_TEMPLATES>).map((key) => {
                  const tpl = QUICK_REPLY_TEMPLATES[key];
                  const isSelected = replyTemplateKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleTemplateSelect(key)}
                      className={`px-3 py-1.5 rounded-lg font-bold border transition-all ${
                        isSelected
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-white text-text-secondary border-border hover:border-primary/50'
                      }`}
                    >
                      {tpl.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <Input
              id="reply-subject"
              label="Email Subject"
              value={replySubject}
              onChange={(e) => setReplySubject(e.target.value)}
              required
            />

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
                label="Student Full Name *"
                placeholder="e.g. Leo Sharma"
                value={inquiryChildName}
                onChange={(e) => setInquiryChildName(e.target.value)}
                required
              />
              <Input
                id="inquiry-child-age"
                label="Student Age (3–100 years) *"
                type="number"
                min={3}
                max={100}
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
