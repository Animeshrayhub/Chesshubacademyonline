'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileNav from './MobileNav';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import { useNotifications } from '@/hooks/useNotifications';
import { getNavForRole } from '@/constants/DASHBOARD_NAV';
import type { DashboardRole } from '@/types/dashboard';

// Dynamic lazy-load modals to keep initial bundle size small and load time fast
const GlobalSearchModal = dynamic(() => import('../ui/GlobalSearchModal'), { ssr: false });
const NotificationPanel = dynamic(() => import('../ui/NotificationPanel'), { ssr: false });

interface DashboardShellProps {
  role: DashboardRole;
  user?: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
  children: React.ReactNode;
}

export default function DashboardShell({ role, user, children }: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const search = useGlobalSearch();
  const notifications = useNotifications();

  const navItems = getNavForRole(role);

  return (
    <div className="flex h-screen w-full max-w-full overflow-hidden bg-surface-light text-text-primary">
      {/* Skip link for keyboard accessibility */}
      <a
        href="#dashboard-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-[60] bg-accent text-surface-dark px-4 py-2 rounded-lg font-semibold text-sm focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Desktop Sidebar (Left Panel) */}
      <Sidebar role={role} navItems={navItems} />

      {/* Mobile Sidebar Navigation Drawer */}
      <MobileNav
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        role={role}
        navItems={navItems}
      />

      {/* Main Content Area Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <Topbar
          role={role}
          user={user}
          onMenuOpen={() => setMobileMenuOpen(true)}
          onSearchOpen={search.openSearch}
          onNotificationsOpen={notifications.openPanel}
          unreadNotifications={notifications.unreadCount}
        />

        {/* Dynamic page content wrapped with scroll wrapper */}
        <main
          id="dashboard-content"
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 focus:outline-none"
          tabIndex={-1}
        >
          <div className="max-w-[1400px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Lazy loaded dialog components */}
      <GlobalSearchModal search={search} />
      <NotificationPanel
        isOpen={notifications.isPanelOpen}
        onClose={notifications.closePanel}
        activeCategory={notifications.activeCategory}
        setActiveCategory={notifications.setActiveCategory}
      />
    </div>
  );
}
