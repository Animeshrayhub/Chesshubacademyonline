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
import type { AdminClassRow, CreateClassInput, ClassStatus, ClassType, VideoProvider } from '@/lib/classes';
import { createClassAction, updateClassAction, deleteClassAction } from '@/actions/classes';
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
    videoProvider: 'JITSI' as VideoProvider,
    zoomJoinUrl: '',
    zoomStartUrl: '',
    recordingUrl: '',
    studentUserIds: [] as string[],
  });
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

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const resetForm = () => {
    setFormData({
      coachUserId: '',
      scheduledStart: '',
      durationMinutes: 60,
      classType: 'GROUP',
      status: 'SCHEDULED',
      videoProvider: 'JITSI',
      zoomJoinUrl: '',
      zoomStartUrl: '',
      recordingUrl: '',
      studentUserIds: [],
    });
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
    setFormError('');
    setFormSuccess(false);
    setEditClass(cls);
  };

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
    if (formData.classType === 'PRIVATE' && studentCount > 1) {
      setFormError('PRIVATE classes can have at most 1 student.');
      return;
    }
    if (formData.classType === 'BUDDY' && studentCount > 2) {
      setFormError('BUDDY classes can have at most 2 students.');
      return;
    }
    if (formData.classType === 'GROUP' && studentCount > 5) {
      setFormError('GROUP (max 5) classes can have at most 5 students.');
      return;
    }

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

    let res: { success: boolean; error?: { message: string } };

    if (editClass) {
      res = await updateClassAction(editClass.id, payload);
    } else {
      res = await createClassAction(payload);
    }

    if (res.success) {
      setFormSuccess(true);
      setTimeout(() => {
        setIsCreateOpen(false);
        setEditClass(null);
        resetForm();
      }, 1000);
    } else {
      setFormError(res.error?.message || 'An error occurred. Please try again.');
    }
  };

  const handleConfirmDelete = () => {
    if (!confirmDelete) return;
    startTransition(async () => {
      await deleteClassAction(confirmDelete.id);
      setConfirmDelete(null);
    });
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
        onClose={() => { setIsCreateOpen(false); setEditClass(null); }}
        title={editClass ? 'Edit Class & Recording' : 'Create New Class'}
        maxWidthClass="max-w-lg"
      >
        {formSuccess ? (
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
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Assign Students
              </label>
              <div className="border border-border rounded-xl p-3 max-h-32 overflow-y-auto space-y-1.5 bg-white">
                {students.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-xs text-text-primary cursor-pointer hover:bg-surface-light p-1 rounded-lg">
                    <input
                      type="checkbox"
                      checked={formData.studentUserIds.includes(s.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData((prev) => {
                          const list = checked
                            ? [...prev.studentUserIds, s.id]
                            : prev.studentUserIds.filter((id) => id !== s.id);
                          return { ...prev, studentUserIds: list };
                        });
                      }}
                      className="rounded text-primary focus:ring-primary border-border"
                    />
                    <span>{s.first_name} {s.last_name}</span>
                  </label>
                ))}
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
                onClick={() => { setIsCreateOpen(false); setEditClass(null); }}
                className="px-4 py-2 border border-border hover:bg-surface-light rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-colors"
              >
                {editClass ? 'Save Changes' : 'Create Class'}
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
