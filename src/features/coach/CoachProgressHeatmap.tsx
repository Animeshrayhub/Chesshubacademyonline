'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';

export interface HeatmapStudent {
  id: string;
  name: string;
  level: string;
}

export interface HeatmapChapter {
  id: string;
  workbookTitle: string;
  chapterNumber: number;
  title: string;
}

export interface StudentChapterRecord {
  studentId: string;
  chapterId: string;
  status: 'passed' | 'reassigned' | 'failed' | 'not_started';
  score: number | null; // 0 to 100
  attemptsCount: number;
  lastAttemptAt?: string;
  feedback?: string;
  moveHistory?: string[];
}

interface CoachProgressHeatmapProps {
  students: HeatmapStudent[];
  chapters: HeatmapChapter[];
  records: StudentChapterRecord[];
}

export default function CoachProgressHeatmap({
  students,
  chapters,
  records,
}: CoachProgressHeatmapProps) {
  const [selectedCell, setSelectedCell] = useState<{ student: HeatmapStudent; chapter: HeatmapChapter; record?: StudentChapterRecord } | null>(null);
  const [filterWorkbook, setFilterWorkbook] = useState<string>('all');

  // Map of `${studentId}_${chapterId}` -> record
  const recordMap = new Map<string, StudentChapterRecord>();
  records.forEach(r => {
    recordMap.set(`${r.studentId}_${r.chapterId}`, r);
  });

  const uniqueWorkbooks = Array.from(new Set(chapters.map(c => c.workbookTitle)));

  const filteredChapters = filterWorkbook === 'all'
    ? chapters
    : chapters.filter(c => c.workbookTitle === filterWorkbook);

  const getCellColor = (record?: StudentChapterRecord) => {
    if (!record || record.status === 'not_started') {
      return 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200';
    }
    if (record.status === 'reassigned') {
      return 'bg-amber-100 text-amber-800 border-amber-300 font-bold hover:bg-amber-200';
    }
    if (record.score != null && record.score >= 80) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold hover:bg-emerald-200';
    }
    return 'bg-red-100 text-red-800 border-red-300 font-bold hover:bg-red-200';
  };

  const getCellLabel = (record?: StudentChapterRecord) => {
    if (!record || record.status === 'not_started') return '—';
    if (record.status === 'reassigned') return '↩';
    if (record.score != null) return `${record.score}%`;
    return '0%';
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-text-primary">Student Progress Heatmap</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Single-glance matrix of all student chapter completions and scores. Click any cell for attempt logs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-text-secondary">Workbook:</label>
            <select
              value={filterWorkbook}
              onChange={e => setFilterWorkbook(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-border bg-white focus:border-primary outline-none"
            >
              <option value="all">All Workbooks ({chapters.length} chapters)</option>
              {uniqueWorkbooks.map(wb => (
                <option key={wb} value={wb}>{wb}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 pt-2 border-t border-border text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-emerald-100 border border-emerald-300 inline-block" />
            <span className="text-text-secondary">Passed (80–100%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-amber-100 border border-amber-300 inline-block" />
            <span className="text-text-secondary">Re-assigned (Needs Redo)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-red-100 border border-red-300 inline-block" />
            <span className="text-text-secondary">Failed (&lt;80%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-slate-100 border border-slate-200 inline-block" />
            <span className="text-text-secondary">Not Started</span>
          </div>
        </div>
      </div>

      {/* Heatmap Matrix Table */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 z-10 bg-surface-light border-b border-border shadow-xs">
              <tr>
                <th className="py-3 px-4 text-xs font-bold text-text-primary uppercase tracking-wider sticky left-0 z-20 bg-surface-light border-r border-border min-w-[160px]">
                  Student
                </th>
                {filteredChapters.map(ch => (
                  <th key={ch.id} className="py-3 px-2 text-center text-[11px] font-semibold text-text-secondary border-r border-border min-w-[70px]">
                    <div className="truncate max-w-[90px]" title={`${ch.workbookTitle} - Ch ${ch.chapterNumber}: ${ch.title}`}>
                      Ch {ch.chapterNumber}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.length === 0 && (
                <tr>
                  <td colSpan={filteredChapters.length + 1} className="py-12 text-center text-xs text-text-secondary">
                    No active students found.
                  </td>
                </tr>
              )}
              {students.map(st => (
                <tr key={st.id} className="hover:bg-surface-light/50 transition-colors">
                  <td className="py-2.5 px-4 sticky left-0 z-10 bg-white border-r border-border">
                    <p className="text-xs font-bold text-text-primary truncate max-w-[150px]">{st.name}</p>
                    <span className="text-[10px] text-text-secondary capitalize">{st.level}</span>
                  </td>
                  {filteredChapters.map(ch => {
                    const record = recordMap.get(`${st.id}_${ch.id}`);
                    return (
                      <td key={ch.id} className="p-1.5 text-center border-r border-border">
                        <button
                          type="button"
                          onClick={() => setSelectedCell({ student: st, chapter: ch, record })}
                          className={`w-full py-2 rounded-lg border text-xs transition-all shadow-xs ${getCellColor(record)}`}
                          title={`${st.name} - Ch ${ch.chapterNumber}: Click for attempt logs`}
                        >
                          {getCellLabel(record)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attempt Details Modal */}
      <Modal
        isOpen={!!selectedCell}
        onClose={() => setSelectedCell(null)}
        title={`Student Attempt Log — ${selectedCell?.student.name ?? ''}`}
        maxWidthClass="max-w-lg"
      >
        <div className="space-y-4">
          <div className="bg-surface-light p-4 rounded-xl border border-border">
            <p className="text-xs text-text-secondary uppercase font-semibold">Workbook & Chapter</p>
            <p className="text-sm font-bold text-text-primary mt-0.5">
              {selectedCell?.chapter.workbookTitle} — Chapter {selectedCell?.chapter.chapterNumber}: {selectedCell?.chapter.title}
            </p>
          </div>

          {!selectedCell?.record || selectedCell.record.status === 'not_started' ? (
            <div className="text-center py-8 text-text-secondary">
              <p className="text-3xl mb-2">⏳</p>
              <p className="text-sm">Student has not started this chapter yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-border p-3 rounded-xl">
                  <p className="text-xs text-text-secondary">Current Score</p>
                  <p className="text-lg font-bold text-primary mt-0.5">
                    {selectedCell.record.score != null ? `${selectedCell.record.score}%` : 'N/A'}
                  </p>
                </div>
                <div className="bg-white border border-border p-3 rounded-xl">
                  <p className="text-xs text-text-secondary">Total Attempts</p>
                  <p className="text-lg font-bold text-text-primary mt-0.5">
                    {selectedCell.record.attemptsCount} attempt(s)
                  </p>
                </div>
              </div>

              {selectedCell.record.lastAttemptAt && (
                <p className="text-xs text-text-secondary">
                  📅 Last Attempted: {new Date(selectedCell.record.lastAttemptAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}

              {selectedCell.record.feedback && (
                <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl">
                  <p className="text-xs font-semibold text-amber-800">Coach Feedback / Notes</p>
                  <p className="text-xs text-amber-700 mt-1">{selectedCell.record.feedback}</p>
                </div>
              )}

              {selectedCell.record.moveHistory && selectedCell.record.moveHistory.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-text-primary mb-1">Played Move Sequence:</p>
                  <div className="bg-slate-900 text-emerald-400 font-mono text-xs p-3 rounded-xl max-h-32 overflow-y-auto">
                    {selectedCell.record.moveHistory.join('  ')}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setSelectedCell(null)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
