'use client';

import React, { useState, useTransition, useCallback } from 'react';
import type {
  DbHomeworkLibraryTemplate,
  DbHomeworkCategory,
  DbHomeworkTheme,
  DbHwCollection,
  DbHwCourse,
  HomeworkLevel,
  HomeworkStatus,
  HomeworkDifficulty,
  CreateTemplateInput,
  CreateCollectionInput,
  CreateCourseInput,
} from '@/lib/homework';
import {
  listHomeworkLibraryAction,
  createHomeworkTemplateAction,
  updateHomeworkTemplateAction,
  publishHomeworkTemplateAction,
  archiveHomeworkTemplateAction,
  duplicateHomeworkTemplateAction,
  deleteHomeworkTemplateAction,
  createCategoryAction,
  deleteCategoryAction,
  createThemeAction,
  deleteThemeAction,
  createHwCollectionAction,
  updateHwCollectionAction,
  deleteHwCollectionAction,
  addTemplateToCollectionAction,
  removeTemplateFromCollectionAction,
  getCollectionWithTemplatesAction,
  createHwCourseAction,
  updateHwCourseAction,
  deleteHwCourseAction,
  addCollectionToCourseAction,
  removeCollectionFromCourseAction,
} from '@/actions/homework';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import ConfirmationModal from '@/components/dashboard/ui/ConfirmationModal';
import HomeworkTemplateEditor from './HomeworkTemplateEditor';

interface HomeworkLibraryRegistryProps {
  initialTemplates: DbHomeworkLibraryTemplate[];
  initialTotal: number;
  categories: DbHomeworkCategory[];
  themes: DbHomeworkTheme[];
  collections: DbHwCollection[];
  courses: DbHwCourse[];
}

type ActiveTab = 'library' | 'collections' | 'courses' | 'categories';

const STATUS_STYLES: Record<HomeworkStatus, string> = {
  draft:     'bg-amber-50 text-amber-700 border border-amber-200',
  published: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  archived:  'bg-slate-100 text-slate-500 border border-slate-200',
};

const LEVEL_STYLES: Record<HomeworkLevel, string> = {
  BEGINNER:     'bg-green-50 text-green-700 border border-green-100',
  INTERMEDIATE: 'bg-blue-50 text-blue-700 border border-blue-100',
  ADVANCED:     'bg-purple-50 text-purple-700 border border-purple-100',
};

const DIFF_STYLES: Record<HomeworkDifficulty, string> = {
  easy:   'text-emerald-600',
  medium: 'text-amber-600',
  hard:   'text-red-500',
  expert: 'text-purple-600',
};

