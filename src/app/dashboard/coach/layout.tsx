import type { Metadata } from 'next';
import DashboardShell from '@/components/dashboard/layout/DashboardShell';
import { getCurrentUser } from '@/lib/supabase/auth';

export const metadata: Metadata = {
  title: 'Coach Dashboard | ChessHub Academy',
  description: 'Manage students, review homework, take attendance, view classes, and manage lesson recordings.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const userData = user
    ? { name: `${user.firstName} ${user.lastName}`, email: user.email }
    : undefined;

  return (
    <DashboardShell role="coach" user={userData}>
      {children}
    </DashboardShell>
  );
}
