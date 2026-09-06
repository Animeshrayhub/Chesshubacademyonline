'use client';

import React, { useState, useTransition } from 'react';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import FilterBar from '@/components/dashboard/ui/FilterBar';
import TableActions, { type TableActionItem } from '@/components/dashboard/ui/TableActions';
import Pagination from '@/components/dashboard/ui/Pagination';
import ConfirmationModal from '@/components/dashboard/ui/ConfirmationModal';
import Input from '@/components/ui/Input';
import type { AdminCoachRow, AdminStudentRow } from '@/types/dashboard';
import type {
  AdminClassRow,
  CreateClassInput,
  CreateBatchClassesInput,
  CreateBatchClassesResult,
  ClassStatus,
  ClassType,
  VideoProvider,
} from '@/lib/classes';
import {
  createClassAction,
  createBatchClassesAction,
  updateClassAction,
  deleteClassAction,
} from '@/actions/classes';
import { createZoomMeetingAction, syncClassRecordingToDriveAction } from '@/actions/zoom';
import Modal from '@/components/ui/Modal';
import AdminRecordingPlayerModal from '@/features/admin/AdminRecordingPlayerModal';

interface ClassesRegistryProps {
  classes: AdminClassRow[];
  coaches: AdminCoachRow[];
  students: AdminStudentRow[];
}

const STATUS_LABELS: Record<ClassStatus, string> = {
  SCHEDULED: 'Scheduled',
  LIVE: 'Live',
  COMPLETED: 'Completed',
  RECORDING_AVAILABLE: 'Recording',
  CANCELLED: 'Cancelled',
};

const STATUS_COLORS: Record<ClassStatus, string> = {
  SCHEDULED: 'bg-blue-50 text-blue-700 border border-blue-100',
  LIVE: 'bg-green-50 text-green-700 border border-green-100',
  COMPLETED: 'bg-gray-50 text-gray-600 border border-gray-100',
  RECORDING_AVAILABLE: 'bg-purple-50 text-purple-700 border border-purple-100',
  CANCELLED: 'bg-red-50 text-red-600 border border-red-100',
};

const CAPACITY_LIMITS: Record<ClassType, number> = {
  PRIVATE: 1,
  BUDDY: 2,
  GROUP: 5,
};

const DAYS_OF_WEEK = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
];

