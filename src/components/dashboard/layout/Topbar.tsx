'use client';

import DashboardIcon from '../ui/DashboardIcon';
import ProfileDropdown from '../ui/ProfileDropdown';
import NotificationBell from '../ui/NotificationBell';
import DashboardBadge from '../ui/DashboardBadge';
import type { DashboardRole } from '@/types/dashboard';

interface TopbarProps {
  role: DashboardRole;
  user?: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
  onMenuOpen: () => void;
  onSearchOpen: () => void;
  onNotificationsOpen: () => void;
  unreadNotifications: number;
}

import React, { useState, useEffect } from 'react';

export default function Topbar({
  role,
  user,
  onMenuOpen,
  onSearchOpen,
  onNotificationsOpen,
  unreadNotifications,
}: TopbarProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark') || 
                       localStorage.getItem('theme') === 'dark';
    setIsDark(isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-border dark:border-slate-800 h-16 px-4 flex items-center justify-between flex-shrink-0 z-10 transition-colors">
      {/* Left side: Mobile menu toggle + breadcrumb placeholder */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuOpen}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 text-text-secondary hover:text-text-primary dark:text-slate-400 dark:hover:text-white hover:bg-surface-light dark:hover:bg-slate-800/60 border border-transparent hover:border-border dark:hover:border-slate-750 rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <DashboardIcon iconKey="menu" className="w-5 h-5" />
        </button>

        {/* Dashboard Indicator Label instead of complex breadcrumb tracking */}
        <div className="hidden sm:flex items-center gap-2">
          <DashboardIcon iconKey="layoutDashboard" className="w-4 h-4 text-text-secondary dark:text-slate-450" />
          <span className="text-sm font-semibold text-text-primary dark:text-slate-100">Academy Dashboard</span>
        </div>
      </div>

      {/* Right side: Search + Dark Mode + Notification Bell + Profile Dropdown */}
      <div className="flex items-center gap-3">
        {/* Search Input Trigger */}
        <button
          type="button"
          onClick={onSearchOpen}
          aria-label="Open search dialog (Cmd+K)"
          className="p-2 text-text-secondary hover:text-text-primary dark:text-slate-400 dark:hover:text-white hover:bg-surface-light dark:hover:bg-slate-800/60 border border-transparent hover:border-border dark:hover:border-slate-750 rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <DashboardIcon iconKey="search" className="w-5 h-5" />
        </button>

        {/* Notification Bell */}
        <NotificationBell unreadCount={unreadNotifications} onClick={onNotificationsOpen} />

        {/* Dark Mode Toggle */}
        <button
          type="button"
          onClick={toggleDarkMode}
          aria-label="Toggle dark mode"
          className="p-2 text-text-secondary hover:text-text-primary dark:text-slate-400 dark:hover:text-white hover:bg-surface-light dark:hover:bg-slate-800/60 border border-transparent hover:border-border dark:hover:border-slate-750 rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {isDark ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-amber-500">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-slate-750">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          )}
        </button>

        {/* Vertical divider */}
        <div className="w-px h-6 bg-border dark:bg-slate-800" aria-hidden="true" />

        {/* User profile dropdown menu */}
        <ProfileDropdown role={role} userName={user?.name} userEmail={user?.email} />
      </div>
    </header>
  );
}
