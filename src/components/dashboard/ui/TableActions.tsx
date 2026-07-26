'use client';

import React, { useState, useEffect, useRef } from 'react';
import DashboardIcon from './DashboardIcon';

export interface TableActionItem {
  label: string;
  onClick: () => void;
  iconKey?: any;
  variant?: 'danger' | 'default' | 'success';
}

interface TableActionsProps {
  actions: TableActionItem[];
}

export default function TableActions({ actions }: TableActionsProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-secondary hover:bg-surface-light border border-transparent hover:border-border transition-all duration-200"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="sr-only">Open options</span>
        {/* Three dots icon */}
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-border bg-white shadow-card-hover py-1 focus:outline-none animate-in fade-in duration-100">
          {actions.map((act, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                setOpen(false);
                act.onClick();
              }}
              className={`w-full text-left px-4 py-2 text-xs font-semibold flex items-center gap-2.5 transition-colors duration-150 ${
                act.variant === 'danger'
                  ? 'text-red-600 hover:bg-red-50'
                  : act.variant === 'success'
                  ? 'text-green-600 hover:bg-green-50'
                  : 'text-text-primary hover:bg-surface-light'
              }`}
            >
              {act.iconKey && (
                <DashboardIcon
                  iconKey={act.iconKey}
                  className={`w-3.5 h-3.5 ${act.variant === 'danger' ? 'text-red-500' : 'text-text-secondary'}`}
                />
              )}
              {act.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
