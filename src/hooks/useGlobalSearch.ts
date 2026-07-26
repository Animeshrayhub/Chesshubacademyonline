'use client';

import { useState, useEffect, useCallback } from 'react';

export interface UseGlobalSearchReturn {
  isOpen: boolean;
  query: string;
  openSearch: () => void;
  closeSearch: () => void;
  setQuery: (q: string) => void;
}

export function useGlobalSearch(): UseGlobalSearchReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const openSearch = useCallback(() => {
    setIsOpen(true);
    setQuery('');
  }, []);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, []);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          closeSearch();
        } else {
          openSearch();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        closeSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, openSearch, closeSearch]);

  return { isOpen, query, openSearch, closeSearch, setQuery };
}
