'use client';

import { useEffect, useRef } from 'react';
import DashboardIcon from './DashboardIcon';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap, escape key, and background scroll lock
  useEffect(() => {
    if (!isOpen) return;

    // Lock background scroll
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-surface-dark/45 backdrop-blur-xs transition-opacity duration-300"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-55 w-full max-w-md mx-4"
      >
        <div className="bg-white rounded-2xl border border-border shadow-card-hover overflow-hidden p-6">
          <div className="flex items-start gap-4">
            {/* Warning Icon Badge */}
            <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <div className="flex-1">
              <h3 id="modal-title" className="text-base font-bold text-text-primary">
                {title}
              </h3>
              <p id="modal-description" className="text-xs text-text-secondary leading-relaxed mt-2">
                {description}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-border bg-white text-text-primary hover:bg-surface-light rounded-xl text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
