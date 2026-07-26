import PageHeader from '@/components/dashboard/ui/PageHeader';
import SubNav from '@/components/dashboard/layout/SubNav';
import type { SubNavItem } from '@/types/dashboard';

const SETTINGS_TABS: SubNavItem[] = [
  { label: 'General',       href: '/dashboard/student/settings',               iconKey: 'settings' },
  { label: 'Profile',       href: '/dashboard/student/settings/profile',       iconKey: 'user' },
  { label: 'Security',      href: '/dashboard/student/settings/security',      iconKey: 'shield' },
  { label: 'Notifications', href: '/dashboard/student/settings/notifications', iconKey: 'bell' },
  { label: 'Appearance',    href: '/dashboard/student/settings/appearance',    iconKey: 'image' },
  { label: 'Language',      href: '/dashboard/student/settings/language',      iconKey: 'globe' },
];

export default function StudentSettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & Preferences"
        subtitle="Manage display preferences, local timezone, and notification updates."
      />
      <SubNav items={SETTINGS_TABS} />
      <div className="pt-2">{children}</div>
    </div>
  );
}
