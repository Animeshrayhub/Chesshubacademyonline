'use client';

import { useEffect, useRef } from 'react';
import DashboardIcon from './DashboardIcon';
import type { UseGlobalSearchReturn } from '@/hooks/useGlobalSearch';

interface GlobalSearchModalProps {
  search: UseGlobalSearchReturn;
}

export default function GlobalSearchModal({ search }: GlobalSearchModalProps) {
  const { isOpen, query, closeSearch, setQuery } = search;
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-surface-dark/40 backdrop-blur-sm"
        onClick={closeSearch}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Global search"
        className="fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-full max-w-xl mx-4"
      >
        <div className="bg-white rounded-2xl border border-border shadow-card-hover overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
            <DashboardIcon iconKey="search" className="w-4.5 h-4.5 text-text-secondary flex-shrink-0" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search anything…"
              className="flex-1 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none bg-transparent"
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-light border border-border text-xs text-text-secondary font-medium">
              Esc
            </kbd>
          </div>

          {/* Placeholder results */}
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-text-secondary">
              {query
                ? `No results for "${query}"`
                : 'Start typing to search students, classes, homework…'}
            </p>
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2.5 border-t border-border flex items-center gap-3 text-xs text-text-secondary/60">
            <span><kbd className="font-medium text-text-secondary">↵</kbd> to select</span>
            <span><kbd className="font-medium text-text-secondary">↑↓</kbd> to navigate</span>
            <span><kbd className="font-medium text-text-secondary">Esc</kbd> to close</span>
          </div>
        </div>
      </div>
    </>
  );
}
