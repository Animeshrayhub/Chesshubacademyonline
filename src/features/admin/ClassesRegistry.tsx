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
import type { AdminClassRow, CreateClassInput, ClassStatus, ClassType } from '@/lib/classes';
import { createClassAction, updateClassAction, deleteClassAction } from '@/actions/classes';
import { createZoomMeetingAction, syncClassRecordingToDriveAction } from '@/actions/zoom';
import Modal from '@/components/ui/Modal';

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

  // Form state
  const [formData, setFormData] = useState({
    coachUserId: '',
    scheduledStart: '',
    durationMinutes: 60,
    classType: 'GROUP' as ClassType,
    status: 'SCHEDULED' as ClassStatus,
    zoomJoinUrl: '',
    zoomStartUrl: '',
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
      zoomJoinUrl: '',
      zoomStartUrl: '',
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
    // Find the coach user id from the class coach info by profile ID or first/last name
    const coachUser = coaches.find(
      (c) =>
        (cls.coach?.id && c.profile?.id === cls.coach.id) ||
        (c.first_name === cls.coach?.first_name && c.last_name === cls.coach?.last_name)
    );
    setFormData({
      coachUserId: coachUser?.id ?? '',
      scheduledStart: cls.scheduled_start ? cls.scheduled_start.slice(0, 16) : '',
      durationMinutes: cls.duration_minutes,
      classType: cls.class_type,
      status: cls.status,
      zoomJoinUrl: cls.zoom_join_url ?? '',
      zoomStartUrl: cls.zoom_start_url ?? '',
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

    // Validate student counts based on class type
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
      zoomJoinUrl: formData.zoomJoinUrl || undefined,
      zoomStartUrl: formData.zoomStartUrl || undefined,
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
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions', width: 'w-10' },
  ];

  const rows = paginated.map((cls) => {
    const actions: TableActionItem[] = [
      {
        label: 'Enter Classroom',
        iconKey: 'video',
        onClick: () => {
          window.open(`/classroom/${cls.id}`, '_blank');
        },
      },
      {
        label: 'Edit Class',
        iconKey: 'pencil',
        onClick: () => openEdit(cls),
      },
    ];

    if (!cls.zoom_join_url) {
      actions.push({
        label: 'Generate Zoom Meeting',
        iconKey: 'video',
        onClick: () => {
          startTransition(async () => {
            const res = await createZoomMeetingAction(cls.id);
            if (!res.success) {
              alert(res.error?.message || 'Failed to generate Zoom meeting.');
            }
          });
        },
      });
    }

    if (cls.status === 'LIVE' || cls.status === 'COMPLETED') {
      actions.push({
        label: 'Sync Zoom to Drive',
        iconKey: 'refresh',
        onClick: () => {
          startTransition(async () => {
            const res = await syncClassRecordingToDriveAction(cls.id);
            if (!res.success) {
              alert(res.error?.message || 'Failed to sync recording to Google Drive.');
            } else {
              alert('Successfully synced Zoom recording to Google Drive!');
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

    return {
      coach: cls.coach ? (
        <span className="font-semibold text-text-primary">
          {cls.coach.first_name} {cls.coach.last_name}
        </span>
      ) : (
        <span className="text-xs text-text-secondary italic">Unassigned</span>
      ),
      students: (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {cls.students && cls.students.length > 0 ? (
            cls.students.map((s) => (
              <span key={s.id} className="inline-flex items-center px-1.5 py-0.5 rounded-lg bg-surface-light border border-border text-[10px] font-semibold text-text-secondary">
                {s.first_name} {s.last_name[0]}.
              </span>
            ))
          ) : (
            <span className="text-[10px] text-text-secondary italic">None</span>
          )}
        </div>
      ),
      start: <span className="text-xs text-text-secondary">{dateStr}</span>,
      duration: <span className="text-xs text-text-secondary">{cls.duration_minutes} min</span>,
      type: (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
          cls.class_type === 'PRIVATE' 
            ? 'bg-amber-50 text-amber-700 border-amber-100' 
            : cls.class_type === 'BUDDY'
            ? 'bg-teal-50 text-teal-700 border-teal-100'
            : 'bg-blue-50 text-blue-700 border-blue-100'
        }`}>
          {cls.class_type}
        </span>
      ),
      status: (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[cls.status]}`}>
          {STATUS_LABELS[cls.status]}
        </span>
      ),
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
            className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-surface-dark font-bold rounded-xl text-sm transition-all shadow-gold"
          >
            Create New Class
          </button>
        }
      />

      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by coach name..."
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'ALL', label: 'All Statuses' },
              { value: 'SCHEDULED', label: 'Scheduled' },
              { value: 'LIVE', label: 'Live' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'RECORDING_AVAILABLE', label: 'Recording Available' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ],
          },
        ]}
      />

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <DashboardTable
          columns={columns}
          rows={rows}
          emptyTitle="No Classes Scheduled"
          emptyDescription="Schedule class sessions and map them to FIDE coaches to enable classroom links."
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
        title={editClass ? 'Edit Class' : 'Create New Class'}
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

            {/* Admin Custom Meeting URLs */}
            <div className="space-y-3 pt-1 border-t border-border/60">
              <div>
                <Input
                  id="zoom-join-url"
                  label="Meeting Join Link (Student & Coach Embedded Video Link)"
                  placeholder="https://zoom.us/j/123456789?pwd=... or custom embed link"
                  value={formData.zoomJoinUrl}
                  onChange={(e) => setFormData((p) => ({ ...p, zoomJoinUrl: e.target.value }))}
                />
                <p className="text-[10px] text-text-secondary mt-1">
                  💡 Admin decides the meeting link. Embedded directly inside the classroom so students stay on the website!
                </p>
              </div>

              <div>
                <Input
                  id="zoom-start-url"
                  label="Host Start Link (Admin/Coach Start Link - optional)"
                  placeholder="https://zoom.us/s/123456789?zak=... (Optional)"
                  value={formData.zoomStartUrl}
                  onChange={(e) => setFormData((p) => ({ ...p, zoomStartUrl: e.target.value }))}
                />
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
