import DashboardIcon from './DashboardIcon';
import type { StatCardData, TrendDirection } from '@/types/dashboard';

const COLOR_SCHEMES = {
  blue:   { bg: 'bg-blue-50',   icon: 'text-primary',       border: 'border-blue-100' },
  gold:   { bg: 'bg-yellow-50', icon: 'text-accent',        border: 'border-yellow-100' },
  green:  { bg: 'bg-green-50',  icon: 'text-green-600',     border: 'border-green-100' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600',    border: 'border-purple-100' },
};

const TREND_STYLES: Record<TrendDirection, { color: string; prefix: string }> = {
  up:      { color: 'text-green-600',  prefix: '↑' },
  down:    { color: 'text-red-500',    prefix: '↓' },
  neutral: { color: 'text-text-secondary', prefix: '→' },
};

interface StatCardProps {
  data: StatCardData;
}

export default function StatCard({ data }: StatCardProps) {
  const { label, value, trend, trendValue, iconKey, colorScheme = 'blue' } = data;
  const colors = COLOR_SCHEMES[colorScheme];
  const trendStyle = trend ? TREND_STYLES[trend] : null;

  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-5 flex flex-col gap-4">
      {/* Icon + label row */}
      <div className="flex items-center justify-between">
        <dt className="text-sm font-medium text-text-secondary">{label}</dt>
        <div className={`w-9 h-9 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center`}>
          <DashboardIcon iconKey={iconKey} className={`w-4.5 h-4.5 ${colors.icon}`} />
        </div>
      </div>

      {/* Value */}
      <dd className="text-3xl font-bold text-text-primary tabular-nums">{value}</dd>

      {/* Trend */}
      {trendStyle && trendValue && (
        <div className={`text-xs font-medium ${trendStyle.color} flex items-center gap-1`}>
          <span aria-hidden="true">{trendStyle.prefix}</span>
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
}