export default function ClassesRegistry({ classes, coaches, students }: ClassesRegistryProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [, startTransition] = useTransition();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editClass, setEditClass] = useState<AdminClassRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminClassRow | null>(null);

  // Video recording player modal state
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [selectedRecordingClass, setSelectedRecordingClass] = useState<AdminClassRow | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    coachUserId: '',
    scheduledStart: '',
    durationMinutes: 60,
    classType: 'GROUP' as ClassType,
    status: 'SCHEDULED' as ClassStatus,
    videoProvider: 'ZOOM' as VideoProvider,
    zoomJoinUrl: '',
    zoomStartUrl: '',
    recordingUrl: '',
    studentUserIds: [] as string[],
  });
  const [studentSearch, setStudentSearch] = useState('');
  const [studentFilter, setStudentFilter] = useState<'ALL' | 'COACH' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('ALL');
  const [allowCapacityOverride, setAllowCapacityOverride] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  const [recurringWeeks, setRecurringWeeks] = useState(4);
  const [createdBatchResult, setCreatedBatchResult] = useState<CreateBatchClassesResult | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  const pageSize = 10;

  // Filter
  const filtered = classes.filter((c) => {
    const coachName = c.coach ? `${c.coach.first_name} ${c.coach.last_name}`.toLowerCase() : '';
    const nameMatch = coachName.includes(search.toLowerCase());
    const statusMatch = statusFilter === 'ALL' || c.status === statusFilter;
    return nameMatch && statusMatch;
  });

  // Sort logic — TODAY's classes pinned to TOP!
  const sorted = [...filtered].sort((a, b) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;

    const timeA = new Date(a.scheduled_start).getTime();
    const timeB = new Date(b.scheduled_start).getTime();

    const aIsToday = timeA >= todayStart && timeA < todayEnd;
    const bIsToday = timeB >= todayStart && timeB < todayEnd;

    if (aIsToday && !bIsToday) return -1;
    if (!aIsToday && bIsToday) return 1;

    return timeA - timeB;
  });

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const resetForm = () => {
    setFormData({
      coachUserId: '',
      scheduledStart: '',
      durationMinutes: 60,
      classType: 'GROUP',
      status: 'SCHEDULED',
      videoProvider: 'ZOOM',
      zoomJoinUrl: '',
      zoomStartUrl: '',
      recordingUrl: '',
      studentUserIds: [],
    });
    setStudentSearch('');
    setStudentFilter('ALL');
    setAllowCapacityOverride(false);
    setIsRecurring(false);
    setRecurringDays([]);
    setRecurringWeeks(4);
    setCreatedBatchResult(null);
    setCopiedLink(false);
    setIsSubmitting(false);
    setFormError('');
    setFormSuccess(false);
  };

  const openCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openEdit = (cls: AdminClassRow) => {
    const coachUser = coaches.find(
      (c) =>
        (cls.coach?.id && c.profile?.id === cls.coach.id) ||
        (c.first_name === cls.coach?.first_name && c.last_name === cls.coach?.last_name)
    );
    const joinUrl = cls.zoom_join_url ?? '';
    const detectedProvider: VideoProvider = joinUrl.includes('jit.si')
      ? 'JITSI'
      : joinUrl.includes('meet.google.com')
      ? 'GOOGLE_MEET'
      : cls.video_provider || (joinUrl ? 'CUSTOM' : 'JITSI');

    setFormData({
      coachUserId: coachUser?.id ?? '',
      scheduledStart: cls.scheduled_start ? cls.scheduled_start.slice(0, 16) : '',
      durationMinutes: cls.duration_minutes,
      classType: cls.class_type,
      status: cls.status,
      videoProvider: detectedProvider,
      zoomJoinUrl: joinUrl,
      zoomStartUrl: cls.zoom_start_url ?? '',
      recordingUrl: cls.recording_url ?? '',
      studentUserIds: cls.students ? cls.students.map((s) => s.id) : [],
    });
    setStudentSearch('');
    setStudentFilter('ALL');
    setAllowCapacityOverride(false);
    setIsRecurring(false);
    setRecurringDays([]);
    setRecurringWeeks(4);
    setCreatedBatchResult(null);
    setCopiedLink(false);
    setIsSubmitting(false);
    setFormError('');
    setFormSuccess(false);
    setEditClass(cls);
  };

  const toggleStudent = (id: string) => {
    setFormData((prev) => {
      const isSelected = prev.studentUserIds.includes(id);
      const updated = isSelected
        ? prev.studentUserIds.filter((item) => item !== id)
        : [...prev.studentUserIds, id];
      return { ...prev, studentUserIds: updated };
    });
  };

  const removeStudent = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      studentUserIds: prev.studentUserIds.filter((item) => item !== id),
    }));
  };

  const clearAllStudents = () => {
    setFormData((prev) => ({ ...prev, studentUserIds: [] }));
  };

  const maxCapacity = CAPACITY_LIMITS[formData.classType] || 5;
  const enrolledCount = formData.studentUserIds.length;
  const isOverCapacity = enrolledCount > maxCapacity;
  const seatsRemaining = maxCapacity - enrolledCount;

  const selectedCoachStudentsCount = formData.coachUserId
    ? students.filter(
        (s) =>
          s.assigned_coach?.id === formData.coachUserId ||
          (s.profile as any)?.assigned_coach_id === formData.coachUserId
      ).length
    : 0;

  const filteredStudents = students.filter((s) => {
    const q = studentSearch.trim().toLowerCase();
    const name = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
    const email = (s.email || '').toLowerCase();
    const matchesSearch = !q || name.includes(q) || email.includes(q);
    if (!matchesSearch) return false;

    if (studentFilter === 'COACH') {
      if (!formData.coachUserId) return true;
      return (
        s.assigned_coach?.id === formData.coachUserId ||
        (s.profile as any)?.assigned_coach_id === formData.coachUserId
      );
    }
    if (studentFilter === 'BEGINNER') {
      return s.profile?.level === 'BEGINNER';
    }
    if (studentFilter === 'INTERMEDIATE') {
      return s.profile?.level === 'INTERMEDIATE';
    }
    if (studentFilter === 'ADVANCED') {
      return s.profile?.level === 'ADVANCED';
    }
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.coachUserId) {
      setFormError('Please select a coach.');
      return;
    }
    if (!formData.scheduledStart) {
      setFormError('Please enter a scheduled start time.');
      return;
    }

    const studentCount = formData.studentUserIds.length;
    const maxAllowed = CAPACITY_LIMITS[formData.classType] || 5;
    if (studentCount > maxAllowed && !allowCapacityOverride) {
      setFormError(
        `Selected learners (${studentCount}) exceed standard capacity for ${formData.classType} (${maxAllowed}). Please check "Allow admin capacity override" to proceed or remove learners.`
      );
      return;
    }

    if (isRecurring && recurringDays.length === 0) {
      setFormError('Please select at least one day of the week for recurring sessions.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: CreateClassInput = {
        coachUserId: formData.coachUserId,
        scheduledStart: new Date(formData.scheduledStart).toISOString(),
        durationMinutes: formData.durationMinutes,
        classType: formData.classType,
        status: formData.status,
        videoProvider: formData.videoProvider,
        zoomJoinUrl: formData.zoomJoinUrl || undefined,
        zoomStartUrl: formData.zoomStartUrl || undefined,
        recordingUrl: formData.recordingUrl || undefined,
        studentUserIds: formData.studentUserIds,
      };

      if (editClass) {
        const res = await updateClassAction(editClass.id, payload);
        if (res.success) {
          setFormSuccess(true);
          setTimeout(() => {
            setIsCreateOpen(false);
            setEditClass(null);
            resetForm();
          }, 1200);
        } else {
          setFormError(res.error?.message || 'An error occurred. Please try again.');
        }
      } else {
        const batchPayload: CreateBatchClassesInput = {
          ...payload,
          isRecurring,
          recurringDays: isRecurring ? recurringDays : undefined,
          recurringWeeks: isRecurring ? recurringWeeks : undefined,
        };

        const res = await createBatchClassesAction(batchPayload);
        if (res.success && res.data) {
          setCreatedBatchResult(res.data);
        } else {
          setFormError(res.error?.message || 'An error occurred. Please try again.');
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!confirmDelete) return;
    startTransition(async () => {
      await deleteClassAction(confirmDelete.id);
      setConfirmDelete(null);
    });
  };

  const handleCloseModal = () => {
    setIsCreateOpen(false);
    setEditClass(null);
    resetForm();
  };

  const columns = [
    { key: 'coach', label: 'Coach' },
    { key: 'students', label: 'Students' },
    { key: 'start', label: 'Scheduled Start' },
    { key: 'duration', label: 'Duration' },
    { key: 'type', label: 'Type' },
    { key: 'platform', label: 'Video Provider' },
    { key: 'status', label: 'Status' },
    { key: 'recording', label: 'Recording Video' },
    { key: 'actions', label: 'Actions', width: 'w-10' },
  ];

  const rows = paginated.map((cls) => {
    const joinUrl = cls.zoom_join_url || '';
    const isJitsi = joinUrl.includes('jit.si') || joinUrl.includes('ffmuc.net') || joinUrl.toLowerCase().includes('jitsi');
    const isMeet = joinUrl.includes('meet.google.com');

    const actions: TableActionItem[] = [
      {
        label: 'Enter Classroom',
        iconKey: 'video',
        onClick: () => {
          window.open(`/classroom/${cls.id}`, '_blank');
        },
      },
      ...(cls.zoom_join_url
        ? [
            {
              label: 'Open Zoom Direct Link',
              iconKey: 'video',
              onClick: () => {
                if (cls.zoom_join_url) {
                  window.open(cls.zoom_join_url, '_blank');
                }
              },
            },
          ]
        : []),
      {
        label: cls.recording_url ? '🎥 View / Play Recording' : '🎥 Play / Attach Recording',
        iconKey: 'video',
        onClick: () => {
          setSelectedRecordingClass(cls);
          setIsPlayerOpen(true);
        },
      },
      {
        label: 'Edit Class & Recording',
        iconKey: 'pencil',
        onClick: () => openEdit(cls),
      },
    ];

    if (!isJitsi) {
      actions.push({
        label: 'Switch to Jitsi (Free)',
        iconKey: 'refresh',
        onClick: () => {
          startTransition(async () => {
            const res = await updateClassAction(cls.id, { videoProvider: 'JITSI' });
            if (!res.success) {
              alert(res.error?.message || 'Failed to switch to Jitsi.');
            }
          });
        },
      });
    }

    if (!cls.zoom_join_url || isJitsi) {
      actions.push({
        label: 'Generate Zoom Meeting',
        iconKey: 'video',
        onClick: () => {
          startTransition(async () => {
            const res = await createZoomMeetingAction(cls.id);
            if (!res.success) {
              alert(res.error?.message || 'Failed to generate Zoom meeting. Make sure Zoom API credentials are active.');
            }
          });
        },
      });
    }

    if (cls.status === 'LIVE' || cls.status === 'COMPLETED' || cls.status === 'RECORDING_AVAILABLE') {
      actions.push({
        label: 'Sync Recording to Drive',
        iconKey: 'refresh',
        onClick: () => {
          startTransition(async () => {
            const res = await syncClassRecordingToDriveAction(cls.id);
            if (!res.success) {
              alert(res.error?.message || 'Failed to sync recording to Google Drive.');
            } else {
              alert('Successfully synced recording to Google Drive!');
            }
          });
        },
      });
    }

    actions.push({
      label: 'Delete Class',
      iconKey: 'trash',
      variant: 'danger',
      onClick: () => setConfirmDelete(cls),
    });

    const dateStr = cls.scheduled_start
      ? new Date(cls.scheduled_start).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

    const platformBadge = isJitsi ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-50 text-green-700 border border-green-200">
        🟢 Jitsi (Free)
      </span>
    ) : isMeet ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
        🟡 Google Meet
      </span>
    ) : joinUrl ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
        🔵 Custom / Zoom
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
        ⚪ Pending
      </span>
    );

    const recordingBadge = cls.recording_url ? (
      <button
        type="button"
        onClick={() => {
          setSelectedRecordingClass(cls);
          setIsPlayerOpen(true);
        }}
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300 hover:bg-purple-200 transition cursor-pointer"
      >
        ▶️ Play Recording
      </button>
    ) : cls.status === 'RECORDING_AVAILABLE' || cls.status === 'COMPLETED' ? (
      <button
        type="button"
        onClick={() => openEdit(cls)}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition cursor-pointer"
      >
        + Attach Link
      </button>
    ) : (
      <span className="text-slate-400 text-xs">—</span>
    );

    return {
      coach: (
        <span className="font-semibold text-text-primary text-xs">
          {cls.coach ? `${cls.coach.first_name} ${cls.coach.last_name}` : '—'}
        </span>
      ),
      students: (
        <div className="space-y-0.5 max-w-[160px]">
          {cls.students && cls.students.length > 0 ? (
            cls.students.map((s) => (
              <span key={s.id} className="block text-xs text-text-primary font-medium truncate">
                {s.first_name} {s.last_name}
              </span>
            ))
          ) : (
            <span className="text-text-secondary text-xs italic">No students assigned</span>
          )}
        </div>
      ),
      start: <span className="text-text-secondary text-xs">{dateStr}</span>,
      duration: <span className="text-text-secondary text-xs font-mono">{cls.duration_minutes} min</span>,
      type: (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-surface text-text-primary border border-border">
          {cls.class_type}
        </span>
      ),
      platform: platformBadge,
      status: (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[cls.status]}`}>
          {STATUS_LABELS[cls.status]}
        </span>
      ),
      recording: recordingBadge,
      actions: <TableActions actions={actions} />,
    };
  });

  const isOpen = isCreateOpen || !!editClass;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academy Classes"
        subtitle="Manage live courses, private sessions, active classroom links, and syllabus mapping."
        action={
          <button
            type="button"
            onClick={openCreate}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
          >
            <span>+ Create New Class</span>
          </button>
        }
      />

      <div className="space-y-4">
        <FilterBar
          searchPlaceholder="Search by coach name..."
          searchQuery={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          filters={[
            {
              key: 'status',
              label: 'Status',
              options: [
                { value: 'ALL', label: 'All Statuses' },
                { value: 'SCHEDULED', label: 'Scheduled' },
                { value: 'LIVE', label: 'Live' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'RECORDING_AVAILABLE', label: 'Recording' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ],
              value: statusFilter,
              onChange: (v) => { setStatusFilter(v); setPage(1); },
            },
          ]}
        />

        <DashboardTable
          columns={columns}
          rows={rows}
          emptyTitle="No Classes Found"
          emptyDescription="There are no classes matching your current search or status filter."
        />

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isOpen}
        onClose={handleCloseModal}
        title={
          createdBatchResult
            ? 'Class Scheduled Successfully'
            : editClass
            ? 'Edit Class & Recording'
            : 'Create New Class'
        }
        maxWidthClass="max-w-2xl"
      >
        {createdBatchResult ? (
          <div className="space-y-4 py-2">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
              <div className="text-3xl">🎉</div>
              <h4 className="text-base font-bold text-emerald-800">
                {createdBatchResult.createdCount > 1
                  ? `${createdBatchResult.createdCount} Class Sessions Scheduled!`
                  : 'Class Session Scheduled!'}
              </h4>
              <p className="text-xs text-emerald-700">
                In-app notifications have been automatically dispatched to the coach and {formData.studentUserIds.length} enrolled learner(s).
              </p>
            </div>

            {/* Meeting Link Preview & Copy */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-text-primary">
                🔗 Classroom Join Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={
                    createdBatchResult.joinUrl ||
                    (createdBatchResult.classes?.[0]
                      ? `https://chesshubacademy.online/classroom/${createdBatchResult.classes[0].id}`
                      : '')
                  }
                  className="flex-1 px-3 py-2 text-xs border border-border rounded-xl bg-slate-50 font-mono text-slate-700 focus:outline-none select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    const url =
                      createdBatchResult.joinUrl ||
                      (createdBatchResult.classes?.[0]
                        ? `https://chesshubacademy.online/classroom/${createdBatchResult.classes[0].id}`
                        : '');
                    if (url) {
                      navigator.clipboard.writeText(url);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }
                  }}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition whitespace-nowrap"
                >
                  {copiedLink ? '✓ Copied!' : '📋 Copy Link'}
                </button>
              </div>
            </div>

            {/* WhatsApp Share Button */}
            {createdBatchResult.whatsappShareText && (
              <div className="pt-2">
                <a
                  href={`https://api.whatsapp.com/send?text=${
                    createdBatchResult.whatsappShareText.startsWith('%')
                      ? createdBatchResult.whatsappShareText
                      : encodeURIComponent(createdBatchResult.whatsappShareText)
                  }`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <span className="text-base">📱</span>
                  <span>Share Schedule & Link on WhatsApp</span>
                </a>
              </div>
            )}

            <div className="pt-3 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition"
              >
                Done
              </button>
            </div>
          </div>
        ) : formSuccess ? (
          <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-xs font-semibold text-green-700">
            {editClass ? 'Class updated successfully.' : 'Class created successfully.'}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Coach Selector */}
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Assign Coach <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-3 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                value={formData.coachUserId}
                onChange={(e) => setFormData((p) => ({ ...p, coachUserId: e.target.value }))}
                required
              >
                <option value="">Select coach...</option>
                {coaches.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Students Multi-Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-text-primary">
                  Assign Students
                </label>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-all ${
                    isOverCapacity
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : enrolledCount === maxCapacity
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}
                >
                  {enrolledCount} / {maxCapacity}{' '}
                  {isOverCapacity
                    ? '(Over limit)'
                    : enrolledCount === maxCapacity
                    ? '(Full)'
                    : `(${seatsRemaining} seats open)`}
                </span>
              </div>

              {/* Selected Learner Chips */}
              {formData.studentUserIds.length > 0 && (
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-text-secondary">
                    <span>Enrolled Learners ({formData.studentUserIds.length}):</span>
                    <button
                      type="button"
                      onClick={clearAllStudents}
                      className="text-[10px] text-red-600 hover:underline font-bold"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {formData.studentUserIds.map((id) => {
                      const studentObj = students.find(
                        (s) => s.id === id || s.profile?.id === id
                      );
                      const name = studentObj
                        ? `${studentObj.first_name} ${studentObj.last_name}`
                        : 'Learner';
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
                        >
                          <span>👤 {name}</span>
                          <button
                            type="button"
                            onClick={() => removeStudent(id)}
                            className="text-primary/70 hover:text-red-500 font-bold ml-0.5 transition"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Over-Capacity Warning Banner */}
              {isOverCapacity && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800">
                    <span>⚠️ Over Recommended Capacity</span>
                    <span className="text-[11px] font-normal text-amber-700">
                      ({enrolledCount} learners selected; standard limit is {maxCapacity} for {formData.classType})
                    </span>
                  </div>
                  <label className="flex items-center gap-2 font-medium text-amber-900 cursor-pointer pt-0.5">
                    <input
                      type="checkbox"
                      checked={allowCapacityOverride}
                      onChange={(e) => setAllowCapacityOverride(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 border-amber-300"
                    />
                    <span>Allow admin capacity override for this class</span>
                  </label>
                </div>
              )}

              {/* Instant Search & Filter Pills */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="🔍 Search learner by name or email..."
                    className="flex-1 px-3 py-1.5 text-xs border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  />
                  {studentSearch && (
                    <button
                      type="button"
                      onClick={() => setStudentSearch('')}
                      className="text-xs text-text-secondary hover:text-text-primary px-2"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setStudentFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition ${
                      studentFilter === 'ALL'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                    }`}
                  >
                    All ({students.length})
                  </button>
                  {formData.coachUserId && (
                    <button
                      type="button"
                      onClick={() => setStudentFilter('COACH')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition ${
                        studentFilter === 'COACH'
                          ? 'bg-primary text-white font-bold'
                          : 'bg-primary/10 text-primary hover:bg-primary/20'
                      }`}
                    >
                      Coach&apos;s Assigned ({selectedCoachStudentsCount})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setStudentFilter('BEGINNER')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition ${
                      studentFilter === 'BEGINNER'
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                    }`}
                  >
                    Beginner
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentFilter('INTERMEDIATE')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition ${
                      studentFilter === 'INTERMEDIATE'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                    }`}
                  >
                    Intermediate
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentFilter('ADVANCED')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition ${
                      studentFilter === 'ADVANCED'
                        ? 'bg-purple-600 text-white font-bold'
                        : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                    }`}
                  >
                    Advanced
                  </button>
                </div>
              </div>

              {/* Scrollable Learner List */}
              <div className="border border-border rounded-xl p-2 max-h-36 overflow-y-auto space-y-1 bg-white">
                {filteredStudents.length === 0 ? (
                  <p className="text-xs text-text-muted italic p-3 text-center">
                    No learners match the current search or filter.
                  </p>
                ) : (
                  filteredStudents.map((s) => {
                    const isSelected =
                      formData.studentUserIds.includes(s.id) ||
                      (s.profile?.id ? formData.studentUserIds.includes(s.profile.id) : false);

                    const isCoachAssigned =
                      formData.coachUserId &&
                      (s.assigned_coach?.id === formData.coachUserId ||
                        (s.profile as any)?.assigned_coach_id === formData.coachUserId);

                    return (
                      <label
                        key={s.id}
                        className={`flex items-center justify-between gap-2 text-xs p-1.5 rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-primary/10 text-primary font-semibold border border-primary/20'
                            : 'text-text-primary hover:bg-surface-light border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleStudent(s.id)}
                            className="rounded text-primary focus:ring-primary border-border"
                          />
                          <span className="truncate">
                            {s.first_name} {s.last_name}
                          </span>
                          {isCoachAssigned && (
                            <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-bold whitespace-nowrap">
                              Coach&apos;s
                            </span>
                          )}
                          {s.profile?.level && (
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium capitalize">
                              {s.profile.level.toLowerCase()}
                            </span>
                          )}
                        </div>
                        {s.email && (
                          <span className="text-[10px] text-text-muted truncate max-w-[120px]">
                            {s.email}
                          </span>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* Scheduled Start */}
            <Input
              id="class-start"
              label="Scheduled Start"
              type="datetime-local"
              value={formData.scheduledStart}
              onChange={(e) => setFormData((p) => ({ ...p, scheduledStart: e.target.value }))}
              required
            />

            {/* Recurring Weekly Schedule Section (Only for new classes) */}
            {!editClass && (
              <div className="p-3 bg-slate-50 border border-border rounded-xl space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔁</span>
                    <div>
                      <span className="block text-xs font-bold text-text-primary">
                        Repeat Weekly (Batch Scheduling)
                      </span>
                      <span className="block text-[11px] text-text-secondary">
                        Automatically create recurring weekly sessions for this batch
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsRecurring(checked);
                      if (checked && recurringDays.length === 0) {
                        const day = formData.scheduledStart
                          ? new Date(formData.scheduledStart).getDay()
                          : 1;
                        setRecurringDays([day]);
                      }
                    }}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
                  />
                </label>

                {isRecurring && (
                  <div className="pt-2 border-t border-border/60 space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-text-primary mb-1.5">
                        Repeat On Days:
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {DAYS_OF_WEEK.map((d) => {
                          const isSelected = recurringDays.includes(d.value);
                          return (
                            <button
                              key={d.value}
                              type="button"
                              onClick={() => {
                                setRecurringDays((prev) =>
                                  isSelected
                                    ? prev.filter((val) => val !== d.value)
                                    : [...prev, d.value]
                                );
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                isSelected
                                  ? 'bg-primary text-white shadow-xs'
                                  : 'bg-white text-text-secondary border border-border hover:border-text-secondary'
                              }`}
                            >
                              {d.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-text-primary mb-1.5">
                          Batch Duration (Weeks)
                        </label>
                        <select
                          value={recurringWeeks}
                          onChange={(e) => setRecurringWeeks(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white font-medium"
                        >
                          <option value={2}>2 Weeks (Crash Course)</option>
                          <option value={4}>4 Weeks (1 Month)</option>
                          <option value={8}>8 Weeks (2 Months)</option>
                          <option value={12}>12 Weeks (3 Months / Quarter)</option>
                        </select>
                      </div>

                      <div className="flex flex-col justify-end">
                        <div className="px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl text-[11px] font-semibold text-blue-800">
                          🗓️ Total Sessions: ~{Math.max(1, recurringDays.length * recurringWeeks)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Duration & Type row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">Duration (min)</label>
                <input
                  type="number"
                  min={15}
                  step={15}
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData((p) => ({ ...p, durationMinutes: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">Class Type</label>
                <select
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  value={formData.classType}
                  onChange={(e) => setFormData((p) => ({ ...p, classType: e.target.value as ClassType }))}
                >
                  <option value="GROUP">Group (Max 5)</option>
                  <option value="BUDDY">Buddy (Max 2)</option>
                  <option value="PRIVATE">Private (Max 1)</option>
                </select>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">Status</label>
              <select
                className="w-full px-3 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                value={formData.status}
                onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value as ClassStatus }))}
              >
                <option value="SCHEDULED">Scheduled</option>
                <option value="LIVE">Live</option>
                <option value="COMPLETED">Completed</option>
                <option value="RECORDING_AVAILABLE">Recording Available</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Video Server Platform Selector */}
            <div className="pt-2 border-t border-border/60">
              <label className="block text-xs font-bold text-text-primary mb-1.5">
                📹 Live Video Classroom Provider
              </label>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, videoProvider: 'JITSI' }))}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    formData.videoProvider === 'JITSI'
                      ? 'border-green-500 bg-green-50/60 ring-2 ring-green-500/20'
                      : 'border-border bg-slate-50 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-green-700">🟢 Jitsi Meet</span>
                    <span className="text-[9px] bg-green-200 text-green-800 font-bold px-1.5 py-0.5 rounded">FREE</span>
                  </div>
                  <p className="text-[10px] text-text-secondary leading-tight">Unlimited time, zero setup, embedded.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, videoProvider: 'ZOOM' }))}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    formData.videoProvider === 'ZOOM'
                      ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
                      : 'border-border bg-slate-50 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-blue-700">🔵 Zoom API</span>
                    <span className="text-[9px] bg-blue-200 text-blue-800 font-bold px-1.5 py-0.5 rounded">SDK</span>
                  </div>
                  <p className="text-[10px] text-text-secondary leading-tight">Zoom meeting API integration.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, videoProvider: 'GOOGLE_MEET' }))}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    formData.videoProvider === 'GOOGLE_MEET' || formData.videoProvider === 'CUSTOM'
                      ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
                      : 'border-border bg-slate-50 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-amber-700">🟡 Google Meet</span>
                    <span className="text-[9px] bg-amber-200 text-amber-800 font-bold px-1.5 py-0.5 rounded">LINK</span>
                  </div>
                  <p className="text-[10px] text-text-secondary leading-tight">Custom Google Meet / external link.</p>
                </button>
              </div>
            </div>

            {/* Admin Custom Meeting URLs */}
            <div className="space-y-3">
              <div>
                <Input
                  id="zoom-join-url"
                  label={formData.videoProvider === 'JITSI' ? 'Jitsi Room Link (Auto-generated if empty)' : formData.videoProvider === 'ZOOM' ? 'Zoom Join Link (Auto-generated via Zoom API if empty)' : 'Google Meet / Custom Meeting Link'}
                  placeholder={formData.videoProvider === 'JITSI' ? 'Auto-generated Jitsi Link' : formData.videoProvider === 'ZOOM' ? 'https://zoom.us/j/...' : 'https://meet.google.com/xyz-abc-def'}
                  value={formData.zoomJoinUrl}
                  onChange={(e) => setFormData((p) => ({ ...p, zoomJoinUrl: e.target.value }))}
                />
              </div>

              {/* Class Video Recording URL Input */}
              <div className="pt-2 border-t border-border/60">
                <Input
                  id="recording-url"
                  label="🎥 Class Video Recording URL (Google Drive, Zoom Cloud, MP4, YouTube)"
                  placeholder="https://drive.google.com/file/d/... or https://..."
                  value={formData.recordingUrl}
                  onChange={(e) => setFormData((p) => ({ ...p, recordingUrl: e.target.value }))}
                />
                <p className="text-[10px] text-text-secondary mt-1">
                  💡 Published to student and coach recording archives for playback.
                </p>
              </div>
            </div>

            {formError && (
              <p className="text-xs text-red-600 font-medium">{formError}</p>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 border border-border hover:bg-surface-light rounded-xl text-xs font-semibold"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors"
              >
                {isSubmitting
                  ? 'Scheduling...'
                  : editClass
                  ? 'Save Changes'
                  : isRecurring
                  ? `Schedule ${Math.max(1, recurringDays.length * recurringWeeks)} Sessions`
                  : 'Create Class'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Admin Video Recording Player Modal */}
      <AdminRecordingPlayerModal
        isOpen={isPlayerOpen}
        onClose={() => { setIsPlayerOpen(false); setSelectedRecordingClass(null); }}
        classData={selectedRecordingClass}
        onEditRecordingLink={(cls) => openEdit(cls)}
      />

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={!!confirmDelete}
        title="Delete Class?"
        description="This will permanently archive the class session. Students assigned to this class will lose access."
        confirmLabel="Delete Class"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
