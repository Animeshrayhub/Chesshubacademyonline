import PageHeader from '@/components/dashboard/ui/PageHeader';
import SubNav from '@/components/dashboard/layout/SubNav';
import type { SubNavItem } from '@/types/dashboard';

const RECORDINGS_TABS: SubNavItem[] = [
  { label: 'All Videos',        href: '/dashboard/student/recordings',            iconKey: 'playCircle' },
  { label: 'My Classes',        href: '/dashboard/student/recordings/live-classes', iconKey: 'video' },
  { label: 'Private Lessons',   href: '/dashboard/student/recordings/lessons',      iconKey: 'graduationCap' },
  { label: 'Tournament Prep',   href: '/dashboard/student/recordings/tournament',   iconKey: 'activity' },
  { label: 'Opening Library',   href: '/dashboard/student/recordings/openings',     iconKey: 'bookOpen' },
  { label: 'Endgame Studies',   href: '/dashboard/student/recordings/endgame',      iconKey: 'puzzle' },
];

export default function StudentRecordingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Session Archives & Vault"
        subtitle="Review recorded archives of your live classes, private session reviews, opening theories, and endgames."
      />
      <SubNav items={RECORDINGS_TABS} />
      <div className="pt-2">{children}</div>
    </div>
  );
}
