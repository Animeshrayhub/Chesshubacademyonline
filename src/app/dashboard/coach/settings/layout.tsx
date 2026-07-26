import PageHeader from '@/components/dashboard/ui/PageHeader';
import SubNav from '@/components/dashboard/layout/SubNav';
import type { SubNavItem } from '@/types/dashboard';

const SETTINGS_TABS: SubNavItem[] = [
  { label: 'General',       href: '/dashboard/coach/settings',               iconKey: 'settings' },
  { label: 'Profile',       href: '/dashboard/coach/settings/profile',       iconKey: 'user' },
  { label: 'Security',      href: '/dashboard/coach/settings/security',      iconKey: 'shield' },
  { label: 'Notifications', href: '/dashboard/coach/settings/notifications', iconKey: 'bell' },
  { label: 'Appearance',    href: '/dashboard/coach/settings/appearance',    iconKey: 'image' },
  { label: 'Language',      href: '/dashboard/coach/settings/language',      iconKey: 'globe' },
];

export default function CoachSettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & Preferences"
        subtitle="Manage your coaching availability schedules, personal profile details, and account security."
      />
      <SubNav items={SETTINGS_TABS} />
      <div className="pt-2">{children}</div>
    </div>
  );
}
