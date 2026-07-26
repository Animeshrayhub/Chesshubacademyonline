import PageHeader from '@/components/dashboard/ui/PageHeader';
import SubNav from '@/components/dashboard/layout/SubNav';
import type { SubNavItem } from '@/types/dashboard';

const SETTINGS_TABS: SubNavItem[] = [
  { label: 'General',       href: '/dashboard/admin/settings',               iconKey: 'settings' },
  { label: 'Profile',       href: '/dashboard/admin/settings/profile',       iconKey: 'user' },
  { label: 'Security',      href: '/dashboard/admin/settings/security',      iconKey: 'shield' },
  { label: 'Notifications', href: '/dashboard/admin/settings/notifications', iconKey: 'bell' },
  { label: 'Appearance',    href: '/dashboard/admin/settings/appearance',    iconKey: 'image' },
  { label: 'Language',      href: '/dashboard/admin/settings/language',      iconKey: 'globe' },
  { label: 'System',        href: '/dashboard/admin/settings/system',        iconKey: 'activity' },
  { label: 'Integrations',  href: '/dashboard/admin/settings/integrations',  iconKey: 'link' },
];

export default function AdminSettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Portal Systems Settings"
        subtitle="Manage overall application preferences, email notifications, appearance themes, and API integrations."
      />
      <SubNav items={SETTINGS_TABS} />
      <div className="pt-2">{children}</div>
    </div>
  );
}
