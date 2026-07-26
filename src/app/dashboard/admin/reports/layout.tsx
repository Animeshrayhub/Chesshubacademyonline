import PageHeader from '@/components/dashboard/ui/PageHeader';
import SubNav from '@/components/dashboard/layout/SubNav';
import type { SubNavItem } from '@/types/dashboard';

const REPORTS_TABS: SubNavItem[] = [
  { label: 'Overview',          href: '/dashboard/admin/reports',           iconKey: 'barChart' },
  { label: 'Students',          href: '/dashboard/admin/reports/students',   iconKey: 'users' },
  { label: 'Attendance',        href: '/dashboard/admin/reports/attendance', iconKey: 'checkSquare' },
  { label: 'Homework',          href: '/dashboard/admin/reports/homework',   iconKey: 'bookOpen' },
  { label: 'Coach Performance', href: '/dashboard/admin/reports/coaches',    iconKey: 'graduationCap' },
  { label: 'Demo Bookings',     href: '/dashboard/admin/reports/bookings',   iconKey: 'calendarDays' },
  { label: 'Revenue',           href: '/dashboard/admin/reports/revenue',    iconKey: 'dollarSign' },
  { label: 'Analytics',         href: '/dashboard/admin/reports/analytics',  iconKey: 'activity' },
];

export default function AdminReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Academy Analytics & Reports"
        subtitle="Track student performance, attendance metrics, curriculum completions, bookings growth, and revenue statistics."
      />
      <SubNav items={REPORTS_TABS} />
      <div className="pt-2">{children}</div>
    </div>
  );
}
