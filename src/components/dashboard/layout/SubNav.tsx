'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import DashboardIcon from '../ui/DashboardIcon';
import type { SubNavItem } from '@/types/dashboard';

interface SubNavProps {
  items: SubNavItem[];
}

export default function SubNav({ items }: SubNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Secondary navigation" className="border-b border-border mb-6">
      <ul className="flex gap-4 overflow-x-auto scrollbar-none pb-px">
        {items.map((item) => {
          // Strict active matching or starting path match for general overview vs specific sub-routes
          const isActive = pathname === item.href;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`
                  flex items-center gap-1.5 px-1 py-3 text-sm font-semibold border-b-2 transition-all duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-t-md
                  ${
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
                  }
                `}
              >
                {item.iconKey && (
                  <DashboardIcon iconKey={item.iconKey} className="w-4 h-4 flex-shrink-0" />
                )}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
