'use client';

import { useState } from 'react';
import type { NotificationCategory } from '@/types/dashboard';

interface UseNotificationsReturn {
  isPanelOpen: boolean;
  activeCategory: NotificationCategory | 'all';
  unreadCount: number;
  openPanel: () => void;
  closePanel: () => void;
  setActiveCategory: (cat: NotificationCategory | 'all') => void;
}

export function useNotifications(): UseNotificationsReturn {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<NotificationCategory | 'all'>('all');

  // Placeholder unread count — replaced with real Supabase subscription in Phase 4
  const unreadCount = 0;

  return {
    isPanelOpen,
    activeCategory,
    unreadCount,
    openPanel: () => setIsPanelOpen(true),
    closePanel: () => setIsPanelOpen(false),
    setActiveCategory,
  };
}
