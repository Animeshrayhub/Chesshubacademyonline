'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { cn } from '@/utils/cn';
import type { NavLink } from '@/types';

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  links: NavLink[];
  isActive: (href: string) => boolean;
}

export default function MobileMenu({ open, onClose, links, isActive }: MobileMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Trap focus and handle Escape key
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Menu Container */}
      <div
        id="mobile-menu"
        ref={menuRef}
        role="dialog"
        aria-label="Navigation menu"
        aria-modal="true"
        className={cn(
          'fixed top-0 right-0 bottom-0 z-50 w-80 max-w-[90vw] bg-white shadow-2xl',
          'flex flex-col transition-transform duration-300 ease-out lg:hidden',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Link href="/" onClick={onClose} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg">
              <Image
                src="/logo/logo.jpg"
                alt="ChessHub Academy Logo"
                width={90}
                height={36}
                className="h-9 w-auto bg-white p-0.5 rounded-lg object-contain shadow-sm border border-border/10"
              />
            </Link>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-light transition-colors"
            aria-label="Close navigation menu"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto" aria-label="Mobile navigation">
          <ul className="space-y-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    'flex items-center px-4 py-3 rounded-xl text-base font-medium transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    isActive(link.href)
                      ? 'bg-primary/8 text-primary font-semibold'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-light'
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer CTAs */}
        <div className="px-4 py-6 border-t border-border space-y-3">
          <Link
            href="/login"
            className="flex items-center justify-center w-full px-6 py-3 rounded-xl border border-border text-text-primary font-medium hover:bg-surface-light transition-colors"
          >
            Login
          </Link>
          <Link
            href="/book-demo"
            className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-accent hover:bg-accent-hover text-surface-dark font-semibold transition-all duration-200 shadow-gold"
          >
            Book Free Demo
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </>
  );
}
