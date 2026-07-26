'use client';

import { useState } from 'react';
import { cn } from '@/utils/cn';

interface FAQItemProps {
  question: string;
  answer: string;
  id: string;
  defaultOpen?: boolean;
}

export default function FAQItem({ question, answer, id, defaultOpen = false }: FAQItemProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = `faq-content-${id}`;
  const headerId = `faq-header-${id}`;

  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-white transition-shadow duration-200 hover:shadow-md">
      <h3>
        <button
          type="button"
          id={headerId}
          className={cn(
            'w-full flex items-center justify-between gap-4 px-7 py-5 text-left',
            'font-semibold text-text-primary transition-colors duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
            open ? 'text-primary' : 'hover:text-primary'
          )}
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-controls={contentId}
        >
          <span className="text-base">{question}</span>
          <span
            className={cn(
              'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300',
              open
                ? 'bg-primary text-white rotate-45'
                : 'bg-surface-light text-text-secondary'
            )}
            aria-hidden="true"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </span>
        </button>
      </h3>
      <div
        id={contentId}
        role="region"
        aria-labelledby={headerId}
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-7 pb-6">
          <div className="h-px bg-border mb-5" aria-hidden="true" />
          <p className="text-text-secondary text-sm leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  );
}
