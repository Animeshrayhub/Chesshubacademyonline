import PageHeader from '@/components/dashboard/ui/PageHeader';
import SubNav from '@/components/dashboard/layout/SubNav';
import type { SubNavItem } from '@/types/dashboard';

const RECORDINGS_TABS: SubNavItem[] = [
  { label: 'All Recordings',      href: '/dashboard/coach/recordings',            iconKey: 'playCircle' },
  { label: 'Live Classes',        href: '/dashboard/coach/recordings/live-classes', iconKey: 'video' },
  { label: 'Coach Lessons',       href: '/dashboard/coach/recordings/lessons',      iconKey: 'graduationCap' },
  { label: 'Tournament Analysis', href: '/dashboard/coach/recordings/tournament',   iconKey: 'activity' },
  { label: 'Opening Library',     href: '/dashboard/coach/recordings/openings',     iconKey: 'bookOpen' },
  { label: 'Endgame Library',     href: '/dashboard/coach/recordings/endgame',      iconKey: 'puzzle' },
];

export default function CoachRecordingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Academy Recordings Library"
        subtitle="Access live class archives, private coaching lessons, opening guides, and tactical endgame workshops."
      />
      <SubNav items={RECORDINGS_TABS} />
      <div className="pt-2">{children}</div>
    </div>
  );
}
