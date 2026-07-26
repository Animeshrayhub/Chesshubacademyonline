import type { Metadata } from 'next';
import DashboardShell from '@/components/dashboard/layout/DashboardShell';
import { getCurrentUser } from '@/lib/supabase/auth';

export const metadata: Metadata = {
  title: 'Admin Dashboard | ChessHub Academy',
  description: 'Manage students, coaches, bookings, classes, homework, announcements, and blog posts.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const userData = user
    ? { name: `${user.firstName} ${user.lastName}`, email: user.email }
    : undefined;

  return (
    <DashboardShell role="admin" user={userData}>
      {children}
    </DashboardShell>
  );
}
