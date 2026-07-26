'use client';

import { useId } from 'react';
import DashboardIcon from './DashboardIcon';
import type { NotificationCategory, NotificationItem } from '@/types/dashboard';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeCategory: NotificationCategory | 'all';
  setActiveCategory: (cat: NotificationCategory | 'all') => void;
}

const CATEGORIES: { value: NotificationCategory | 'all'; label: string; iconKey: any }[] = [
  { value: 'all', label: 'All', iconKey: 'bell' },
  { value: 'homework', label: 'Homework', iconKey: 'bookOpen' },
  { value: 'classes', label: 'Classes', iconKey: 'video' },
  { value: 'announcements', label: 'News', iconKey: 'megaphone' },
  { value: 'certificates', label: 'Awards', iconKey: 'award' },
  { value: 'bookings', label: 'Bookings', iconKey: 'calendarDays' },
  { value: 'system', label: 'System', iconKey: 'settings' },
];

export default function NotificationPanel({
  isOpen,
  onClose,
  activeCategory,
  setActiveCategory,
}: NotificationPanelProps) {
  const panelLabelId = useId();

  if (!isOpen) return null;

  // Static placeholder notifications matching categories
  const placeholders: NotificationItem[] = [
    {
      id: 'nt-1',
      category: 'classes',
      title: 'Class scheduled tomorrow',
      description: 'Your next private chess class is scheduled for tomorrow at 10:00 AM.',
      timestamp: '2 hours ago',
      read: false,
    },

    {
      id: 'nt-2',
      category: 'homework',
      title: 'New puzzle assigned',
      description: 'Daily tactics puzzle "Mate in 3" is now available in your study dashboard.',
      timestamp: '5 hours ago',
      read: false,
    },
    {
      id: 'nt-3',
      category: 'announcements',
      title: 'July Newsletter Released',
      description: 'Check out academy achievements and schedule changes for this month.',
      timestamp: '1 day ago',
      read: true,
    },
  ];

  const filtered = placeholders.filter(
    (item) => activeCategory === 'all' || item.category === activeCategory
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-surface-dark/20 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out Panel */}
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={panelLabelId}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-border shadow-card-hover flex flex-col h-full transform transition-transform duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 id={panelLabelId} className="text-base font-semibold text-text-primary">
            Notifications
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notification panel"
            className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-light border border-transparent hover:border-border rounded-lg transition-colors duration-150"
          >
            <DashboardIcon iconKey="x" className="w-5 h-5" />
          </button>
        </div>

        {/* Categories Tab Strip */}
        <div className="border-b border-border bg-surface-light px-4 overflow-x-auto flex gap-1 scrollbar-none py-2">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setActiveCategory(cat.value)}
                aria-pressed={isActive}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border whitespace-nowrap transition-all duration-150
                  ${
                    isActive
                      ? 'bg-white border-border text-primary shadow-xs'
                      : 'bg-transparent border-transparent text-text-secondary hover:text-text-primary hover:bg-white/50'
                  }
                `}
              >
                <DashboardIcon iconKey={cat.iconKey} className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" aria-live="polite">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-text-secondary">
              <DashboardIcon iconKey="bell" className="w-10 h-10 text-text-secondary/35 mb-3" />
              <p className="text-sm font-medium">All caught up!</p>
              <p className="text-xs mt-1">No notifications under this category.</p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all duration-150 relative ${
                  item.read ? 'bg-white border-border' : 'bg-blue-50/40 border-blue-100'
                }`}
              >
                {!item.read && (
                  <span
                    className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary"
                    aria-label="Unread"
                  />
                )}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-border flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                    <DashboardIcon
                      iconKey={
                        item.category === 'homework'
                          ? 'bookOpen'
                          : item.category === 'classes'
                          ? 'video'
                          : item.category === 'announcements'
                          ? 'megaphone'
                          : item.category === 'certificates'
                          ? 'award'
                          : item.category === 'bookings'
                          ? 'calendarDays'
                          : 'settings'
                      }
                      className="w-4 h-4 text-text-secondary"
                    />
                  </div>
                  <div className="pr-4">
                    <h3 className="text-sm font-semibold text-text-primary">{item.title}</h3>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                      {item.description}
                    </p>
                    <span className="text-[10px] text-text-secondary/70 mt-2 block">
                      {item.timestamp}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
