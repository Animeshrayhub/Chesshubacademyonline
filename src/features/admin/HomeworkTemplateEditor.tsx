'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type {
  DbHomeworkLibraryTemplate,
  DbTemplateSection,
  DbHomeworkCategory,
  DbHomeworkTheme,
  HomeworkLevel,
  HomeworkDifficulty,
  TemplateSectionType,
  UpdateTemplateInput,
  CreateSectionInput,
} from '@/lib/homework';
import {
  getHomeworkTemplateAction,
  updateHomeworkTemplateAction,
  createTemplateSectionAction,
  updateTemplateSectionAction,
  deleteTemplateSectionAction,
  publishHomeworkTemplateAction,
  archiveHomeworkTemplateAction,
} from '@/actions/homework';

interface HomeworkTemplateEditorProps {
  templateId: string;
  categories: DbHomeworkCategory[];
  themes: DbHomeworkTheme[];
  onClose: () => void;
}

type SectionFormField = Omit<CreateSectionInput, 'templateId'>;

const SECTION_TYPE_LABELS: Record<TemplateSectionType, string> = {
  introduction:        '📝 Introduction',
  objectives:          '🎯 Objectives',
  video:               '🎥 Video',
  pdf:                 '📄 PDF',
  image:               '🖼️ Image',
  puzzle:              '♟️ Puzzle',
  fen:                 '♖ FEN Position',
  pgn:                 'PGN',
  notes:               '📋 Notes',
  solution:            '✅ Solution',
  explanation:         '💡 Explanation',
  summary:             '📌 Summary',
  coach_instructions:  '🏫 Coach Instructions',
  hint:                '💬 Hint',
};

const SECTION_TYPES: TemplateSectionType[] = Object.keys(SECTION_TYPE_LABELS) as TemplateSectionType[];

