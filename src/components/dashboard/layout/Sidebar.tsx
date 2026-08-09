'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import DashboardIcon from '../ui/DashboardIcon';
import DashboardBadge from '../ui/DashboardBadge';
import { useSidebar } from '@/hooks/useSidebar';
import type { NavItem, DashboardRole } from '@/types/dashboard';

interface SidebarProps {
  role: DashboardRole;
  navItems: NavItem[];
}

export default function Sidebar({ role, navItems }: SidebarProps) {
  const { collapsed, toggleCollapsed } = useSidebar();
  const pathname = usePathname();

  return (
    <aside
      aria-label="Sidebar navigation"
      className={`
        hidden lg:flex flex-col bg-surface-dark border-r border-slate-800 text-slate-300 h-screen overflow-hidden transition-all duration-300 flex-shrink-0 z-20
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-slate-800 flex-shrink-0">
        <Link
          href="/"
          className={`flex items-center gap-2 font-heading font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded ${
            collapsed ? 'sr-only' : ''
          }`}
        >
          <span className="text-white">ChessHub</span>
          <span className="text-accent">Academy</span>
        </Link>
        {collapsed && (
          <div className="mx-auto text-accent text-lg font-bold font-heading" aria-hidden="true">
            C
          </div>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <DashboardIcon
            iconKey={collapsed ? 'chevronRight' : 'chevronLeft'}
            className="w-4 h-4"
          />
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-1 scrollbar-none">
        {navItems.map((item) => {
          const isBaseDashboard =
            item.href === '/dashboard/coach' ||
            item.href === '/dashboard/admin' ||
            item.href === '/dashboard/student';
          const isActive = isBaseDashboard
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.disabled ? '#' : item.href}
              aria-current={isActive ? 'page' : undefined}
              aria-disabled={item.disabled}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative
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
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && item.badge && item.badge > 0 ? (
                <span className="ml-auto px-2 py-0.5 text-2xs font-bold bg-accent text-surface-dark rounded-full">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-800 flex flex-col gap-2 flex-shrink-0">
          <DashboardBadge role={role} size="sm" />
        </div>
      )}
    </aside>
  );
}
