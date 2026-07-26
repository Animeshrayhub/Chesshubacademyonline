'use client';

import React, { useEffect } from 'react';
import DashboardIcon from '@/components/dashboard/ui/DashboardIcon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidthClass?: string; // e.g. 'max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-2xl'
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidthClass = 'max-w-md',
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    // Body scroll lock
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    // Escape key listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-50 bg-surface-dark/45 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />
      {/* Dialog container */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-55 w-full p-4 pointer-events-none flex items-center justify-center">
        <div
          className={`w-full ${maxWidthClass} bg-white rounded-2xl border border-border shadow-card-hover overflow-hidden pointer-events-auto flex flex-col max-h-[90vh]`}
          onClick={(e) => e.stopPropagation()} // Clicking inside does not close
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-5">
            <h3 className="text-base font-bold text-text-primary">
              {title || 'Dialog'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-text-secondary hover:bg-surface-light hover:text-text-primary transition-colors focus:outline-none"
            >
              <DashboardIcon iconKey="x" className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
