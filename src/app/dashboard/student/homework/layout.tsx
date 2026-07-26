import PageHeader from '@/components/dashboard/ui/PageHeader';
import SubNav from '@/components/dashboard/layout/SubNav';
import type { SubNavItem } from '@/types/dashboard';

const HOMEWORK_TABS: SubNavItem[] = [
  { label: 'Overview',          href: '/dashboard/student/homework',           iconKey: 'bookOpen' },
  { label: 'Tactics Puzzles',   href: '/dashboard/student/homework/puzzles',   iconKey: 'puzzle' },
  { label: 'Study Workbooks',   href: '/dashboard/student/homework/workbooks', iconKey: 'clipboard' },
];

export default function StudentHomeworkLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tactical Homework & Studies"
        subtitle="Complete daily interactive tactics puzzles and submit solution pages for your assigned workbooks."
      />
      <SubNav items={HOMEWORK_TABS} />
      <div className="pt-2">{children}</div>
    </div>
  );
}