export default function HomeworkTemplateEditor({ templateId, categories, themes, onClose }: HomeworkTemplateEditorProps) {
  const [template, setTemplate] = useState<(DbHomeworkLibraryTemplate & { sections: DbTemplateSection[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Edit form
  const [form, setForm] = useState<UpdateTemplateInput>({});
  const [tagsInput, setTagsInput] = useState('');

  // Section state
  const [sections, setSections] = useState<DbTemplateSection[]>([]);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [newSection, setNewSection] = useState<SectionFormField>({ sectionType: 'introduction', sortOrder: 0 });
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editSectionForm, setEditSectionForm] = useState<SectionFormField>({ sectionType: 'introduction' });

  const [activePane, setActivePane] = useState<'details' | 'sections'>('details');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getHomeworkTemplateAction(templateId);
    setLoading(false);
    if (!res.success || !res.data) { setError('Failed to load template.'); return; }
    const d = res.data as DbHomeworkLibraryTemplate & { sections: DbTemplateSection[] };
    setTemplate(d);
    setForm({
      title: d.title,
      description: d.description ?? '',
      categoryId: d.category_id ?? undefined,
      themeId: d.theme_id ?? undefined,
      level: d.level,
      difficulty: d.difficulty,
      estimatedTime: d.estimated_time,
      thumbnailUrl: d.thumbnail_url ?? '',
      tags: d.tags ?? [],
    });
    setTagsInput((d.tags ?? []).join(', '));
    setSections(d.sections ?? []);
  }, [templateId]);

  useEffect(() => { load(); }, [load]);

  const showSuccess = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  // ── Save details ──────────────────────────────────────────────────────────────
  const handleSaveDetails = async () => {
    if (!template) return;
    setSaving(true);
    const payload: UpdateTemplateInput = {
      ...form,
      tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
    };
    const res = await updateHomeworkTemplateAction(template.id, payload);
    setSaving(false);
    if (!res.success) { setError(res.error?.message ?? 'Failed to save.'); return; }
    setError('');
    showSuccess('Template saved successfully.');
    setTemplate(prev => prev ? { ...prev, ...res.data as DbHomeworkLibraryTemplate } : prev);
  };

  // ── Publish / Archive ─────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!template) return;
    setSaving(true);
    const res = await publishHomeworkTemplateAction(template.id);
    setSaving(false);
    if (!res.success) { setError(res.error?.message ?? 'Failed.'); return; }
    setTemplate(prev => prev ? { ...prev, status: 'published' } : prev);
    showSuccess('Template published! Coaches can now browse and assign it.');
  };

  const handleArchive = async () => {
    if (!template) return;
    setSaving(true);
    const res = await archiveHomeworkTemplateAction(template.id);
    setSaving(false);
    if (!res.success) { setError(res.error?.message ?? 'Failed.'); return; }
    setTemplate(prev => prev ? { ...prev, status: 'archived' } : prev);
    showSuccess('Template archived.');
  };

  // ── Sections ──────────────────────────────────────────────────────────────────
  const handleAddSection = async () => {
    if (!template) return;
    const res = await createTemplateSectionAction({ ...newSection, templateId: template.id, sortOrder: sections.length });
    if (!res.success) { setError(res.error?.message ?? 'Failed to add section.'); return; }
    setSections(prev => [...prev, res.data as DbTemplateSection]);
    setAddSectionOpen(false);
    setNewSection({ sectionType: 'introduction' });
    showSuccess('Section added.');
  };

  const handleUpdateSection = async () => {
    if (!editingSectionId) return;
    const res = await updateTemplateSectionAction(editingSectionId, editSectionForm);
    if (!res.success) { setError(res.error?.message ?? 'Failed.'); return; }
    setSections(prev => prev.map(s => s.id === editingSectionId ? { ...s, ...res.data as DbTemplateSection } : s));
    setEditingSectionId(null);
    showSuccess('Section updated.');
  };

  const handleDeleteSection = async (id: string) => {
    const res = await deleteTemplateSectionAction(id);
    if (!res.success) { setError(res.error?.message ?? 'Failed.'); return; }
    setSections(prev => prev.filter(s => s.id !== id));
  };

  const startEditSection = (s: DbTemplateSection) => {
    setEditingSectionId(s.id);
    setEditSectionForm({
      sectionType: s.section_type,
      title: s.title ?? '',
      content: s.content ?? '',
      mediaUrl: s.media_url ?? '',
      fenPosition: s.fen_position ?? '',
      pgnData: s.pgn_data ?? '',
      sortOrder: s.sort_order,
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-60 bg-white flex items-center justify-center">
        <div className="text-text-secondary text-sm animate-pulse">Loading template editor…</div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="fixed inset-0 z-60 bg-white flex items-center justify-center">
        <div className="text-red-500 text-sm">{error || 'Template not found.'}</div>
        <button onClick={onClose} className="ml-4 text-sm text-primary underline">Back</button>
      </div>
    );
  }

  const STATUS_PILL = {
    draft:     'bg-amber-50 text-amber-700 border border-amber-200',
    published: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    archived:  'bg-slate-100 text-slate-500 border border-slate-200',
  }[template.status];

  return (
    <div className="fixed inset-0 z-60 bg-surface-light flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 bg-white border-b border-border shadow-sm flex-shrink-0">
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-surface-light">
          ← Back
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-text-primary truncate">{template.title}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_PILL}`}>{template.status}</span>
            <span className="text-xs text-text-secondary">v{template.version}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {template.status === 'draft' && (
            <button
              id="btn-publish-template"
              onClick={handlePublish}
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors font-medium disabled:opacity-50"
            >
              Publish
            </button>
          )}
          {template.status === 'published' && (
            <button
              id="btn-archive-template"
              onClick={handleArchive}
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              Archive
            </button>
          )}
          <button
            id="btn-save-template"
            onClick={handleSaveDetails}
            disabled={saving}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors font-medium disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Feedback bar */}
      {(error || success) && (
        <div className={`px-6 py-2.5 text-sm flex-shrink-0 ${error ? 'bg-red-50 text-red-600 border-b border-red-100' : 'bg-emerald-50 text-emerald-700 border-b border-emerald-100'}`}>
          {error || success}
          {error && <button onClick={() => setError('')} className="ml-4 underline text-xs">Dismiss</button>}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 px-6 py-3 bg-white border-b border-border flex-shrink-0">
        {(['details', 'sections'] as const).map(pane => (
          <button
            key={pane}
            onClick={() => setActivePane(pane)}
            className={`px-4 py-2 text-sm rounded-lg transition-all font-medium capitalize ${
              activePane === pane ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary hover:bg-surface-light'
            }`}
          >
            {pane === 'details' ? '📋 Details' : `📂 Sections (${sections.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Details Pane */}
        {activePane === 'details' && (
          <div className="max-w-2xl mx-auto space-y-5">
            <div>
              <label className="text-sm font-medium text-text-primary">Title <span className="text-red-500">*</span></label>
              <input
                id="tpl-edit-title"
                type="text"
                value={form.title ?? ''}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="mt-1 w-full px-4 py-3 text-sm rounded-lg border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary">Description</label>
              <textarea
                value={form.description ?? ''}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={3}
                className="mt-1 w-full px-4 py-3 text-sm rounded-lg border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-text-primary">Level</label>
                <select
                  value={form.level ?? 'BEGINNER'}
                  onChange={e => setForm(p => ({ ...p, level: e.target.value as HomeworkLevel }))}
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
                  value={form.difficulty ?? 'easy'}
                  onChange={e => setForm(p => ({ ...p, difficulty: e.target.value as HomeworkDifficulty }))}
                  className="mt-1 w-full px-3 py-2.5 text-sm rounded-lg border border-border focus:border-primary outline-none"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-text-primary">Category</label>
                <select
                  value={form.categoryId ?? ''}
                  onChange={e => setForm(p => ({ ...p, categoryId: e.target.value || undefined }))}
                  className="mt-1 w-full px-3 py-2.5 text-sm rounded-lg border border-border focus:border-primary outline-none"
                >
                  <option value="">None</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-text-primary">Theme</label>
                <select
                  value={form.themeId ?? ''}
                  onChange={e => setForm(p => ({ ...p, themeId: e.target.value || undefined }))}
                  className="mt-1 w-full px-3 py-2.5 text-sm rounded-lg border border-border focus:border-primary outline-none"
                >
                  <option value="">None</option>
                  {themes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary">Estimated Time (minutes)</label>
              <input
                type="number"
                min={5}
                max={180}
                value={form.estimatedTime ?? 30}
                onChange={e => setForm(p => ({ ...p, estimatedTime: Number(e.target.value) }))}
                className="mt-1 w-full px-4 py-2.5 text-sm rounded-lg border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary">Tags (comma separated)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                placeholder="fork, tactics, beginner"
                className="mt-1 w-full px-4 py-2.5 text-sm rounded-lg border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary">Thumbnail URL</label>
              <input
                type="url"
                value={form.thumbnailUrl ?? ''}
                onChange={e => setForm(p => ({ ...p, thumbnailUrl: e.target.value }))}
                className="mt-1 w-full px-4 py-2.5 text-sm rounded-lg border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="https://…"
              />
            </div>
          </div>
        )}

        {/* Sections Pane */}
        {activePane === 'sections' && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-text-secondary">{sections.length} section{sections.length !== 1 ? 's' : ''} in this template</p>
              <button
                id="btn-add-section"
                onClick={() => setAddSectionOpen(true)}
                className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors font-medium"
              >
                + Add Section
              </button>
            </div>

            {sections.length === 0 && (
              <div className="text-center py-16 text-text-secondary border-2 border-dashed border-border rounded-2xl">
                <p className="text-3xl mb-2">📂</p>
                <p className="text-sm font-medium">No sections yet.</p>
                <p className="text-xs mt-1">Add an introduction, objectives, FEN puzzles, videos, PDFs, and more.</p>
              </div>
            )}

            {sections.map((section, idx) => (
              <div key={section.id} className="bg-white rounded-2xl border border-border p-5 shadow-sm">
                {editingSectionId === section.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">Type</label>
                        <select
                          value={editSectionForm.sectionType}
                          onChange={e => setEditSectionForm(p => ({ ...p, sectionType: e.target.value as TemplateSectionType }))}
                          className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-border focus:border-primary outline-none"
                        >
                          {SECTION_TYPES.map(st => <option key={st} value={st}>{SECTION_TYPE_LABELS[st]}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">Title</label>
                        <input
                          type="text"
                          value={editSectionForm.title ?? ''}
                          onChange={e => setEditSectionForm(p => ({ ...p, title: e.target.value }))}
                          className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-border focus:border-primary outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">Content</label>
                      <textarea
                        value={editSectionForm.content ?? ''}
                        onChange={e => setEditSectionForm(p => ({ ...p, content: e.target.value }))}
                        rows={4}
                        className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-border focus:border-primary outline-none"
                        placeholder="Section content, instructions, or text…"
                      />
                    </div>
                    {(editSectionForm.sectionType === 'fen' || editSectionForm.sectionType === 'puzzle') && (
                      <div>
                        <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">FEN Position</label>
                        <input
                          type="text"
                          value={editSectionForm.fenPosition ?? ''}
                          onChange={e => setEditSectionForm(p => ({ ...p, fenPosition: e.target.value }))}
                          className="mt-1 w-full px-3 py-2 text-sm font-mono rounded-lg border border-border focus:border-primary outline-none"
                          placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                        />
                      </div>
                    )}
                    {editSectionForm.sectionType === 'pgn' && (
                      <div>
                        <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">PGN Data</label>
                        <textarea
                          value={editSectionForm.pgnData ?? ''}
                          onChange={e => setEditSectionForm(p => ({ ...p, pgnData: e.target.value }))}
                          rows={3}
                          className="mt-1 w-full px-3 py-2 text-sm font-mono rounded-lg border border-border focus:border-primary outline-none"
                          placeholder="1. e4 e5 2. Nf3…"
                        />
                      </div>
                    )}
                    {(editSectionForm.sectionType === 'video' || editSectionForm.sectionType === 'pdf' || editSectionForm.sectionType === 'image') && (
                      <div>
                        <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">Media URL</label>
                        <input
                          type="url"
                          value={editSectionForm.mediaUrl ?? ''}
                          onChange={e => setEditSectionForm(p => ({ ...p, mediaUrl: e.target.value }))}
                          className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-border focus:border-primary outline-none"
                          placeholder="https://…"
                        />
                      </div>
                    )}
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingSectionId(null)} className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-surface-light transition-colors">Cancel</button>
                      <button onClick={handleUpdateSection} className="px-3 py-1.5 text-sm rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors font-medium">Update</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs text-text-secondary w-5 text-center">{idx + 1}</span>
                      <span className="text-sm font-medium text-text-primary">{SECTION_TYPE_LABELS[section.section_type]}</span>
                      {section.title && <span className="text-sm text-text-secondary">— {section.title}</span>}
                    </div>
                    {section.content && <p className="text-xs text-text-secondary line-clamp-2 mb-2 ml-8">{section.content}</p>}
                    {section.fen_position && <p className="text-xs font-mono text-text-secondary line-clamp-1 mb-2 ml-8">{section.fen_position}</p>}
                    {section.media_url && <p className="text-xs text-primary underline line-clamp-1 mb-2 ml-8">{section.media_url}</p>}
                    <div className="flex gap-2 justify-end mt-2">
                      <button id={`edit-sec-${section.id}`} onClick={() => startEditSection(section)} className="text-xs px-2.5 py-1 rounded-lg border border-border hover:bg-surface-light transition-colors">Edit</button>
                      <button id={`del-sec-${section.id}`} onClick={() => handleDeleteSection(section.id)} className="text-xs px-2.5 py-1 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition-colors">Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Add Section Inline Form */}
            {addSectionOpen && (
              <div className="bg-white rounded-2xl border border-primary/30 p-5 shadow-sm space-y-3">
                <h4 className="text-sm font-semibold text-text-primary">New Section</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">Type</label>
                    <select
                      value={newSection.sectionType}
                      onChange={e => setNewSection(p => ({ ...p, sectionType: e.target.value as TemplateSectionType }))}
                      className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-border focus:border-primary outline-none"
                    >
                      {SECTION_TYPES.map(st => <option key={st} value={st}>{SECTION_TYPE_LABELS[st]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">Title</label>
                    <input
                      type="text"
                      value={newSection.title ?? ''}
                      onChange={e => setNewSection(p => ({ ...p, title: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-border focus:border-primary outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">Content</label>
                  <textarea
                    value={newSection.content ?? ''}
                    onChange={e => setNewSection(p => ({ ...p, content: e.target.value }))}
                    rows={3}
                    className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-border focus:border-primary outline-none"
                  />
                </div>
                {(newSection.sectionType === 'fen' || newSection.sectionType === 'puzzle') && (
                  <div>
                    <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">FEN Position</label>
                    <input
                      type="text"
                      value={newSection.fenPosition ?? ''}
                      onChange={e => setNewSection(p => ({ ...p, fenPosition: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 text-sm font-mono rounded-lg border border-border focus:border-primary outline-none"
                    />
                  </div>
                )}
                {newSection.sectionType === 'pgn' && (
                  <div>
                    <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">PGN Data</label>
                    <textarea
                      value={newSection.pgnData ?? ''}
                      onChange={e => setNewSection(p => ({ ...p, pgnData: e.target.value }))}
                      rows={3}
                      className="mt-1 w-full px-3 py-2 text-sm font-mono rounded-lg border border-border focus:border-primary outline-none"
                    />
                  </div>
                )}
                {(newSection.sectionType === 'video' || newSection.sectionType === 'pdf' || newSection.sectionType === 'image') && (
                  <div>
                    <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">Media URL</label>
                    <input
                      type="url"
                      value={newSection.mediaUrl ?? ''}
                      onChange={e => setNewSection(p => ({ ...p, mediaUrl: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-border focus:border-primary outline-none"
                    />
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setAddSectionOpen(false); setNewSection({ sectionType: 'introduction' }); }} className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-surface-light transition-colors">Cancel</button>
                  <button id="btn-save-section" onClick={handleAddSection} className="px-3 py-1.5 text-sm rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors font-medium">Add Section</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
