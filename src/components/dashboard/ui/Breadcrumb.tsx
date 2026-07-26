import Link from 'next/link';
import DashboardIcon from './DashboardIcon';
import type { BreadcrumbItem } from '@/types/dashboard';

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5">
      <ol className="flex items-center gap-1.5 flex-wrap">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center gap-1.5">
              {index > 0 && (
                <DashboardIcon
                  iconKey="chevronRight"
                  className="w-3.5 h-3.5 text-text-secondary/40 flex-shrink-0"
                />
              )}
              {isLast || !item.href ? (
                <span
                  className="text-sm font-medium text-text-primary"
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
