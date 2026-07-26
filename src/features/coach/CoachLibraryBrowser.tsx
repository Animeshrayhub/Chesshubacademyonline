'use client';

import React, { useState, useTransition } from 'react';
import type {
  DbHomeworkLibraryTemplate,
  DbHomeworkCategory,
  DbHwCollection,
  DbHwCourse,
  HomeworkLevel,
  HomeworkDifficulty,
} from '@/lib/homework';
import {
  listHomeworkLibraryAction,
  assignTemplateAction,
  assignCollectionToStudentAction,
  assignCourseToStudentAction,
} from '@/actions/homework';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import Modal from '@/components/ui/Modal';

interface Student {
  id: string;
  name: string;
  level: string;
}

interface CoachLibraryBrowserProps {
  initialTemplates: DbHomeworkLibraryTemplate[];
  initialTotal: number;
  categories: DbHomeworkCategory[];
  collections: DbHwCollection[];
  courses: DbHwCourse[];
  students: Student[];
  coachProfileId: string;
}

type ActiveTab = 'templates' | 'collections' | 'courses';

const LEVEL_STYLES: Record<HomeworkLevel, string> = {
  BEGINNER:     'bg-green-50 text-green-700',
  INTERMEDIATE: 'bg-blue-50 text-blue-700',
  ADVANCED:     'bg-purple-50 text-purple-700',
};

const DIFF_EMOJI: Record<HomeworkDifficulty, string> = {
  easy: '⭐', medium: '⭐⭐', hard: '⭐⭐⭐', expert: '⭐⭐⭐⭐',
};

