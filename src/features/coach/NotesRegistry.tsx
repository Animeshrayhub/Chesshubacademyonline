'use client';

import React, { useState, useTransition } from 'react';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import Modal from '@/components/ui/Modal';
import Textarea from '@/components/ui/Textarea';
import { saveStudentNoteServerAction } from '@/actions/coaches';
import type { TableColumn } from '@/types/dashboard';

interface NotesRegistryProps {
  students: Array<{
    profileId: string;
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    notes: string | null;
  }>;
}

const COLUMNS: TableColumn[] = [
  { key: 'student', label: 'Student Profile' },
  { key: 'email', label: 'Student Email' },
  { key: 'notes', label: 'Lesson Study Notes' },
  { key: 'action', label: 'Actions' },
];

export default function NotesRegistry({ students }: NotesRegistryProps) {
  const [search, setSearch] = useState('');
  const [editingStudent, setEditingStudent] = useState<typeof students[0] | null>(null);
  const [notesText, setNotesText] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const filtered = students.filter(
    (s) =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleEditClick = (student: typeof students[0]) => {
    setEditingStudent(student);
    setNotesText(student.notes || '');
    setSuccess(false);
    setError('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    setError('');
    setSuccess(false);

    startTransition(async () => {
      const res = await saveStudentNoteServerAction(editingStudent.profileId, notesText);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          setEditingStudent(null);
        }, 1000);
      } else {
        setError(res.error?.message || 'Failed to save student notes.');
      }
    });
  };

  const rows = filtered.map((s) => ({
    student: <span className="font-semibold text-text-primary">{s.firstName} {s.lastName}</span>,
    email: <span className="text-text-secondary text-xs">{s.email}</span>,
    notes: (
      <span className="text-text-secondary text-xs line-clamp-2 max-w-md">
        {s.notes || <span className="italic text-slate-400">No study notes recorded.</span>}
      </span>
    ),
    action: (
      <button
        type="button"
        onClick={() => handleEditClick(s)}
        className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white rounded-lg text-xs font-bold transition-all"
      >
        Update Notes
      </button>
    ),
  }));

  return (
    <div className="space-y-6">
      <TableSearchBar
        placeholder="Filter student study cohort..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      <DashboardTable
        columns={COLUMNS}
        rows={rows}
        emptyTitle="No Students Assigned"
        emptyDescription="Once students are assigned to you by the administrator, their study profiles will show here."
        caption="Student Lesson Study Notes"
      />

      <Modal
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        title={`Update Study Notes: ${editingStudent?.firstName} ${editingStudent?.lastName}`}
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {success && (
            <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-xs font-semibold text-green-700">
              Notes saved successfully!
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600">
              {error}
            </div>
          )}

          <Textarea
            id="student-notes"
            label="Lesson Notes & Tactical Feedback"
            placeholder="Record positional weaknesses, opening preparation notes, puzzle review observations, etc..."
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            rows={6}
            required
          />

          <div className="flex justify-end gap-2.5 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setEditingStudent(null)}
              className="px-4 py-2 border border-border hover:bg-surface-light rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Save Study Notes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
