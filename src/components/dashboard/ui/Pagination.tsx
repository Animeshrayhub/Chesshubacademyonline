import React from 'react';
import DashboardIcon from './DashboardIcon';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-between border-t border-border px-4 py-3 sm:px-6 bg-white rounded-b-2xl ${className}`}>
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-light disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-light disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-text-secondary">
            Showing Page <span className="font-semibold text-text-primary">{currentPage}</span> of{' '}
            <span className="font-semibold text-text-primary">{totalPages}</span>
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-xl shadow-xs gap-1" aria-label="Pagination">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-lg p-2 text-text-secondary hover:bg-surface-light border border-border bg-white disabled:opacity-50 disabled:pointer-events-none transition-colors"
              aria-label="Previous page"
            >
              <DashboardIcon iconKey="chevronLeft" className="h-4 w-4" />
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                aria-current={currentPage === page ? 'page' : undefined}
                className={`relative inline-flex items-center rounded-lg px-3.5 py-2 text-sm font-semibold border transition-all duration-150 ${
                  currentPage === page
                    ? 'z-10 bg-primary border-primary text-white shadow-sm'
                    : 'border-border bg-white text-text-secondary hover:bg-surface-light'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-lg p-2 text-text-secondary hover:bg-surface-light border border-border bg-white disabled:opacity-50 disabled:pointer-events-none transition-colors"
              aria-label="Next page"
            >
              <DashboardIcon iconKey="chevronRight" className="h-4 w-4" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
