'use client';

import DashboardIcon from './DashboardIcon';

interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
}

export default function NotificationBell({ unreadCount, onClick }: NotificationBellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={unreadCount > 0 ? `View notifications, ${unreadCount} unread` : 'View notifications'}
      className="relative p-2 text-text-secondary hover:text-text-primary hover:bg-surface-light border border-transparent hover:border-border rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <DashboardIcon iconKey="bell" className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
        </span>
      )}
    </button>
  );
}
