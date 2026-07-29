'use client';

import React, { useState } from 'react';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import TableActions from '@/components/dashboard/ui/TableActions';
import type { AdminClassRow } from '@/lib/classes';
import type { AdminCoachRow, AdminStudentRow } from '@/types/dashboard';
import AdminRecordingPlayerModal from '@/features/admin/AdminRecordingPlayerModal';
import { updateClassAction } from '@/actions/classes';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';

interface AdminRecordingsArchiveClientProps {
  classes: AdminClassRow[];
  coaches: AdminCoachRow[];
  students: AdminStudentRow[];
}

export default function AdminRecordingsArchiveClient({
  classes,
  coaches,
  students,
}: AdminRecordingsArchiveClientProps) {
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState<AdminClassRow | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [editClass, setEditClass] = useState<AdminClassRow | null>(null);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [saving, setSaving] = useState(false);

  // Filter classes that have a recording or are completed/recording available
  const recordedClasses = classes.filter((c) => {
    const coachName = c.coach ? `${c.coach.first_name} ${c.coach.last_name}`.toLowerCase() : '';
    const studentNames = c.students ? c.students.map((s) => `${s.first_name} ${s.last_name}`.toLowerCase()).join(' ') : '';
    const searchMatch = !search || coachName.includes(search.toLowerCase()) || studentNames.includes(search.toLowerCase());
    return searchMatch;
  });

  const handleSaveRecording = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClass) return;
    setSaving(true);
    const res = await updateClassAction(editClass.id, {
      recordingUrl: recordingUrl || undefined,
      status: recordingUrl ? 'RECORDING_AVAILABLE' : editClass.status,
    });
    setSaving(false);
    if (res.success) {
      setEditClass(null);
      setRecordingUrl('');
    } else {
      alert(res.error?.message || 'Failed to update recording URL.');
    }
  };

  const columns = [
    { key: 'session', label: 'Class Session Title' },
    { key: 'coach', label: 'Coach' },
    { key: 'students', label: 'Students' },
    { key: 'date', label: 'Recorded Date' },
    { key: 'status', label: 'Recording Status' },
    { key: 'actions', label: 'Actions' },
  ];

  const rows = recordedClasses.map((cls) => {
    const dateStr = cls.scheduled_start
      ? new Date(cls.scheduled_start).toLocaleDateString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : 'N/A';

    const coachName = cls.coach ? `${cls.coach.first_name} ${cls.coach.last_name}` : 'Assigned Coach';

    return {
      session: (
        <div>
          <span className="font-bold text-text-primary text-xs block">
            {cls.class_type} Lesson #{cls.id.substring(0, 6)}
          </span>
          <span className="text-[10px] text-text-secondary uppercase font-mono">{cls.duration_minutes} Minutes</span>
        </div>
      ),
      coach: <span className="font-semibold text-text-primary text-xs">{coachName}</span>,
      students: (
        <span className="text-xs text-text-primary">
          {cls.students && cls.students.length > 0
            ? cls.students.map((s) => `${s.first_name} ${s.last_name}`).join(', ')
            : 'No students assigned'}
        </span>
      ),
      date: <span className="text-text-secondary text-xs">{dateStr}</span>,
      status: cls.recording_url ? (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
          📹 Recording Published
        </span>
      ) : (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          ⏳ Pending Link
        </span>
      ),
      actions: (
        <TableActions
          actions={[
            {
              label: '▶️ Play Recording',
              iconKey: 'video',
              onClick: () => {
                setSelectedClass(cls);
                setIsPlayerOpen(true);
              },
            },
            {
              label: '✏️ Edit Recording Link',
              iconKey: 'pencil',
              onClick: () => {
                setEditClass(cls);
                setRecordingUrl(cls.recording_url || '');
              },
            },
          ]}
        />
      ),
    };
  });

  return (
    <div className="space-y-4">
      <TableSearchBar
        placeholder="Search recordings by coach name or student name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      <DashboardTable
        columns={columns}
        rows={rows}
        emptyTitle="No Class Recordings Found"
        emptyDescription="No class session recordings match your search filter."
      />

      {/* Video Player Modal */}
      <AdminRecordingPlayerModal
        isOpen={isPlayerOpen}
        onClose={() => { setIsPlayerOpen(false); setSelectedClass(null); }}
        classData={selectedClass}
        onEditRecordingLink={(cls) => {
          setEditClass(cls);
          setRecordingUrl(cls.recording_url || '');
        }}
      />

      {/* Edit Recording Modal */}
      {editClass && (
        <Modal
          isOpen={!!editClass}
          onClose={() => setEditClass(null)}
          title="Attach / Edit Class Recording Link"
          maxWidthClass="max-w-md"
        >
          <form onSubmit={handleSaveRecording} className="space-y-4">
            <p className="text-xs text-text-secondary">
              Paste the Google Drive, Zoom Cloud, MP4 stream, or YouTube unlisted video URL for this session.
            </p>

            <Input
              id="edit-rec-url"
              label="Class Recording Video URL"
              placeholder="https://drive.google.com/file/d/... or https://..."
              value={recordingUrl}
              onChange={(e) => setRecordingUrl(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditClass(null)}
                className="px-4 py-2 border border-border hover:bg-surface-light rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Recording Link'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
