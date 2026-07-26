import DashboardIcon from './DashboardIcon';
import type { ActivityItem } from '@/types/dashboard';

interface ActivityFeedProps {
  items: ActivityItem[];
  title?: string;
}

export default function ActivityFeed({ items, title = 'Recent Activity' }: ActivityFeedProps) {
  return (
    <section aria-labelledby="activity-heading" className="bg-white rounded-2xl border border-border shadow-card">
      <div className="px-5 py-4 border-b border-border">
        <h2 id="activity-heading" className="text-sm font-semibold text-text-primary">
          {title}
        </h2>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-text-secondary">
          No recent activity to display.
        </div>
      ) : (
        <ol className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 px-5 py-3.5">
              <div className="w-7 h-7 rounded-lg bg-surface-light border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
                <DashboardIcon iconKey={item.iconKey} className="w-3.5 h-3.5 text-text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary leading-snug">{item.description}</p>
                <time
                  dateTime={item.timestamp}
                  className="text-xs text-text-secondary mt-0.5 block"
                >
                  {item.timestamp}
                </time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
