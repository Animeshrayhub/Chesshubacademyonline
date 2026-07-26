import DashboardIcon from './DashboardIcon';
import type { DashboardIconKey } from '@/types/dashboard';

interface EmptyStateProps {
  iconKey?: DashboardIconKey;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({
  iconKey = 'folder',
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-surface-light border border-border flex items-center justify-center mb-4">
        <DashboardIcon iconKey={iconKey} className="w-7 h-7 text-text-secondary/50" />
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-text-secondary max-w-xs leading-relaxed mb-4">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
