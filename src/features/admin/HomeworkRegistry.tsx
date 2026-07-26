'use client';

import React, { useState, useTransition } from 'react';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import FilterBar from '@/components/dashboard/ui/FilterBar';
import TableActions, { type TableActionItem } from '@/components/dashboard/ui/TableActions';
import Pagination from '@/components/dashboard/ui/Pagination';
import ConfirmationModal from '@/components/dashboard/ui/ConfirmationModal';
import Input from '@/components/ui/Input';
import type { AdminHomeworkRow, CreateHomeworkInput, DbHomeworkChapter, CreateChapterInput } from '@/lib/homework';
import {
  createHomeworkAction,
  updateHomeworkAction,
  deleteHomeworkAction,
  createChapterAction,
  updateChapterAction,
  deleteChapterAction,
  createModuleAction,
  updateModuleAction,
  deleteModuleAction,
} from '@/actions/homework';
import { uploadFileAction } from '@/actions/storage';
import Modal from '@/components/ui/Modal';
import ManageChapterWorkspace from './ManageChapterWorkspace';
import PgnStudyImportWizard from '@/components/dashboard/ui/PgnStudyImportWizard';
import StudentRosterMatrixModal from '@/components/dashboard/ui/StudentRosterMatrixModal';
import PdfFenExtractorModal from '@/components/dashboard/ui/PdfFenExtractorModal';
import ChessCoursePdfImporter from './ChessCoursePdfImporter';
import InteractivePdfChessPuzzleScanner from './InteractivePdfChessPuzzleScanner';

interface HomeworkRegistryProps {


  workbooks: AdminHomeworkRow[];
}

const TRACK_COLORS: Record<string, string> = {
  BEGINNER: 'bg-green-50 text-green-700 border border-green-100',
  INTERMEDIATE: 'bg-blue-50 text-blue-700 border border-blue-100',
  ADVANCED: 'bg-purple-50 text-purple-700 border border-purple-100',
};

type ActiveTab = 'workbooks' | 'chapters' | 'modules' | 'pdf-importer' | 'interactive-scanner';

