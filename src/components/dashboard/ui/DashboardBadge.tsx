import { ROLE_LABELS, ROLE_COLORS } from '@/constants/DASHBOARD_NAV';
import type { DashboardRole } from '@/types/dashboard';

interface DashboardBadgeProps {
  role: DashboardRole;
  size?: 'sm' | 'md';
}

export default function DashboardBadge({ role, size = 'md' }: DashboardBadgeProps) {
  const label = ROLE_LABELS[role];
  const colorClass = ROLE_COLORS[role];
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${colorClass} ${sizeClass}`}
      aria-label={`User role: ${label}`}
    >
      {label}
    </span>
  );
}