export default function CoachLibraryBrowser({
  initialTemplates,
  initialTotal,
  categories,
  collections,
  courses,
  students,
  coachProfileId,
}: CoachLibraryBrowserProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('templates');
  const [, startTransition] = useTransition();

  // Template state
  const [templates, setTemplates] = useState<DbHomeworkLibraryTemplate[]>(initialTemplates);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState<HomeworkLevel | ''>('');
  const [filterCategory, setFilterCategory] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const PAGE_SIZE = 20;

  // Assign modal
  const [assignTarget, setAssignTarget] = useState<{ type: 'template' | 'collection' | 'course'; id: string; title: string } | null>(null);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [coachNotes, setCoachNotes] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [assignSuccess, setAssignSuccess] = useState('');

  const fetchTemplates = async (opts?: { page?: number; search?: string; level?: string; categoryId?: string }) => {
    setLoading(true);
    const res = await listHomeworkLibraryAction({
      page: opts?.page ?? page,
      pageSize: PAGE_SIZE,
      search: (opts?.search ?? search) || undefined,
      level: (opts?.level ?? filterLevel) as HomeworkLevel | undefined,
      categoryId: (opts?.categoryId ?? filterCategory) || undefined,
      status: 'published',
    });
    setLoading(false);
    if (res.success && res.data) {
      setTemplates(res.data.templates);
      setTotal(res.data.total);
    }
  };

  const openAssign = (type: 'template' | 'collection' | 'course', id: string, title: string) => {
    setAssignTarget({ type, id, title });
    setSelectedStudent('');
    setDueAt('');
    setCoachNotes('');
    setAssignError('');
    setAssignSuccess('');
  };

  const handleAssign = async () => {
    if (!assignTarget || !selectedStudent) { setAssignError('Please select a student.'); return; }
    setAssigning(true);
    setAssignError('');

    let res: any;
    if (assignTarget.type === 'template') {
      res = await assignTemplateAction({
        templateId: assignTarget.id,
        studentProfileId: selectedStudent,
        coachProfileId,
        dueAt: dueAt || undefined,
        coachNotes: coachNotes || undefined,
      });
    } else if (assignTarget.type === 'collection') {
      res = await assignCollectionToStudentAction({
        collectionId: assignTarget.id,
        studentProfileId: selectedStudent,
        coachProfileId,
        dueAt: dueAt || undefined,
        coachNotes: coachNotes || undefined,
      });
    } else {
      res = await assignCourseToStudentAction({
        courseId: assignTarget.id,
        studentProfileId: selectedStudent,
        coachProfileId,
        coachNotes: coachNotes || undefined,
      });
    }

    setAssigning(false);
    if (!res.success) {
      setAssignError(res.error?.message ?? 'Failed to assign.');
      return;
    }
    const count = res.data?.count;
    setAssignSuccess(count != null ? `Assigned ${count} template(s) successfully!` : 'Assigned successfully!');
    setTimeout(() => setAssignTarget(null), 1800);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const TABS: { key: ActiveTab; label: string; count: number }[] = [
    { key: 'templates',   label: '📚 Templates',   count: total },
    { key: 'collections', label: '🗂️ Collections',  count: collections.length },
    { key: 'courses',     label: '🎓 Courses',       count: courses.length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Homework Library"
        subtitle="Browse published homework templates and assign them directly to your students."
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-light rounded-xl p-1 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.key}
            id={`coach-lib-tab-${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* ── Templates ── */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <input
              id="coach-lib-search"
              type="search"
              placeholder="Search templates…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchTemplates({ search: e.currentTarget.value, page: 1 })}
              className="w-60 px-4 py-2.5 text-sm rounded-lg border border-border bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            />
            <select
              id="coach-lib-level"
              value={filterLevel}
              onChange={e => { setFilterLevel(e.target.value as HomeworkLevel | ''); fetchTemplates({ level: e.target.value, page: 1 }); }}
              className="px-3 py-2.5 text-sm rounded-lg border border-border bg-white focus:border-primary outline-none"
            >
              <option value="">All Levels</option>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
            <select
              id="coach-lib-category"
              value={filterCategory}
              onChange={e => { setFilterCategory(e.target.value); fetchTemplates({ categoryId: e.target.value, page: 1 }); }}
              className="px-3 py-2.5 text-sm rounded-lg border border-border bg-white focus:border-primary outline-none"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button
              onClick={() => fetchTemplates()}
              className="px-4 py-2.5 text-sm rounded-lg border border-border bg-white hover:bg-surface-light transition-colors"
            >
              Refresh
            </button>
          </div>

          {loading && <div className="text-center py-12 text-text-secondary text-sm animate-pulse">Loading…</div>}

          {!loading && templates.length === 0 && (
            <div className="text-center py-16 text-text-secondary">
              <p className="text-4xl mb-2">📚</p>
              <p className="text-sm">No published templates yet. Ask your admin to publish some!</p>
            </div>
          )}

          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {templates.map(tpl => (
                <div key={tpl.id} className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all flex flex-col">
                  <h3 className="font-semibold text-text-primary text-sm leading-snug mb-2 line-clamp-2">{tpl.title}</h3>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${LEVEL_STYLES[tpl.level]}`}>{tpl.level}</span>
                    <span className="text-xs text-text-secondary">{DIFF_EMOJI[tpl.difficulty]} {tpl.difficulty}</span>
                    {tpl.estimated_time && <span className="text-xs text-text-secondary">⏱ {tpl.estimated_time}m</span>}
                  </div>
                  {tpl.description && <p className="text-xs text-text-secondary line-clamp-2 mb-3">{tpl.description}</p>}
                  {tpl.category_name && <p className="text-xs text-text-secondary mb-1">📁 {tpl.category_name}</p>}
                  {(tpl.tags ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {(tpl.tags ?? []).slice(0, 3).map(tag => (
                        <span key={tag} className="text-xs bg-surface-light text-text-secondary px-1.5 py-0.5 rounded">{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="mt-auto pt-3 border-t border-border">
                    <button
                      id={`coach-assign-tpl-${tpl.id}`}
                      onClick={() => openAssign('template', tpl.id, tpl.title)}
                      className="w-full px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors font-medium"
                    >
                      Assign to Student
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center gap-2 justify-center pt-4">
              <button
                disabled={page <= 1}
                onClick={() => { const p = page - 1; setPage(p); fetchTemplates({ page: p }); }}
                className="px-3 py-1.5 text-sm rounded-lg border border-border disabled:opacity-40 hover:bg-surface-light transition-colors"
              >← Prev</button>
              <span className="text-sm text-text-secondary">Page {page} of {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => { const p = page + 1; setPage(p); fetchTemplates({ page: p }); }}
                className="px-3 py-1.5 text-sm rounded-lg border border-border disabled:opacity-40 hover:bg-surface-light transition-colors"
              >Next →</button>
            </div>
          )}
        </div>
      )}

      {/* ── Collections ── */}
      {activeTab === 'collections' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {collections.length === 0 && (
            <div className="col-span-full text-center py-16 text-text-secondary">
              <p className="text-4xl mb-2">🗂️</p>
              <p className="text-sm">No collections available yet.</p>
            </div>
          )}
          {collections.map(coll => (
            <div key={coll.id} className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all flex flex-col">
              <h3 className="font-semibold text-text-primary text-base mb-1">{coll.title}</h3>
              {coll.description && <p className="text-sm text-text-secondary line-clamp-2 mb-3">{coll.description}</p>}
              <p className="text-xs text-text-secondary mb-4">📄 {coll.item_count ?? 0} templates</p>
              <div className="mt-auto">
                <button
                  id={`coach-assign-coll-${coll.id}`}
                  onClick={() => openAssign('collection', coll.id, coll.title)}
                  className="w-full px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors font-medium"
                >
                  Assign Collection
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Courses ── */}
      {activeTab === 'courses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {courses.length === 0 && (
            <div className="col-span-full text-center py-16 text-text-secondary">
              <p className="text-4xl mb-2">🎓</p>
              <p className="text-sm">No courses available yet.</p>
            </div>
          )}
          {courses.map(course => (
            <div key={course.id} className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all flex flex-col">
              <h3 className="font-semibold text-text-primary text-base mb-1">{course.title}</h3>
              <div className="flex gap-2 mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${LEVEL_STYLES[course.level]}`}>{course.level}</span>
              </div>
              {course.description && <p className="text-sm text-text-secondary line-clamp-2 mb-3">{course.description}</p>}
              <p className="text-xs text-text-secondary mb-4">🗂️ {course.collection_count ?? 0} collections</p>
              <div className="mt-auto">
                <button
                  id={`coach-assign-course-${course.id}`}
                  onClick={() => openAssign('course', course.id, course.title)}
                  className="w-full px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors font-medium"
                >
                  Assign Course
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Assign Modal ── */}
      <Modal
        isOpen={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        title={`Assign: ${assignTarget?.title ?? ''}`}
        maxWidthClass="max-w-lg"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-primary">Student <span className="text-red-500">*</span></label>
            <select
              id="assign-student-select"
              value={selectedStudent}
              onChange={e => setSelectedStudent(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 text-sm rounded-lg border border-border focus:border-primary outline-none"
            >
              <option value="">Select student…</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.level})</option>
              ))}
            </select>
          </div>
          {assignTarget?.type !== 'course' && (
            <div>
              <label className="text-sm font-medium text-text-primary">Due Date (optional)</label>
              <input
                type="date"
                value={dueAt}
                onChange={e => setDueAt(e.target.value)}
                className="mt-1 w-full px-4 py-2.5 text-sm rounded-lg border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-text-primary">Coach Notes (optional)</label>
            <textarea
              value={coachNotes}
              onChange={e => setCoachNotes(e.target.value)}
              rows={2}
              placeholder="Add any notes or instructions for the student…"
              className="mt-1 w-full px-4 py-3 text-sm rounded-lg border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          {assignError && <p className="text-xs text-red-500">{assignError}</p>}
          {assignSuccess && <p className="text-xs text-emerald-600 font-medium">{assignSuccess}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setAssignTarget(null)} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-surface-light transition-colors">Cancel</button>
            <button
              id="btn-confirm-assign"
              disabled={assigning || !selectedStudent}
              onClick={handleAssign}
              className="px-5 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors font-medium disabled:opacity-50"
            >
              {assigning ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