export default function HomeworkRegistry({ workbooks }: HomeworkRegistryProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('workbooks');
  const [search, setSearch] = useState('');
  const [trackFilter, setTrackFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [, startTransition] = useTransition();

  // Workbook state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editWorkbook, setEditWorkbook] = useState<AdminHomeworkRow | null>(null);
  const [confirmDeleteWorkbook, setConfirmDeleteWorkbook] = useState<AdminHomeworkRow | null>(null);
  const [wbFormData, setWbFormData] = useState({
    title: '',
    description: '',
    track: 'BEGINNER' as CreateHomeworkInput['track'],
    pdfStoragePath: '',
  });
  const [wbUploading, setWbUploading] = useState(false);
  const [wbFormError, setWbFormError] = useState('');
  const [wbFormSuccess, setWbFormSuccess] = useState(false);

  // Chapter state
  const [selectedWorkbook, setSelectedWorkbook] = useState<AdminHomeworkRow | null>(null);
  const [chapters, setChapters] = useState<DbHomeworkChapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [isChapterCreateOpen, setIsChapterCreateOpen] = useState(false);
  const [editChapter, setEditChapter] = useState<DbHomeworkChapter | null>(null);
  const [confirmDeleteChapter, setConfirmDeleteChapter] = useState<DbHomeworkChapter | null>(null);
  const [chFormData, setChFormData] = useState({
    title: '',
    description: '',
    pgnData: '',
    pdfStoragePath: '',
    moduleId: '',
    videoUrl: '',
    pdfPageRange: '',
    notes: '',
    unlockType: 'coach_approval' as 'coach_approval' | 'auto_score',
    unlockScore: 80,
  });
  const [chUploading, setChUploading] = useState(false);
  const [chFormError, setChFormError] = useState('');
  const [chFormSuccess, setChFormSuccess] = useState(false);

  // Module state
  const [modules, setModules] = useState<any[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [editModule, setEditModule] = useState<any | null>(null);
  const [confirmDeleteModule, setConfirmDeleteModule] = useState<any | null>(null);
  const [modFormData, setModFormData] = useState({
    title: '',
    description: '',
    moduleNumber: 1,
  });
  const [modFormError, setModFormError] = useState('');
  const [modFormSuccess, setModFormSuccess] = useState(false);
  const [managingChapter, setManagingChapter] = useState<DbHomeworkChapter | null>(null);

  // Advanced Curriculum Power Tools State
  const [isPgnImportOpen, setIsPgnImportOpen] = useState(false);
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [isPdfScanOpen, setIsPdfScanOpen] = useState(false);
  const [rosterChapterTitle, setRosterChapterTitle] = useState('Chapter');
  const [orphansOrganized, setOrphansOrganized] = useState(false);



  const pageSize = 10;

  // ── Workbook Filtering ───────────────────────────────────────────────────────
  const filtered = workbooks.filter((w) => {
    const nameMatch = w.title.toLowerCase().includes(search.toLowerCase());
    const trackMatch = trackFilter === 'ALL' || w.track === trackFilter;
    return nameMatch && trackMatch;
  });
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // ── Workbook Handlers ────────────────────────────────────────────────────────
  const resetWbForm = () => {
    setWbFormData({ title: '', description: '', track: 'BEGINNER', pdfStoragePath: '' });
    setWbFormError('');
    setWbFormSuccess(false);
    setWbUploading(false);
  };

  const openWbCreate = () => { resetWbForm(); setIsCreateOpen(true); };

  const openWbEdit = (wb: AdminHomeworkRow) => {
    setWbFormData({ title: wb.title, description: wb.description ?? '', track: wb.track, pdfStoragePath: wb.pdf_storage_path ?? '' });
    setWbFormError(''); setWbFormSuccess(false); setWbUploading(false);
    setEditWorkbook(wb);
  };

  const handleWbFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setWbUploading(true); setWbFormError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('bucket', 'workbooks');
      fd.append('path', `${Date.now()}_${file.name.toLowerCase().replace(/[^a-z0-9.]/g, '_')}`);
      const res = await uploadFileAction(fd);
      if (res.success && res.data) setWbFormData((p) => ({ ...p, pdfStoragePath: res.data.path }));
      else setWbFormError(res.error?.message || 'Upload failed.');
    } catch (err: any) { setWbFormError(err.message || 'Upload error.'); }
    finally { setWbUploading(false); }
  };

  const handleWbSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setWbFormError('');
    if (!wbFormData.title.trim()) { setWbFormError('Title is required.'); return; }
    const payload: CreateHomeworkInput = {
      title: wbFormData.title.trim(),
      description: wbFormData.description.trim() || undefined,
      track: wbFormData.track,
      pdfStoragePath: wbFormData.pdfStoragePath.trim() || undefined,
    };
    const res = editWorkbook ? await updateHomeworkAction(editWorkbook.id, payload) : await createHomeworkAction(payload);
    if (res.success) {
      setWbFormSuccess(true);
      setTimeout(() => { setIsCreateOpen(false); setEditWorkbook(null); resetWbForm(); }, 1000);
    } else { setWbFormError(res.error?.message || 'An error occurred.'); }
  };

  const handleConfirmDeleteWorkbook = () => {
    if (!confirmDeleteWorkbook) return;
    startTransition(async () => { await deleteHomeworkAction(confirmDeleteWorkbook.id); setConfirmDeleteWorkbook(null); });
  };

  // ── Chapter Handlers ─────────────────────────────────────────────────────────
  const openChaptersTab = async (wb: AdminHomeworkRow) => {
    setSelectedWorkbook(wb);
    setActiveTab('chapters');
    setChaptersLoading(true);
    try {
      const { listChaptersAction, listModulesAction } = await import('@/actions/homework');
      const [chRes, modRes] = await Promise.all([
        listChaptersAction(wb.id),
        listModulesAction(wb.id)
      ]);
      setChapters(chRes.success && chRes.data ? (chRes.data as DbHomeworkChapter[]) : []);
      setModules(modRes.success && modRes.data ? (modRes.data as any[]) : []);
    } catch { 
      setChapters([]); 
      setModules([]);
    }
    finally { setChaptersLoading(false); }
  };

  const resetChForm = () => {
    setChFormData({
      title: '',
      description: '',
      pgnData: '',
      pdfStoragePath: '',
      moduleId: '',
      videoUrl: '',
      pdfPageRange: '',
      notes: '',
      unlockType: 'coach_approval',
      unlockScore: 80,
    });
    setChFormError(''); setChFormSuccess(false); setChUploading(false);
  };

  const openChCreate = () => { resetChForm(); setIsChapterCreateOpen(true); };

  const openChEdit = (ch: DbHomeworkChapter) => {
    setChFormData({
      title: ch.title,
      description: ch.description ?? '',
      pgnData: ch.pgn_data ?? '',
      pdfStoragePath: ch.pdf_storage_path ?? '',
      moduleId: ch.module_id ?? '',
      videoUrl: ch.video_url ?? '',
      pdfPageRange: ch.pdf_page_range ?? '',
      notes: ch.notes ?? '',
      unlockType: ch.unlock_type ?? 'coach_approval',
      unlockScore: ch.unlock_score ?? 80,
    });
    setChFormError(''); setChFormSuccess(false); setChUploading(false);
    setEditChapter(ch);
  };

  const handleChFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setChUploading(true); setChFormError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('bucket', 'workbooks');
      fd.append('path', `chapters/${Date.now()}_${file.name.toLowerCase().replace(/[^a-z0-9.]/g, '_')}`);
      const res = await uploadFileAction(fd);
      if (res.success && res.data) setChFormData((p) => ({ ...p, pdfStoragePath: res.data.path }));
      else setChFormError(res.error?.message || 'Upload failed.');
    } catch (err: any) { setChFormError(err.message || 'Upload error.'); }
    finally { setChUploading(false); }
  };

  const handleChSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setChFormError('');
    if (!chFormData.title.trim()) { setChFormError('Chapter title is required.'); return; }
    if (!selectedWorkbook) return;
    let res;
    
    const payload = {
      title: chFormData.title.trim(),
      description: chFormData.description.trim() || undefined,
      pgnData: chFormData.pgnData.trim() || undefined,
      pdfStoragePath: chFormData.pdfStoragePath.trim() || undefined,
      moduleId: chFormData.moduleId || undefined,
      videoUrl: chFormData.videoUrl.trim() || undefined,
      pdfPageRange: chFormData.pdfPageRange.trim() || undefined,
      notes: chFormData.notes.trim() || undefined,
      unlockType: chFormData.unlockType,
      unlockScore: Number(chFormData.unlockScore) || 80,
    };

    if (editChapter) {
      res = await updateChapterAction(editChapter.id, payload);
    } else {
      res = await createChapterAction({
        workbookId: selectedWorkbook.id,
        ...payload,
      });
    }

    if (res && res.success) {
      setChFormSuccess(true);
      const { listChaptersAction } = await import('@/actions/homework');
      const fresh = await listChaptersAction(selectedWorkbook.id);
      setChapters(fresh.success && fresh.data ? (fresh.data as DbHomeworkChapter[]) : []);
      setTimeout(() => { setIsChapterCreateOpen(false); setEditChapter(null); resetChForm(); }, 800);
    } else { setChFormError(res?.error?.message || 'An error occurred while saving chapter.'); }
  };

  const handleConfirmDeleteChapter = () => {
    if (!confirmDeleteChapter || !selectedWorkbook) return;
    startTransition(async () => {
      await deleteChapterAction(confirmDeleteChapter.id);
      const { listChaptersAction } = await import('@/actions/homework');
      const fresh = await listChaptersAction(selectedWorkbook.id);
      setChapters(fresh.success && fresh.data ? (fresh.data as DbHomeworkChapter[]) : []);
      setConfirmDeleteChapter(null);
    });
  };

  // ── Module Handlers ──────────────────────────────────────────────────────────
  const openModulesTab = async (wb: AdminHomeworkRow) => {
    setSelectedWorkbook(wb);
    setActiveTab('modules');
    setModulesLoading(true);
    try {
      const { listModulesAction } = await import('@/actions/homework');
      const res = await listModulesAction(wb.id);
      setModules(res.success && res.data ? (res.data as any[]) : []);
    } catch { setModules([]); }
    finally { setModulesLoading(false); }
  };

  const resetModForm = () => {
    setModFormData({ title: '', description: '', moduleNumber: (modules.length + 1) });
    setModFormError(''); setModFormSuccess(false);
  };

  const openModCreate = () => { resetModForm(); setIsModuleModalOpen(true); };

  const openModEdit = (mod: any) => {
    setModFormData({ title: mod.title, description: mod.description ?? '', moduleNumber: mod.module_number });
    setModFormError(''); setModFormSuccess(false);
    setEditModule(mod);
    setIsModuleModalOpen(true);
  };

  const handleModSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setModFormError('');
    if (!modFormData.title.trim()) { setModFormError('Module title is required.'); return; }
    if (!selectedWorkbook) return;
    
    let res;
    if (editModule) {
      res = await updateModuleAction(editModule.id, {
        title: modFormData.title.trim(),
        description: modFormData.description.trim() || undefined,
        moduleNumber: Number(modFormData.moduleNumber) || 1,
      });
    } else {
      res = await createModuleAction({
        courseId: selectedWorkbook.id,
        title: modFormData.title.trim(),
        description: modFormData.description.trim() || undefined,
        moduleNumber: Number(modFormData.moduleNumber) || 1,
      });
    }

    if (res.success) {
      setModFormSuccess(true);
      const { listModulesAction } = await import('@/actions/homework');
      const fresh = await listModulesAction(selectedWorkbook.id);
      setModules(fresh.success && fresh.data ? (fresh.data as any[]) : []);
      setTimeout(() => { setIsModuleModalOpen(false); setEditModule(null); resetModForm(); }, 800);
    } else { setModFormError(res.error?.message || 'An error occurred.'); }
  };

  const handleConfirmDeleteModule = () => {
    if (!confirmDeleteModule || !selectedWorkbook) return;
    startTransition(async () => {
      await deleteModuleAction(confirmDeleteModule.id);
      const { listModulesAction } = await import('@/actions/homework');
      const fresh = await listModulesAction(selectedWorkbook.id);
      setModules(fresh.success && fresh.data ? (fresh.data as any[]) : []);
      setConfirmDeleteModule(null);
    });
  };

  // ── Table Columns & Rows ─────────────────────────────────────────────────────
  const wbColumns = [
    { key: 'title', label: 'Workbook Title' },
    { key: 'track', label: 'Course Track' },
    { key: 'chapters', label: 'Chapters' },
    { key: 'assignments', label: 'Assigned' },
    { key: 'actions', label: 'Actions', width: 'w-10' },
  ];

  const wbRows = paginated.map((wb) => {
    const actions: TableActionItem[] = [
      { label: 'Manage Modules', iconKey: 'bookOpen', onClick: () => openModulesTab(wb) },
      { label: 'Manage Chapters', iconKey: 'bookOpen', onClick: () => openChaptersTab(wb) },
      { label: 'Edit Workbook', iconKey: 'pencil', onClick: () => openWbEdit(wb) },
      { label: 'Delete Workbook', iconKey: 'trash', variant: 'danger', onClick: () => setConfirmDeleteWorkbook(wb) },
    ];
    return {
      title: <span className="font-semibold text-text-primary">{wb.title}</span>,
      track: (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${TRACK_COLORS[wb.track] ?? TRACK_COLORS.BEGINNER}`}>
          {wb.track.charAt(0) + wb.track.slice(1).toLowerCase()}
        </span>
      ),
      chapters: <span className="text-xs text-text-secondary">{wb.chapter_count}</span>,
      assignments: <span className="text-xs text-text-secondary">{wb.assignment_count}</span>,
      actions: <TableActions actions={actions} />,
    };
  });

  const chColumns = [
    { key: 'num', label: '#' },
    { key: 'title', label: 'Chapter Title' },
    { key: 'module', label: 'Associated Module' },
    { key: 'pgn', label: 'FEN / PGN' },
    { key: 'pdf', label: 'PDF' },
    { key: 'actions', label: 'Actions', width: 'w-10' },
  ];

  const chRows = chapters.map((ch) => {
    const actions: TableActionItem[] = [
      { label: 'Manage Chapter', iconKey: 'bookOpen', onClick: () => setManagingChapter(ch) },
      { label: 'Edit Properties', iconKey: 'pencil', onClick: () => openChEdit(ch) },
      { label: 'Delete Chapter', iconKey: 'trash', variant: 'danger', onClick: () => setConfirmDeleteChapter(ch) },
    ];
    const assocMod = modules.find(m => m.id === ch.module_id);

    return {
      num: <span className="text-xs font-bold text-text-secondary">{ch.chapter_number}</span>,
      title: <span className="font-semibold text-text-primary text-xs">{ch.title}</span>,
      module: assocMod ? (
        <span className="text-xs text-primary font-semibold">Mod {assocMod.module_number}: {assocMod.title}</span>
      ) : <span className="text-xs text-slate-400 italic">None (Orphan)</span>,
      pgn: ch.pgn_data ? (
        <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 truncate block max-w-[160px]">
          {ch.pgn_data.substring(0, 30)}…
        </span>
      ) : <span className="text-xs text-slate-400 italic">—</span>,
      pdf: ch.pdf_storage_path ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-100">PDF</span>
      ) : <span className="text-xs text-slate-400 italic">—</span>,
      actions: <TableActions actions={actions} />,
    };
  });

  const modColumns = [
    { key: 'num', label: 'Module #' },
    { key: 'title', label: 'Module Title' },
    { key: 'description', label: 'Description' },
    { key: 'actions', label: 'Actions', width: 'w-10' },
  ];

  const modRows = modules.map((mod) => {
    const actions: TableActionItem[] = [
      { label: 'Edit Module', iconKey: 'pencil', onClick: () => openModEdit(mod) },
      { label: 'Delete Module', iconKey: 'trash', variant: 'danger', onClick: () => setConfirmDeleteModule(mod) },
    ];
    return {
      num: <span className="text-xs font-bold text-text-secondary">{mod.module_number}</span>,
      title: <span className="font-semibold text-text-primary text-xs">{mod.title}</span>,
      description: <span className="text-xs text-text-secondary truncate block max-w-[300px]">{mod.description || '—'}</span>,
      actions: <TableActions actions={actions} />,
    };
  });

  const isWbModalOpen = isCreateOpen || !!editWorkbook;
  const isChModalOpen = isChapterCreateOpen || !!editChapter;
  const isModModalOpen = isModuleModalOpen || !!editModule;

  if (managingChapter) {
    return (
      <ManageChapterWorkspace
        chapter={managingChapter}
        onBack={async () => {
          setManagingChapter(null);
          if (selectedWorkbook) {
            const { listChaptersAction } = await import('@/actions/homework');
            const res = await listChaptersAction(selectedWorkbook.id);
            setChapters(res.success && res.data ? (res.data as DbHomeworkChapter[]) : []);
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Homework & Curriculums"
        subtitle="Manage shared workbooks, modules, chapters with FEN puzzles, and assign to students."
        action={
          activeTab === 'workbooks' ? (
            <button
              type="button"
              onClick={openWbCreate}
              className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-surface-dark font-bold rounded-xl text-sm transition-all shadow-gold"
            >
              Create Workbook
            </button>
          ) : activeTab === 'chapters' && selectedWorkbook ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOrphansOrganized(true)}
                className="px-3.5 py-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
              >
                <span>⚡ Auto-Organize Orphans</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPdfScanOpen(true)}
                className="px-3.5 py-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
              >
                <span>🔍 Scan PDF FEN</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPgnImportOpen(true)}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 border border-slate-700"
              >
                <span>📖 Import PGN / Lichess Study</span>
              </button>


              <button
                type="button"
                onClick={openChCreate}
                className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-sm transition-all"
              >
                Add Chapter
              </button>
            </div>
          ) : activeTab === 'modules' && selectedWorkbook ? (

            <button
              type="button"
              onClick={openModCreate}
              className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-sm transition-all"
            >
              Add Module
            </button>
          ) : null
        }
      />

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-border pb-0">
        <button
          type="button"
          onClick={() => setActiveTab('workbooks')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'workbooks' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          Workbooks
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pdf-importer')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'pdf-importer' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          📚 Chess Course PDF Importer
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('interactive-scanner')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'interactive-scanner' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          🧩 Interactive PDF Chess Puzzle Scanner
        </button>
        {selectedWorkbook && (
          <>
            <button
              type="button"
              onClick={() => openModulesTab(selectedWorkbook)}
              className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'modules' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
            >
              Modules: <span className="font-normal">{selectedWorkbook.title}</span>
            </button>
            <button
              type="button"
              onClick={() => openChaptersTab(selectedWorkbook)}
              className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'chapters' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
            >
              Chapters: <span className="font-normal">{selectedWorkbook.title}</span>
            </button>
          </>
        )}
      </div>

      {/* PDF Importer Tab */}
      {activeTab === 'pdf-importer' && (
        <ChessCoursePdfImporter />
      )}

      {/* Interactive PDF Scanner Tab */}
      {activeTab === 'interactive-scanner' && (
        <InteractivePdfChessPuzzleScanner />
      )}

      {/* Workbooks Tab */}
      {activeTab === 'workbooks' && (
        <>
          <FilterBar
            searchQuery={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search curriculum workbooks..."
            filters={[
              {
                key: 'track',
                label: 'Track',
                value: trackFilter,
                onChange: setTrackFilter,
                options: [
                  { value: 'ALL', label: 'All Tracks' },
                  { value: 'BEGINNER', label: 'Beginner' },
                  { value: 'INTERMEDIATE', label: 'Intermediate' },
                  { value: 'ADVANCED', label: 'Advanced' },
                ],
              },
            ]}
          />
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <DashboardTable
              columns={wbColumns}
              rows={wbRows}
              emptyTitle="No Workbooks Configured"
              emptyDescription="Create workbooks, add chapters with FEN puzzles or PDF worksheets, then assign to students."
            />
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </>
      )}

      {/* Chapters Tab */}
      {activeTab === 'chapters' && selectedWorkbook && (
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          {chaptersLoading ? (
            <div className="p-12 text-center text-sm text-text-secondary">Loading chapters…</div>
          ) : (
            <DashboardTable
              columns={chColumns}
              rows={chRows}
              emptyTitle="No Chapters Yet"
              emptyDescription={`Add chapters to "${selectedWorkbook.title}". Each chapter can have a FEN puzzle position and/or a PDF worksheet.`}
            />
          )}
        </div>
      )}

      {/* Modules Tab */}
      {activeTab === 'modules' && selectedWorkbook && (
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          {modulesLoading ? (
            <div className="p-12 text-center text-sm text-text-secondary">Loading modules…</div>
          ) : (
            <DashboardTable
              columns={modColumns}
              rows={modRows}
              emptyTitle="No Modules Configured"
              emptyDescription={`Add course modules to "${selectedWorkbook.title}" to group and sequence lessons.`}
            />
          )}
        </div>
      )}

      {/* ── Workbook Create / Edit Modal ── */}
      <Modal
        isOpen={isWbModalOpen}
        onClose={() => { setIsCreateOpen(false); setEditWorkbook(null); }}
        title={editWorkbook ? 'Edit Workbook' : 'Create New Workbook'}
        maxWidthClass="max-w-lg"
      >
        {wbFormSuccess ? (
          <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-xs font-semibold text-green-700">
            {editWorkbook ? 'Workbook updated.' : 'Workbook created.'}
          </div>
        ) : (
          <form onSubmit={handleWbSubmit} className="space-y-4">
            <Input
              id="wb-title"
              label="Workbook Title"
              placeholder="e.g. Beginner Tactics Vol. 1"
              value={wbFormData.title}
              onChange={(e) => setWbFormData((p) => ({ ...p, title: e.target.value }))}
              required
            />
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Course Track <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-3 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                value={wbFormData.track}
                onChange={(e) => setWbFormData((p) => ({ ...p, track: e.target.value as CreateHomeworkInput['track'] }))}
              >
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">Description (optional)</label>
              <textarea
                rows={2}
                placeholder="Brief description..."
                value={wbFormData.description}
                onChange={(e) => setWbFormData((p) => ({ ...p, description: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">Upload Workbook PDF</label>
              <input
                type="file"
                accept=".pdf"
                onChange={handleWbFileChange}
                className="w-full text-xs text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-surface-light file:text-text-primary hover:file:bg-border cursor-pointer"
              />
              {wbUploading && <span className="text-[10px] text-primary font-semibold mt-1 block">Uploading…</span>}
              {wbFormData.pdfStoragePath && !wbUploading && (
                <span className="text-[10px] text-green-600 font-semibold mt-1 block">✓ Uploaded</span>
              )}
            </div>
            {wbFormError && <p className="text-xs text-red-600 font-medium">{wbFormError}</p>}
            <div className="flex justify-end gap-2.5 pt-2">
              <button type="button" onClick={() => { setIsCreateOpen(false); setEditWorkbook(null); }} className="px-4 py-2 border border-border hover:bg-surface-light rounded-xl text-xs font-semibold">
                Cancel
              </button>
              <button type="submit" disabled={wbUploading} className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50">
                {editWorkbook ? 'Save Changes' : 'Create Workbook'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Chapter Create / Edit Modal ── */}
      <Modal
        isOpen={isChModalOpen}
        onClose={() => { setIsChapterCreateOpen(false); setEditChapter(null); }}
        title={editChapter ? 'Edit Chapter' : 'Add Chapter'}
        maxWidthClass="max-w-xl"
      >
        {chFormSuccess ? (
          <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-xs font-semibold text-green-700">
            {editChapter ? 'Chapter updated.' : 'Chapter created.'}
          </div>
        ) : (
          <form onSubmit={handleChSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                id="ch-title"
                label="Chapter Title"
                placeholder="e.g. Fork Tactics — Intermediate"
                value={chFormData.title}
                onChange={(e) => setChFormData((p) => ({ ...p, title: e.target.value }))}
                required
              />
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Associate Course Module
                </label>
                <select
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  value={chFormData.moduleId}
                  onChange={(e) => setChFormData((p) => ({ ...p, moduleId: e.target.value }))}
                >
                  <option value="">None (Orphan Chapter)</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      Mod {m.module_number}: {m.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">Unlock Type</label>
                <select
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  value={chFormData.unlockType}
                  onChange={(e) => setChFormData((p) => ({ ...p, unlockType: e.target.value as 'coach_approval' | 'auto_score' }))}
                >
                  <option value="coach_approval">Coach Approval Required</option>
                  <option value="auto_score">Automatic Points Threshold</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">Unlock Score Threshold (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  value={chFormData.unlockScore}
                  onChange={(e) => setChFormData((p) => ({ ...p, unlockScore: parseInt(e.target.value) || 80 }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                id="ch-video"
                label="Lecture Video URL (Google Drive Share/Preview link)"
                placeholder="https://drive.google.com/file/d/.../preview"
                value={chFormData.videoUrl}
                onChange={(e) => setChFormData((p) => ({ ...p, videoUrl: e.target.value }))}
              />
              <Input
                id="ch-pdf-pages"
                label="Workbook Page Range (optional)"
                placeholder="e.g. Pages 12 - 18"
                value={chFormData.pdfPageRange}
                onChange={(e) => setChFormData((p) => ({ ...p, pdfPageRange: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">Description / Learning Objectives (optional)</label>
              <textarea
                rows={2}
                placeholder="Chapter overview or instructions..."
                value={chFormData.description}
                onChange={(e) => setChFormData((p) => ({ ...p, description: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">Lecture Notes / Concepts (optional)</label>
              <textarea
                rows={3}
                placeholder="Key patterns, theoretical explanations, rules of thumb..."
                value={chFormData.notes}
                onChange={(e) => setChFormData((p) => ({ ...p, notes: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                FEN / PGN Position (optional)
                <span className="text-text-secondary font-normal ml-1">— paste a FEN string to activate the interactive board</span>
              </label>
              <textarea
                rows={2}
                placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                value={chFormData.pgnData}
                onChange={(e) => setChFormData((p) => ({ ...p, pgnData: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm font-mono border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">Upload Chapter PDF (optional)</label>
              <input
                type="file"
                accept=".pdf"
                onChange={handleChFileChange}
                className="w-full text-xs text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-surface-light file:text-text-primary hover:file:bg-border cursor-pointer"
              />
              {chUploading && <span className="text-[10px] text-primary font-semibold mt-1 block">Uploading…</span>}
              {chFormData.pdfStoragePath && !chUploading && (
                <span className="text-[10px] text-green-600 font-semibold mt-1 block">✓ PDF uploaded</span>
              )}
            </div>

            {chFormError && <p className="text-xs text-red-600 font-medium">{chFormError}</p>}
            <div className="flex justify-end gap-2.5 pt-2">
              <button type="button" onClick={() => { setIsChapterCreateOpen(false); setEditChapter(null); resetChForm(); }} className="px-4 py-2 border border-border hover:bg-surface-light rounded-xl text-xs font-semibold">
                Cancel
              </button>
              <button type="submit" disabled={chUploading} className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50">
                {editChapter ? 'Save Changes' : 'Add Chapter'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Module Create / Edit Modal ── */}
      <Modal
        isOpen={isModModalOpen}
        onClose={() => { setIsModuleModalOpen(false); setEditModule(null); }}
        title={editModule ? 'Edit Module' : 'Add Module'}
        maxWidthClass="max-w-lg"
      >
        {modFormSuccess ? (
          <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-xs font-semibold text-green-700">
            {editModule ? 'Module updated.' : 'Module created.'}
          </div>
        ) : (
          <form onSubmit={handleModSubmit} className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3">
                <Input
                  id="mod-title"
                  label="Module Title"
                  placeholder="e.g. Fundamental Mates"
                  value={modFormData.title}
                  onChange={(e) => setModFormData((p) => ({ ...p, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">Module #</label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  value={modFormData.moduleNumber}
                  onChange={(e) => setModFormData((p) => ({ ...p, moduleNumber: parseInt(e.target.value) || 1 }))}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">Description (optional)</label>
              <textarea
                rows={3}
                placeholder="Objectives and scope of this module..."
                value={modFormData.description}
                onChange={(e) => setModFormData((p) => ({ ...p, description: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
            {modFormError && <p className="text-xs text-red-600 font-medium">{modFormError}</p>}
            <div className="flex justify-end gap-2.5 pt-2">
              <button type="button" onClick={() => { setIsModuleModalOpen(false); setEditModule(null); resetModForm(); }} className="px-4 py-2 border border-border hover:bg-surface-light rounded-xl text-xs font-semibold">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-colors">
                {editModule ? 'Save Changes' : 'Add Module'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Workbook Delete Confirm */}
      <ConfirmationModal
        isOpen={!!confirmDeleteWorkbook}
        title="Delete Workbook?"
        description="This will permanently delete the workbook, all its chapters, and student assignments. This cannot be undone."
        confirmLabel="Delete Workbook"
        onConfirm={handleConfirmDeleteWorkbook}
        onCancel={() => setConfirmDeleteWorkbook(null)}
      />

      {/* Chapter Delete Confirm */}
      <ConfirmationModal
        isOpen={!!confirmDeleteChapter}
        title="Delete Chapter?"
        description="This will delete the chapter and all associated student homework assignments."
        confirmLabel="Delete Chapter"
        onConfirm={handleConfirmDeleteChapter}
        onCancel={() => setConfirmDeleteChapter(null)}
      />

      {/* Module Delete Confirm */}
      <ConfirmationModal
        isOpen={!!confirmDeleteModule}
        title="Delete Module?"
        description="This will delete the module. Associated chapters will become orphan chapters but won't be deleted."
        confirmLabel="Delete Module"
        onConfirm={handleConfirmDeleteModule}
        onCancel={() => setConfirmDeleteModule(null)}
      />

      {/* PGN & Lichess Study Import Wizard */}
      <PgnStudyImportWizard
        isOpen={isPgnImportOpen}
        onClose={() => setIsPgnImportOpen(false)}
        onImportPgn={(pgn, title) => {
          console.log('Imported PGN study:', title, pgn);
        }}
      />

      {/* Student Assignment Roster Matrix Modal */}
      <StudentRosterMatrixModal
        isOpen={isRosterOpen}
        onClose={() => setIsRosterOpen(false)}
        chapterTitle={rosterChapterTitle}
      />

      {/* PDF FEN Position OCR Scanner Modal */}
      <PdfFenExtractorModal
        isOpen={isPdfScanOpen}
        onClose={() => setIsPdfScanOpen(false)}
        onSelectFen={async (fen) => {
          if (!selectedWorkbook) {
            alert('Please select a workbook first.');
            return;
          }
          const title = prompt('Enter a title for the new chapter:', 'Scanned FEN Chapter');
          if (!title) return;
          try {
            const createRes = await createChapterAction({
              workbookId: selectedWorkbook.id,
              title: title.trim(),
              unlockType: 'coach_approval',
              unlockScore: 80,
            });
            if (createRes.success && createRes.data) {
              const newCh = createRes.data as any;
              const { importPgnToChapterAction } = await import('@/actions/homework');
              await importPgnToChapterAction(newCh.id, fen);
              const { listChaptersAction } = await import('@/actions/homework');
              const fresh = await listChaptersAction(selectedWorkbook.id);
              setChapters(fresh.success && fresh.data ? (fresh.data as DbHomeworkChapter[]) : []);
              alert(`⚡ Successfully created chapter "${title}" with the selected FEN puzzle!`);
            }
          } catch (err: any) {
            alert('Error creating chapter: ' + err.message);
          }
        }}
        onBulkImportFens={async (fens) => {
          if (!selectedWorkbook) {
            alert('Please select a workbook first.');
            return;
          }
          if (fens.length === 0) return;
          const title = prompt('Enter a title for the new chapter:', `Scanned FEN Chapter - ${fens.length} Puzzles`);
          if (!title) return;
          try {
            const createRes = await createChapterAction({
              workbookId: selectedWorkbook.id,
              title: title.trim(),
              unlockType: 'coach_approval',
              unlockScore: 80,
            });
            if (createRes.success && createRes.data) {
              const newCh = createRes.data as any;
              const { importPgnToChapterAction } = await import('@/actions/homework');
              await importPgnToChapterAction(newCh.id, fens.join('\n\n'));
              const { listChaptersAction } = await import('@/actions/homework');
              const fresh = await listChaptersAction(selectedWorkbook.id);
              setChapters(fresh.success && fresh.data ? (fresh.data as DbHomeworkChapter[]) : []);
              alert(`⚡ Successfully created chapter "${title}" with ${fens.length} interactive puzzles!`);
            }
          } catch (err: any) {
            alert('Error creating chapter: ' + err.message);
          }
        }}
      />
    </div>
  );
}


