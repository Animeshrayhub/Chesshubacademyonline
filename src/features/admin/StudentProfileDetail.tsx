'use client';

import React, { useState, useTransition } from 'react';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import StatusBadge from '@/components/dashboard/ui/StatusBadge';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';

import { updateStudentProfileAction, transferStudentAction } from '@/actions/students';
import { removeCoachAssignmentAction } from '@/actions/coaches';
import { syncStudentLichessAction } from '@/actions/lichess';
import { enrollStudentAction, unenrollStudentAction } from '@/actions/homework';
import { formatShortDate } from '@/utils/formatDate';

import type { AdminStudentRow, AdminCoachRow, StudentLevel } from '@/types/dashboard';

const LEVEL_OPTIONS = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

interface StudentProfileDetailProps {
  student: AdminStudentRow;
  coaches: AdminCoachRow[];
  enrollments: any[];
  courses: any[];
}

export default function StudentProfileDetail({ student, coaches, enrollments, courses }: StudentProfileDetailProps) {
  const [, startTransition] = useTransition();

  // Extract JSON configuration from student notes
  const getNotesData = () => {
    try {
      const parsed = JSON.parse(student.profile?.notes || '');
      return {
        text: parsed.text || '',
        fideRating: parsed.fideRating ? String(parsed.fideRating) : '',
        country: parsed.country || '',
        emergencyContact: parsed.emergencyContact || '',
        lichess: parsed.lichess || null,
      };
    } catch (e) {
      return {
        text: student.profile?.notes || '',
        fideRating: '',
        country: '',
        emergencyContact: '',
        lichess: null,
      };
    }
  };

  const notesData = getNotesData();

  const [selectedCoachId, setSelectedCoachId] = useState(student.assigned_coach?.id || '');
  const [age, setAge] = useState(String(student.profile?.age ?? 10));
  const [level, setLevel] = useState<StudentLevel>(student.profile?.level ?? 'BEGINNER');
  const [parentName, setParentName] = useState(student.profile?.parent_name ?? '');
  const [parentWhatsapp, setParentWhatsapp] = useState(student.profile?.parent_whatsapp ?? '');
  
  // Custom metadata fields
  const [notes, setNotes] = useState(notesData.text);
  const [fideRating, setFideRating] = useState(notesData.fideRating);
  const [country, setCountry] = useState(notesData.country);
  const [emergencyContact, setEmergencyContact] = useState(notesData.emergencyContact);
  const [lichessUsername, setLichessUsername] = useState(notesData.lichess?.username || '');
  const [lichessData] = useState<any>(notesData.lichess);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  // Course enrollment state
  const [selectedEnrollCourseId, setSelectedEnrollCourseId] = useState('');
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [unenrollLoadingId, setUnenrollLoadingId] = useState('');

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetProfileId = student.profile?.id || student.id;
    if (!selectedEnrollCourseId || !targetProfileId) return;
    setEnrollLoading(true);
    setMessage(null);
    const res = await enrollStudentAction(targetProfileId, selectedEnrollCourseId);
    setEnrollLoading(false);
    if (res.success) {
      setSelectedEnrollCourseId('');
      setMessage({ type: 'success', text: 'Student enrolled in course successfully.' });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      setMessage({ type: 'error', text: res.error?.message || 'Failed to enroll student.' });
    }
  };

  const handleUnenrollStudent = async (courseId: string) => {
    const targetProfileId = student.profile?.id || student.id;
    if (!targetProfileId) return;
    if (!confirm('Are you sure you want to unenroll the student from this course? This will remove all unlocked homework progress.')) return;
    setUnenrollLoadingId(courseId);
    setMessage(null);
    const res = await unenrollStudentAction(targetProfileId, courseId);
    setUnenrollLoadingId('');
    if (res.success) {
      setMessage({ type: 'success', text: 'Student unenrolled from course successfully.' });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      setMessage({ type: 'error', text: res.error?.message || 'Failed to unenroll student.' });
    }
  };

  const coachOptions = [
    { value: '', label: 'Select a Coach to Assign...' },
    ...coaches.map((c) => ({
      value: c.id,
      label: `GM/Coach ${c.first_name} ${c.last_name} (${c.assigned_student_count} Students)`,
    })),
  ];

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setMessage(null);

    const serializedNotes = JSON.stringify({
      text: notes,
      fideRating: fideRating ? parseInt(fideRating, 10) : null,
      country,
      emergencyContact,
      lichess: lichessData,
    });

    const res = await updateStudentProfileAction(student.id, {
      age: parseInt(age, 10) || 10,
      level,
      parentName,
      parentWhatsapp,
      notes: serializedNotes,
    });

    setSaveLoading(false);
    if (res.success) {
      setMessage({ type: 'success', text: 'Student profile details updated successfully.' });
    } else {
      setMessage({ type: 'error', text: res.error?.message || 'Failed to update details.' });
    }
  };

  const handleSyncLichess = async () => {
    if (!lichessUsername) {
      setMessage({ type: 'error', text: 'Please enter a Lichess username.' });
      return;
    }
    setSyncLoading(true);
    setMessage(null);

    const res = await syncStudentLichessAction(student.id, lichessUsername.trim());
    setSyncLoading(false);
    if (res.success) {
      setMessage({ type: 'success', text: 'Lichess stats synced successfully. Reloading profile...' });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      setMessage({ type: 'error', text: res.error?.message || 'Sync failed.' });
    }
  };

  const handleAssignCoach = async () => {
    if (!selectedCoachId) return;
    setAssignLoading(true);
    const res = await transferStudentAction(student.id, selectedCoachId);
    setAssignLoading(false);
    if (res.success) {
      setMessage({ type: 'success', text: 'Coach assigned successfully.' });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      setMessage({ type: 'error', text: res.error?.message || 'Assignment failed.' });
    }
  };

  const handleRemoveCoach = async () => {
    setAssignLoading(true);
    const res = await removeCoachAssignmentAction(student.id, student.assigned_coach?.id);
    setAssignLoading(false);
    if (res.success) {
      setSelectedCoachId('');
      setMessage({ type: 'success', text: 'Coach assignment removed.' });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      setMessage({ type: 'error', text: res.error?.message || 'Failed to remove coach.' });
    }
  };

  let status = 'active';
  if (student.archived_at) status = 'archived';
  else if (!student.is_active) status = 'disabled';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Student Profile: ${student.first_name} ${student.last_name}`}
        subtitle={`Track skill level settings, contact info, and manage coach assignment for ${student.first_name}.`}
      />

      {message && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold ${
            message.type === 'success'
              ? 'bg-green-50 border-green-100 text-green-700'
              : 'bg-red-50 border-red-100 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-border p-6 space-y-6 h-fit">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-24 h-24 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-3xl font-bold font-heading">
              {student.first_name.charAt(0)}
              {student.last_name.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-lg">
                {student.first_name} {student.last_name}
              </h3>
              <p className="text-xs text-text-secondary">{student.email}</p>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <StatusBadge status={status} />
              <span className="text-xs font-semibold bg-green-50 text-green-700 px-2 py-0.5 border border-green-100 rounded-full">
                {level}
              </span>
            </div>
          </div>

          {/* Lichess Stats Dashboard Block */}
          {lichessData && (
            <div className="pt-6 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Lichess Profile</h4>
                <span className="text-[10px] text-text-secondary">@{lichessData.username}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs bg-surface-light border border-border p-3 rounded-xl">
                <div>Puzzle: <span className="font-bold text-text-primary">{lichessData.ratings?.puzzle ?? '—'}</span></div>
                <div>Rapid: <span className="font-bold text-text-primary">{lichessData.ratings?.rapid ?? '—'}</span></div>
                <div>Blitz: <span className="font-bold text-text-primary">{lichessData.ratings?.blitz ?? '—'}</span></div>
                <div>Classical: <span className="font-bold text-text-primary">{lichessData.ratings?.classical ?? '—'}</span></div>
                <div className="col-span-2 pt-1.5 border-t border-border/60 text-[9px] text-text-secondary">
                  Total Games: {lichessData.gamesCount}
                </div>
              </div>
            </div>
          )}

          {/* Coach Assignment */}
          <div className="pt-6 border-t border-border space-y-4">
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Coach Assignment</h4>
            {student.assigned_coach ? (
              <div className="p-3 bg-surface-light border border-border rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-primary">
                    Coach {student.assigned_coach.first_name} {student.assigned_coach.last_name}
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveCoach}
                    disabled={assignLoading}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold"
                  >
                    Remove
                  </button>
                </div>
                <p className="text-[10px] text-text-secondary">
                  Classroom rosters and homework logs are synced automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-text-secondary italic">No coach assigned yet.</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <select
                      id="assign-coach-select"
                      value={selectedCoachId}
                      onChange={(e) => setSelectedCoachId(e.target.value)}
                      className="block w-full text-xs font-semibold text-text-primary bg-white border border-border rounded-xl px-3 py-2 pr-8 focus:outline-none cursor-pointer"
                    >
                      {coachOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleAssignCoach}
                    disabled={!selectedCoachId || assignLoading}
                    className="px-3.5 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    Assign
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-text-primary border-b border-border pb-3 mb-5">
              Student Settings & Profile Metadata
            </h3>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  id="spd-age"
                  label="Student Age"
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                />
                <Select
                  id="spd-level"
                  label="Skill Level Track"
                  options={LEVEL_OPTIONS}
                  value={level}
                  onChange={(e) => setLevel(e.target.value as StudentLevel)}
                />
                <Input
                  id="spd-parentName"
                  label="Parent Name"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  required
                />
                <Input
                  id="spd-parentWhatsapp"
                  label="Parent Phone / WhatsApp"
                  value={parentWhatsapp}
                  onChange={(e) => setParentWhatsapp(e.target.value)}
                  required
                />
                
                {/* Custom Metadata Fields */}
                <Input
                  id="spd-fideRating"
                  label="Current Chess Rating (optional)"
                  type="number"
                  placeholder="1200"
                  value={fideRating}
                  onChange={(e) => setFideRating(e.target.value)}
                />
                <Input
                  id="spd-country"
                  label="Country (optional)"
                  placeholder="United States"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
                <div className="sm:col-span-2">
                  <Input
                    id="spd-emergencyContact"
                    label="Emergency Contact (optional)"
                    placeholder="Grandparent Name, +1 (555) 333-4444"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <Textarea
                    id="spd-notes"
                    label="Private Academic Notes"
                    placeholder="Goals, preferences, opening training priorities..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <Button type="submit" variant="gold" loading={saveLoading} className="px-6 text-sm font-bold shadow-gold">
                  Save Settings
                </Button>
              </div>
            </form>
          </div>

          {/* Lichess Username Sync Form */}
          <div className="pt-6 border-t border-border space-y-4">
            <h4 className="text-sm font-bold text-text-primary">Lichess Account Integration</h4>
            <p className="text-xs text-text-secondary">
              Link the student&apos;s Lichess account to automatically pull ratings, puzzle histories, and game summaries into their profile view.
            </p>
            <div className="flex items-end gap-3 max-w-md">
              <div className="flex-1">
                <Input
                  id="spd-lichess-user"
                  label="Lichess Username"
                  placeholder="e.g. Magnuscarlsen"
                  value={lichessUsername}
                  onChange={(e) => setLichessUsername(e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="gold"
                loading={syncLoading}
                onClick={handleSyncLichess}
                className="px-5 py-2.5 text-xs font-bold border border-gold"
              >
                Sync Ratings
              </Button>
            </div>
          </div>

          {/* Course Enrollments & Curriculum Tracks */}
          <div className="pt-6 border-t border-border space-y-4">
            <h4 className="text-sm font-bold text-text-primary">Course Enrollments & Curriculum Tracks</h4>
            <p className="text-xs text-text-secondary">
              Enroll the student in learning courses and curriculums. Unenrolled courses will not show up in the student&apos;s learning workspace.
            </p>

            {/* Active Enrollments list */}
            {enrollments.length > 0 ? (
              <div className="space-y-3">
                {enrollments.map((enroll) => (
                  <div
                    key={enroll.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 border border-border rounded-2xl"
                  >
                    <div>
                      <h5 className="text-xs font-bold text-text-primary">
                        {enroll.courseTitle}
                      </h5>
                      <div className="flex gap-2 mt-1">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wide">
                          {enroll.track} Track
                        </span>
                        <span className="text-[10px] text-text-secondary">
                          Enrolled on {formatShortDate(enroll.enrolledAt)}
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      loading={unenrollLoadingId === enroll.courseId}
                      onClick={() => handleUnenrollStudent(enroll.courseId)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100 hover:border-red-200 self-end sm:self-center font-bold"
                    >
                      Drop Course
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-slate-50 border border-dashed border-border rounded-2xl text-center text-xs text-text-secondary italic">
                No active course enrollments yet.
              </div>
            )}

            {/* Enroll New Course Form */}
            {(() => {
              const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));
              const availableCourses = courses.filter((c) => !enrolledCourseIds.has(c.id));
              
              if (availableCourses.length === 0) return null;

              return (
                <form onSubmit={handleEnrollStudent} className="pt-4 border-t border-border/60 space-y-3">
                  <h5 className="text-xs font-bold text-text-primary">Enroll in a New Course</h5>
                  <div className="flex items-end gap-3 max-w-md">
                    <div className="flex-1">
                      <select
                        id="enroll-course-select"
                        value={selectedEnrollCourseId}
                        onChange={(e) => setSelectedEnrollCourseId(e.target.value)}
                        className="block w-full text-xs font-semibold text-text-primary bg-white border border-border rounded-xl px-3 py-2.5 focus:outline-none cursor-pointer"
                        required
                      >
                        <option value="">Select a course (workbook)...</option>
                        {availableCourses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title} ({c.track})
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      type="submit"
                      variant="gold"
                      loading={enrollLoading}
                      disabled={!selectedEnrollCourseId}
                      className="px-5 py-2.5 text-xs font-bold border border-gold"
                    >
                      Enroll Student
                    </Button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
