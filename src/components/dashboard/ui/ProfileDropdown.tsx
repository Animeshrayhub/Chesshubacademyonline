'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardIcon from './DashboardIcon';
import { logOut } from '@/lib/auth';
import type { DashboardRole } from '@/types/dashboard';

interface ProfileDropdownProps {
  role: DashboardRole;
  userName?: string;
  userEmail?: string;
}

export default function ProfileDropdown({
  role,
  userName = 'Member User',
  userEmail = 'member@chesshubacademy.com',
}: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsOpen(false);
    const result = await logOut();
    if (result.success) {
      router.push('/login');
    }
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation helpers
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const getProfileLink = () => {
    return `/dashboard/${role}/profile`;
  };

  const getSettingsLink = () => {
    return `/dashboard/${role}/settings`;
  };

  return (
    <div className="relative" ref={dropdownRef} onKeyDown={handleKeyDown}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="User menu"
        className="flex items-center gap-2 p-1 border border-border bg-white hover:border-primary/45 rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {/* Avatar Placeholder */}
        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center font-heading text-primary font-bold text-sm">
          {userName.charAt(0)}
        </div>
        <span className="hidden sm:inline text-xs font-semibold text-text-primary px-1">
          {userName}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-white shadow-card-hover z-50 py-1.5 focus:outline-none">
          {/* User info header */}
          <div className="px-4 py-2 border-b border-border">
            <p className="text-sm font-bold text-text-primary truncate">{userName}</p>
            <p className="text-xs text-text-secondary truncate mt-0.5">{userEmail}</p>
          </div>

          {/* Links */}
          <div className="py-1">
            <Link
              href={getProfileLink()}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:bg-surface-light hover:text-primary transition-colors focus-visible:bg-surface-light focus-visible:text-primary focus-visible:outline-none"
            >
              <DashboardIcon iconKey="user" className="w-4 h-4" />
              My Profile
            </Link>
            <Link
              href={getSettingsLink()}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:bg-surface-light hover:text-primary transition-colors focus-visible:bg-surface-light focus-visible:text-primary focus-visible:outline-none"
            >
              <DashboardIcon iconKey="settings" className="w-4 h-4" />
              Settings
            </Link>
          </div>

          <div className="border-t border-border my-1" />

          {/* Logout Action */}
          <div className="py-1">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors focus-visible:bg-red-50 focus-visible:outline-none"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
