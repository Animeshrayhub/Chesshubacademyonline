'use client';

import { useId, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import DashboardIcon from '../ui/DashboardIcon';
import DashboardBadge from '../ui/DashboardBadge';
import type { NavItem, DashboardRole } from '@/types/dashboard';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  role: DashboardRole;
  navItems: NavItem[];
}

export default function MobileNav({ isOpen, onClose, role, navItems }: MobileNavProps) {
  const pathname = usePathname();
  const menuLabelId = useId();

  // Close mobile nav when navigation path changes
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-40 bg-surface-dark/45 backdrop-blur-xs lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={menuLabelId}
        className="fixed inset-y-0 left-0 z-50 w-full max-w-xs bg-surface-dark text-slate-300 border-r border-slate-800 lg:hidden flex flex-col h-full transform transition-transform duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <Link
            href="/"
            className="flex items-center gap-2 font-heading font-bold text-white"
            id={menuLabelId}
          >
            <span>ChessHub</span>
            <span className="text-accent">Academy</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors duration-150"
          >
            <DashboardIcon iconKey="x" className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.disabled ? '#' : item.href}
                aria-current={isActive ? 'page' : undefined}
                aria-disabled={item.disabled}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-accent
                  ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}
                  ${
                    isActive
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'hover:bg-slate-800/60 hover:text-white'
                  }
                `}
              >
                <DashboardIcon
                  iconKey={item.iconKey}
                  className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-accent' : 'text-slate-400'}`}
                />
                <span className="truncate">{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span className="ml-auto px-2 py-0.5 text-2xs font-bold bg-accent text-surface-dark rounded-full">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex flex-col gap-2 flex-shrink-0">
          <DashboardBadge role={role} size="sm" />
        </div>
      </section>
    </>
  );
}
