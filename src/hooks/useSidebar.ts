'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'chesshub_sidebar_collapsed';

interface UseSidebarReturn {
  collapsed: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (value: boolean) => void;
}

export function useSidebar(): UseSidebarReturn {
  const [collapsed, setCollapsedState] = useState(false);

  // Hydrate from localStorage after mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setCollapsedState(stored === 'true');
      }
    } catch {
      // localStorage unavailable (SSR or private browsing) — use default
    }
  }, []);

  const setCollapsed = (value: boolean) => {
    setCollapsedState(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // ignore
    }
  };

  const toggleCollapsed = () => setCollapsed(!collapsed);

  return { collapsed, toggleCollapsed, setCollapsed };
}