export default function HomeworkLibraryRegistry({
  initialTemplates,
  initialTotal,
  categories,
  themes,
  collections,
  courses,
}: HomeworkLibraryRegistryProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('library');
  const [, startTransition] = useTransition();

  // ── Library state ──
  const [templates, setTemplates] = useState<DbHomeworkLibraryTemplate[]>(initialTemplates);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState<HomeworkLevel | ''>('');
  const [filterStatus, setFilterStatus] = useState<HomeworkStatus | ''>('');
  const [filterCategory, setFilterCategory] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [loading, setLoading] = useState(false);

  // Template modals
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTemplateId, setEditorTemplateId] = useState<string | null>(null);
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [newTpl, setNewTpl] = useState<CreateTemplateInput>({ title: '', level: 'BEGINNER', difficulty: 'easy', estimatedTime: 30, tags: [] });
  const [tplFormError, setTplFormError] = useState('');
  const [deleteTpl, setDeleteTpl] = useState<DbHomeworkLibraryTemplate | null>(null);
  const [isPending, setPending] = useState(false);

  // ── Categories state ──
  const [cats, setCats] = useState<DbHomeworkCategory[]>(categories);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3B82F6');
  const [catError, setCatError] = useState('');

  // ── Themes state ──
  const [themesList, setThemesList] = useState<DbHomeworkTheme[]>(themes);
  const [newThemeName, setNewThemeName] = useState('');
  const [themeError, setThemeError] = useState('');

  // ── Collections state ──
  const [colls, setColls] = useState<DbHwCollection[]>(collections);
  const [collModal, setCollModal] = useState<'create' | 'edit' | null>(null);
  const [editColl, setEditColl] = useState<DbHwCollection | null>(null);
  const [collForm, setCollForm] = useState<CreateCollectionInput>({ title: '', description: '' });
  const [collError, setCollError] = useState('');
  const [deleteCollConfirm, setDeleteCollConfirm] = useState<DbHwCollection | null>(null);
  const [manageCollId, setManageCollId] = useState<string | null>(null);
  const [collTemplates, setCollTemplates] = useState<DbHomeworkLibraryTemplate[]>([]);
  const [addTplToCollId, setAddTplToCollId] = useState('');

  // ── Courses state ──
  const [crs, setCrs] = useState<DbHwCourse[]>(courses);
  const [courseModal, setCourseModal] = useState<'create' | 'edit' | null>(null);
  const [editCourse, setEditCourse] = useState<DbHwCourse | null>(null);
  const [courseForm, setCourseForm] = useState<CreateCourseInput>({ title: '', level: 'BEGINNER' });
  const [courseError, setCourseError] = useState('');
  const [deleteCourseConfirm, setDeleteCourseConfirm] = useState<DbHwCourse | null>(null);
  const [manageCourseId, setManageCourseId] = useState<string | null>(null);

  // ─── Fetch templates ─────────────────────────────────────────────────────────
  const fetchTemplates = useCallback(async (opts?: { page?: number; search?: string; level?: string; status?: string; categoryId?: string }) => {
    setLoading(true);
    const res = await listHomeworkLibraryAction({
      page: opts?.page ?? page,
      pageSize: PAGE_SIZE,
      search: (opts?.search ?? search) || undefined,
      level: (opts?.level ?? filterLevel) as HomeworkLevel | undefined,
      status: (opts?.status ?? filterStatus) as HomeworkStatus | undefined,
      categoryId: (opts?.categoryId ?? filterCategory) || undefined,
    });
    setLoading(false);
    if (res.success && res.data) {
      setTemplates(res.data.templates);
      setTotal(res.data.total);
    }
  }, [page, search, filterLevel, filterStatus, filterCategory]);

  // ─── Template handlers ───────────────────────────────────────────────────────
  const handleCreateTemplate = async () => {
    if (!newTpl.title.trim()) { setTplFormError('Title is required.'); return; }
    setPending(true);
    const res = await createHomeworkTemplateAction(newTpl);
    setPending(false);
    if (!res.success) { setTplFormError(res.error?.message ?? 'Failed'); return; }
    setCreateTemplateOpen(false);
    setNewTpl({ title: '', level: 'BEGINNER', difficulty: 'easy', estimatedTime: 30, tags: [] });
    setTplFormError('');
    fetchTemplates();
  };

  const handlePublish = (id: string) => {
    startTransition(async () => {
      await publishHomeworkTemplateAction(id);
      fetchTemplates();
    });
  };

  const handleArchive = (id: string) => {
    startTransition(async () => {
      await archiveHomeworkTemplateAction(id);
      fetchTemplates();
    });
  };

  const handleDuplicate = (id: string) => {
    startTransition(async () => {
      await duplicateHomeworkTemplateAction(id);
      fetchTemplates();
    });
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTpl) return;
    setPending(true);
    await deleteHomeworkTemplateAction(deleteTpl.id);
    setPending(false);
    setDeleteTpl(null);
    fetchTemplates();
  };

  // ─── Category handlers ───────────────────────────────────────────────────────
  const handleCreateCategory = async () => {
    if (!newCatName.trim()) { setCatError('Name required'); return; }
    const res = await createCategoryAction({ name: newCatName, color: newCatColor });
    if (!res.success) { setCatError(res.error?.message ?? 'Failed'); return; }
    setCats(prev => [...prev, res.data as DbHomeworkCategory]);
    setNewCatName(''); setNewCatColor('#3B82F6'); setCatError('');
  };

  const handleDeleteCategory = async (id: string) => {
    await deleteCategoryAction(id);
    setCats(prev => prev.filter(c => c.id !== id));
  };

  // ─── Theme handlers ──────────────────────────────────────────────────────────
  const handleCreateTheme = async () => {
    if (!newThemeName.trim()) { setThemeError('Name required'); return; }
    const res = await createThemeAction({ name: newThemeName });
    if (!res.success) { setThemeError(res.error?.message ?? 'Failed'); return; }
    setThemesList(prev => [...prev, res.data as DbHomeworkTheme]);
    setNewThemeName(''); setThemeError('');
  };

  const handleDeleteTheme = async (id: string) => {
    await deleteThemeAction(id);
    setThemesList(prev => prev.filter(t => t.id !== id));
  };

  // ─── Collection handlers ─────────────────────────────────────────────────────
  const handleSaveCollection = async () => {
    if (!collForm.title.trim()) { setCollError('Title required'); return; }
    if (collModal === 'edit' && editColl) {
      const res = await updateHwCollectionAction(editColl.id, collForm);
      if (!res.success) { setCollError(res.error?.message ?? 'Failed'); return; }
      setColls(prev => prev.map(c => c.id === editColl.id ? { ...c, ...collForm } : c));
    } else {
      const res = await createHwCollectionAction(collForm);
      if (!res.success) { setCollError(res.error?.message ?? 'Failed'); return; }
      setColls(prev => [res.data as DbHwCollection, ...prev]);
    }
    setCollModal(null); setCollError(''); setCollForm({ title: '', description: '' }); setEditColl(null);
  };

  const handleDeleteCollection = async () => {
    if (!deleteCollConfirm) return;
    await deleteHwCollectionAction(deleteCollConfirm.id);
    setColls(prev => prev.filter(c => c.id !== deleteCollConfirm.id));
    setDeleteCollConfirm(null);
  };

  const handleManageCollection = async (id: string) => {
    setManageCollId(id);
    const res = await getCollectionWithTemplatesAction(id);
    if (res.success && res.data) setCollTemplates((res.data as any).templates ?? []);
  };

  const handleAddTplToCollection = async () => {
    if (!manageCollId || !addTplToCollId) return;
    await addTemplateToCollectionAction(manageCollId, addTplToCollId);
    const res = await getCollectionWithTemplatesAction(manageCollId);
    if (res.success && res.data) setCollTemplates((res.data as any).templates ?? []);
    setAddTplToCollId('');
  };

  const handleRemoveTplFromCollection = async (templateId: string) => {
    if (!manageCollId) return;
    await removeTemplateFromCollectionAction(manageCollId, templateId);
    setCollTemplates(prev => prev.filter(t => t.id !== templateId));
  };

  // ─── Course handlers ─────────────────────────────────────────────────────────
  const handleSaveCourse = async () => {
    if (!courseForm.title.trim()) { setCourseError('Title required'); return; }
    if (courseModal === 'edit' && editCourse) {
      const res = await updateHwCourseAction(editCourse.id, courseForm);
      if (!res.success) { setCourseError(res.error?.message ?? 'Failed'); return; }
      setCrs(prev => prev.map(c => c.id === editCourse.id ? { ...c, ...courseForm } : c));
    } else {
      const res = await createHwCourseAction(courseForm);
      if (!res.success) { setCourseError(res.error?.message ?? 'Failed'); return; }
      setCrs(prev => [res.data as DbHwCourse, ...prev]);
    }
    setCourseModal(null); setCourseError(''); setCourseForm({ title: '', level: 'BEGINNER' }); setEditCourse(null);
  };

  const handleDeleteCourse = async () => {
    if (!deleteCourseConfirm) return;
    await deleteHwCourseAction(deleteCourseConfirm.id);
    setCrs(prev => prev.filter(c => c.id !== deleteCourseConfirm.id));
    setDeleteCourseConfirm(null);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const TABS: { key: ActiveTab; label: string; count?: number }[] = [
    { key: 'library',     label: '📚 Library',     count: total },
    { key: 'collections', label: '🗂️ Collections',  count: colls.length },
    { key: 'courses',     label: '🎓 Courses',       count: crs.length },
    { key: 'categories',  label: '🏷️ Categories & Themes' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Homework Library"
        subtitle="Create, manage, and organize permanent homework templates into collections and courses."
        action={
          activeTab === 'library' ? (
            <button
              id="btn-create-template"
              onClick={() => setCreateTemplateOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors shadow-sm"
            >
              + New Template
            </button>
          ) : activeTab === 'collections' ? (
            <button
              id="btn-create-collection"
              onClick={() => { setCollModal('create'); setCollForm({ title: '', description: '' }); }}
              className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors shadow-sm"
            >
              + New Collection
            </button>
          ) : activeTab === 'courses' ? (
            <button
              id="btn-create-course"
              onClick={() => { setCourseModal('create'); setCourseForm({ title: '', level: 'BEGINNER' }); }}
              className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors shadow-sm"
            >
              + New Course
            </button>
          ) : null
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-light rounded-xl p-1 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.key}
            id={`tab-${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Library Tab ── */}
      {activeTab === 'library' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <input
              id="lib-search"
              type="search"
              placeholder="Search templates…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchTemplates({ search: e.currentTarget.value, page: 1 })}
              className="w-64 px-4 py-2.5 text-sm rounded-lg border border-border bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            />
            <select
              id="lib-filter-level"
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
              id="lib-filter-status"
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value as HomeworkStatus | ''); fetchTemplates({ status: e.target.value, page: 1 }); }}
              className="px-3 py-2.5 text-sm rounded-lg border border-border bg-white focus:border-primary outline-none"
            >
              <option value="">Draft + Published</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            <select
              id="lib-filter-category"
              value={filterCategory}
              onChange={e => { setFilterCategory(e.target.value); fetchTemplates({ categoryId: e.target.value, page: 1 }); }}
              className="px-3 py-2.5 text-sm rounded-lg border border-border bg-white focus:border-primary outline-none"
            >
              <option value="">All Categories</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button
              onClick={() => fetchTemplates()}
              className="px-4 py-2.5 text-sm rounded-lg border border-border bg-white hover:bg-surface-light transition-colors"
            >
              Refresh
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12 text-text-secondary text-sm">Loading templates…</div>
          )}

          {!loading && templates.length === 0 && (
            <div className="text-center py-16 text-text-secondary">
              <p className="text-4xl mb-3">📚</p>
              <p className="font-medium">No templates found.</p>
              <p className="text-sm mt-1">Create your first homework template to get started.</p>
            </div>
          )}

          {!loading && templates.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {templates.map(tpl => (
                <TemplateCard
                  key={tpl.id}
                  template={tpl}
                  onEdit={() => { setEditorTemplateId(tpl.id); setEditorOpen(true); }}
                  onPublish={() => handlePublish(tpl.id)}
                  onArchive={() => handleArchive(tpl.id)}
                  onDuplicate={() => handleDuplicate(tpl.id)}
                  onDelete={() => setDeleteTpl(tpl)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2 justify-center pt-4">
              <button
                disabled={page <= 1}
                onClick={() => { const p = page - 1; setPage(p); fetchTemplates({ page: p }); }}
                className="px-3 py-1.5 text-sm rounded-lg border border-border disabled:opacity-40 hover:bg-surface-light transition-colors"
              >
                ← Prev
              </button>
              <span className="text-sm text-text-secondary">Page {page} of {totalPages} ({total} total)</span>
              <button
                disabled={page >= totalPages}
                onClick={() => { const p = page + 1; setPage(p); fetchTemplates({ page: p }); }}
                className="px-3 py-1.5 text-sm rounded-lg border border-border disabled:opacity-40 hover:bg-surface-light transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Collections Tab ── */}
      {activeTab === 'collections' && (
        <div className="space-y-4">
          {colls.length === 0 && (
            <div className="text-center py-16 text-text-secondary">
              <p className="text-4xl mb-3">🗂️</p>
              <p className="font-medium">No collections yet.</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {colls.map(coll => (
              <div key={coll.id} className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-text-primary text-base">{coll.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[coll.status]}`}>{coll.status}</span>
                </div>
                {coll.description && <p className="text-sm text-text-secondary mb-3 line-clamp-2">{coll.description}</p>}
                <p className="text-xs text-text-secondary mb-4">{coll.item_count ?? 0} templates</p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    id={`btn-manage-coll-${coll.id}`}
                    onClick={() => handleManageCollection(coll.id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                  >
                    Manage
                  </button>
                  <button
                    id={`btn-edit-coll-${coll.id}`}
                    onClick={() => { setEditColl(coll); setCollForm({ title: coll.title, description: coll.description ?? '' }); setCollModal('edit'); }}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-surface-light transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    id={`btn-del-coll-${coll.id}`}
                    onClick={() => setDeleteCollConfirm(coll)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Courses Tab ── */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          {crs.length === 0 && (
            <div className="text-center py-16 text-text-secondary">
              <p className="text-4xl mb-3">🎓</p>
              <p className="font-medium">No courses yet.</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {crs.map(course => (
              <div key={course.id} className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-text-primary text-base">{course.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[course.status]}`}>{course.status}</span>
                </div>
                <div className="flex gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${LEVEL_STYLES[course.level]}`}>{course.level}</span>
                </div>
                {course.description && <p className="text-sm text-text-secondary mb-3 line-clamp-2">{course.description}</p>}
                <p className="text-xs text-text-secondary mb-4">{course.collection_count ?? 0} collections</p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    id={`btn-manage-course-${course.id}`}
                    onClick={() => setManageCourseId(course.id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                  >
                    Manage
                  </button>
                  <button
                    id={`btn-edit-course-${course.id}`}
                    onClick={() => { setEditCourse(course); setCourseForm({ title: course.title, description: course.description ?? '', level: course.level }); setCourseModal('edit'); }}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-surface-light transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    id={`btn-del-course-${course.id}`}
                    onClick={() => setDeleteCourseConfirm(course)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Categories & Themes Tab ── */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Categories */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
            <h2 className="text-base font-semibold text-text-primary mb-4">Categories</h2>
            <div className="flex gap-2 mb-4">
              <input
                id="cat-name-input"
                type="text"
                placeholder="Category name…"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-border focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
              />
              <input type="color" value={newCatColor} onChange={e => setNewCatColor(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer" title="Pick color" />
              <button onClick={handleCreateCategory} className="px-3 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors">Add</button>
            </div>
            {catError && <p className="text-xs text-red-500 mb-2">{catError}</p>}
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {cats.map(cat => (
                <div key={cat.id} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm text-text-primary flex-1">{cat.name}</span>
                  <button onClick={() => handleDeleteCategory(cat.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">Remove</button>
                </div>
              ))}
              {cats.length === 0 && <p className="text-sm text-text-secondary text-center py-4">No categories yet.</p>}
            </div>
          </div>

          {/* Themes */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
            <h2 className="text-base font-semibold text-text-primary mb-4">Themes</h2>
            <div className="flex gap-2 mb-4">
              <input
                id="theme-name-input"
                type="text"
                placeholder="Theme name…"
                value={newThemeName}
                onChange={e => setNewThemeName(e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-border focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
              />
              <button onClick={handleCreateTheme} className="px-3 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors">Add</button>
            </div>
            {themeError && <p className="text-xs text-red-500 mb-2">{themeError}</p>}
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {themesList.map(theme => (
                <div key={theme.id} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                  <span className="text-sm text-text-primary flex-1">{theme.name}</span>
                  <button onClick={() => handleDeleteTheme(theme.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">Remove</button>
                </div>
              ))}
              {themesList.length === 0 && <p className="text-sm text-text-secondary text-center py-4">No themes yet.</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── Create Template Modal ── */}
      <Modal isOpen={createTemplateOpen} onClose={() => setCreateTemplateOpen(false)} title="Create New Template" maxWidthClass="max-w-lg">
        <div className="space-y-4">
          <Input id="tpl-title" label="Title" required value={newTpl.title} onChange={e => setNewTpl(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Fork and Pin — Beginner Set 1" />
          <div>
            <label className="text-sm font-medium text-text-primary">Description</label>
            <textarea
              value={newTpl.description ?? ''}
              onChange={e => setNewTpl(p => ({ ...p, description: e.target.value }))}
              rows={2}
              className="mt-1 w-full px-4 py-3 text-sm rounded-lg border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              placeholder="Short description…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-text-primary">Level</label>
              <select
                value={newTpl.level}
                onChange={e => setNewTpl(p => ({ ...p, level: e.target.value as HomeworkLevel }))}
                className="mt-1 w-full px-3 py-2.5 text-sm rounded-lg border border-border focus:border-primary outline-none"
              >
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary">Difficulty</label>
              <select
                value={newTpl.difficulty}
                onChange={e => setNewTpl(p => ({ ...p, difficulty: e.target.value as HomeworkDifficulty }))}
                className="mt-1 w-full px-3 py-2.5 text-sm rounded-lg border border-border focus:border-primary outline-none"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="expert">Expert</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-text-primary">Category</label>
              <select
                value={newTpl.categoryId ?? ''}
                onChange={e => setNewTpl(p => ({ ...p, categoryId: e.target.value || undefined }))}
                className="mt-1 w-full px-3 py-2.5 text-sm rounded-lg border border-border focus:border-primary outline-none"
              >
                <option value="">None</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary">Est. Time (min)</label>
              <input
                type="number"
                min={5}
                max={180}
                value={newTpl.estimatedTime ?? 30}
                onChange={e => setNewTpl(p => ({ ...p, estimatedTime: Number(e.target.value) }))}
                className="mt-1 w-full px-4 py-2.5 text-sm rounded-lg border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Tags (comma separated)</label>
            <input
              type="text"
              value={(newTpl.tags ?? []).join(', ')}
              onChange={e => setNewTpl(p => ({ ...p, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
              placeholder="fork, tactics, beginner"
              className="mt-1 w-full px-4 py-2.5 text-sm rounded-lg border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          {tplFormError && <p className="text-xs text-red-500">{tplFormError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setCreateTemplateOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-surface-light transition-colors">Cancel</button>
            <button
              id="btn-submit-create-template"
              disabled={isPending}
              onClick={handleCreateTemplate}
              className="px-5 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50 font-medium"
            >
              {isPending ? 'Creating…' : 'Create Template'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Template Editor (full-screen) ── */}
      {editorOpen && editorTemplateId && (
        <HomeworkTemplateEditor
          templateId={editorTemplateId}
          categories={cats}
          themes={themesList}
          onClose={() => { setEditorOpen(false); setEditorTemplateId(null); fetchTemplates(); }}
        />
      )}

      {/* ── Delete Template Confirmation ── */}
      <ConfirmationModal
        isOpen={!!deleteTpl}
        onCancel={() => setDeleteTpl(null)}
        onConfirm={handleDeleteTemplate}
        title="Delete Template"
        description={`Permanently delete "${deleteTpl?.title}"? This cannot be undone. Published templates cannot be deleted — archive them first.`}
        confirmLabel="Delete"
      />

      {/* ── Collection Create/Edit Modal ── */}
      <Modal isOpen={!!collModal} onClose={() => { setCollModal(null); setCollError(''); setEditColl(null); }} title={collModal === 'edit' ? 'Edit Collection' : 'Create Collection'} maxWidthClass="max-w-lg">
        <div className="space-y-4">
          <Input id="coll-title" label="Title" required value={collForm.title} onChange={e => setCollForm(p => ({ ...p, title: e.target.value }))} />
          <div>
            <label className="text-sm font-medium text-text-primary">Description</label>
            <textarea
              value={collForm.description ?? ''}
              onChange={e => setCollForm(p => ({ ...p, description: e.target.value }))}
              rows={2}
              className="mt-1 w-full px-4 py-3 text-sm rounded-lg border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          {collError && <p className="text-xs text-red-500">{collError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => { setCollModal(null); setCollError(''); }} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-surface-light transition-colors">Cancel</button>
            <button onClick={handleSaveCollection} className="px-5 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors font-medium">Save</button>
          </div>
        </div>
      </Modal>

      {/* ── Manage Collection Templates Modal ── */}
      <Modal isOpen={!!manageCollId} onClose={() => { setManageCollId(null); setCollTemplates([]); setAddTplToCollId(''); }} title="Manage Collection Templates" maxWidthClass="max-w-2xl">
        <div className="space-y-4">
          <div className="flex gap-2">
            <select
              id="add-tpl-to-coll-select"
              value={addTplToCollId}
              onChange={e => setAddTplToCollId(e.target.value)}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-border focus:border-primary outline-none"
            >
              <option value="">Select a published template to add…</option>
              {templates.filter(t => t.status === 'published' && !collTemplates.find(ct => ct.id === t.id)).map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
            <button onClick={handleAddTplToCollection} disabled={!addTplToCollId} className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-40 font-medium">Add</button>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {collTemplates.length === 0 && <p className="text-sm text-center text-text-secondary py-8">No templates in this collection yet.</p>}
            {collTemplates.map((t, idx) => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface-light">
                <span className="text-xs text-text-secondary w-5">{idx + 1}.</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">{t.title}</p>
                  <p className="text-xs text-text-secondary capitalize">{t.level?.toLowerCase()} · {t.difficulty}</p>
                </div>
                <button onClick={() => handleRemoveTplFromCollection(t.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">Remove</button>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* ── Delete Collection Confirmation ── */}
      <ConfirmationModal
        isOpen={!!deleteCollConfirm}
        onCancel={() => setDeleteCollConfirm(null)}
        onConfirm={handleDeleteCollection}
        title="Delete Collection"
        description={`Delete "${deleteCollConfirm?.title}"? Templates in the collection will not be deleted.`}
        confirmLabel="Delete"
      />

      {/* ── Course Create/Edit Modal ── */}
      <Modal isOpen={!!courseModal} onClose={() => { setCourseModal(null); setCourseError(''); setEditCourse(null); }} title={courseModal === 'edit' ? 'Edit Course' : 'Create Course'} maxWidthClass="max-w-lg">
        <div className="space-y-4">
          <Input id="course-title" label="Title" required value={courseForm.title} onChange={e => setCourseForm(p => ({ ...p, title: e.target.value }))} />
          <div>
            <label className="text-sm font-medium text-text-primary">Description</label>
            <textarea
              value={courseForm.description ?? ''}
              onChange={e => setCourseForm(p => ({ ...p, description: e.target.value }))}
              rows={2}
              className="mt-1 w-full px-4 py-3 text-sm rounded-lg border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Level</label>
            <select
              value={courseForm.level ?? 'BEGINNER'}
              onChange={e => setCourseForm(p => ({ ...p, level: e.target.value as HomeworkLevel }))}
              className="mt-1 w-full px-3 py-2.5 text-sm rounded-lg border border-border focus:border-primary outline-none"
            >
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </div>
          {courseError && <p className="text-xs text-red-500">{courseError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => { setCourseModal(null); setCourseError(''); }} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-surface-light transition-colors">Cancel</button>
            <button onClick={handleSaveCourse} className="px-5 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors font-medium">Save</button>
          </div>
        </div>
      </Modal>

      {/* ── Manage Course Collections Modal ── */}
      <Modal isOpen={!!manageCourseId} onClose={() => setManageCourseId(null)} title="Manage Course Collections" maxWidthClass="max-w-xl">
        <div className="space-y-4">
          <div className="flex gap-2">
            <select
              id="add-coll-to-course-select"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-border focus:border-primary outline-none"
              defaultValue=""
              onChange={async (e) => {
                if (e.target.value && manageCourseId) {
                  await addCollectionToCourseAction(manageCourseId, e.target.value);
                  e.target.value = '';
                }
              }}
            >
              <option value="">Select a collection to add…</option>
              {colls.filter(c => c.status === 'published' || c.status === 'draft').map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-text-secondary">Select a collection from the dropdown to add it. Use the remove button to detach a collection from this course.</p>
          <div className="mt-2">
            <p className="text-sm text-text-secondary text-center py-4">Manage collections in this course above.</p>
          </div>
        </div>
      </Modal>

      {/* ── Delete Course Confirmation ── */}
      <ConfirmationModal
        isOpen={!!deleteCourseConfirm}
        onCancel={() => setDeleteCourseConfirm(null)}
        onConfirm={handleDeleteCourse}
        title="Delete Course"
        description={`Delete "${deleteCourseConfirm?.title}"? Collections will not be deleted.`}
        confirmLabel="Delete"
      />
    </div>
  );
}

// ─── TemplateCard Sub-component ───────────────────────────────────────────────

interface TemplateCardProps {
  template: DbHomeworkLibraryTemplate;
  onEdit: () => void;
  onPublish: () => void;
  onArchive: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const STATUS_STYLES_CARD: Record<HomeworkStatus, string> = {
  draft:     'bg-amber-50 text-amber-700 border border-amber-200',
  published: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  archived:  'bg-slate-100 text-slate-500 border border-slate-200',
};
const LEVEL_STYLES_CARD: Record<HomeworkLevel, string> = {
  BEGINNER:     'bg-green-50 text-green-700',
  INTERMEDIATE: 'bg-blue-50 text-blue-700',
  ADVANCED:     'bg-purple-50 text-purple-700',
};
const DIFF_LABEL: Record<HomeworkDifficulty, string> = {
  easy: '⭐ Easy', medium: '⭐⭐ Medium', hard: '⭐⭐⭐ Hard', expert: '⭐⭐⭐⭐ Expert',
};

function TemplateCard({ template: t, onEdit, onPublish, onArchive, onDuplicate, onDelete }: TemplateCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all group flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-text-primary text-sm leading-snug line-clamp-2 flex-1">{t.title}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_STYLES_CARD[t.status]}`}>{t.status}</span>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        <span className={`text-xs px-2 py-0.5 rounded-full ${LEVEL_STYLES_CARD[t.level]}`}>{t.level}</span>
        <span className="text-xs text-text-secondary">{DIFF_LABEL[t.difficulty]}</span>
        {t.estimated_time && <span className="text-xs text-text-secondary">⏱ {t.estimated_time}m</span>}
      </div>
      {t.category_name && <p className="text-xs text-text-secondary mb-1">📁 {t.category_name}</p>}
      {t.theme_name && <p className="text-xs text-text-secondary mb-2">🏷 {t.theme_name}</p>}
      {(t.tags ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {(t.tags ?? []).slice(0, 4).map(tag => (
            <span key={tag} className="text-xs bg-surface-light text-text-secondary px-1.5 py-0.5 rounded">{tag}</span>
          ))}
        </div>
      )}
      <div className="mt-auto pt-3 border-t border-border flex flex-wrap gap-1.5">
        <button id={`edit-tpl-${t.id}`} onClick={onEdit} className="text-xs px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium">Edit</button>
        {t.status === 'draft' && (
          <button id={`pub-tpl-${t.id}`} onClick={onPublish} className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors font-medium">Publish</button>
        )}
        {t.status === 'published' && (
          <button id={`arch-tpl-${t.id}`} onClick={onArchive} className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors">Archive</button>
        )}
        <button id={`dup-tpl-${t.id}`} onClick={onDuplicate} className="text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-surface-light transition-colors">Duplicate</button>
        {t.status !== 'published' && (
          <button id={`del-tpl-${t.id}`} onClick={onDelete} className="text-xs px-2.5 py-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition-colors">Delete</button>
        )}
      </div>
    </div>
  );
}
