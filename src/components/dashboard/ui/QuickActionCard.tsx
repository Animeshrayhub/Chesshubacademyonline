import Link from 'next/link';
import DashboardIcon from './DashboardIcon';
import type { QuickAction } from '@/types/dashboard';

const COLOR_SCHEMES = {
  blue:   { bg: 'bg-blue-50 hover:bg-blue-100',   icon: 'text-primary',    border: 'border-blue-100' },
  gold:   { bg: 'bg-yellow-50 hover:bg-yellow-100',icon: 'text-accent',     border: 'border-yellow-100' },
  green:  { bg: 'bg-green-50 hover:bg-green-100',  icon: 'text-green-600',  border: 'border-green-100' },
  purple: { bg: 'bg-purple-50 hover:bg-purple-100',icon: 'text-purple-600', border: 'border-purple-100' },
};

interface QuickActionCardProps {
  action: QuickAction;
}

export default function QuickActionCard({ action }: QuickActionCardProps) {
  const { label, description, href, iconKey, colorScheme = 'blue' } = action;
  const colors = COLOR_SCHEMES[colorScheme];

  return (
    <Link
      href={href}
      className={`
        flex items-start gap-3 p-4 rounded-xl border ${colors.border} ${colors.bg}
        transition-colors duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
        group
      `}
    >
      <div className={`w-8 h-8 rounded-lg bg-white border ${colors.border} flex items-center justify-center flex-shrink-0`}>
        <DashboardIcon iconKey={iconKey} className={`w-4 h-4 ${colors.icon}`} />
      </div>
      <div>
        <div className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">
          {label}
        </div>
        <div className="text-xs text-text-secondary mt-0.5">{description}</div>
      </div>
    </Link>
  );
}
