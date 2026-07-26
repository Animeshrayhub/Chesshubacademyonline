import type { Metadata } from 'next';
import DashboardShell from '@/components/dashboard/layout/DashboardShell';
import { getCurrentUser } from '@/lib/supabase/auth';

export const metadata: Metadata = {
  title: 'Student Dashboard | ChessHub Academy',
  description: 'View scheduled private lessons, study workbook chapters, complete homework puzzles, and access recording vault.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const userData = user
    ? { name: `${user.firstName} ${user.lastName}`, email: user.email }
    : undefined;

  return (
    <DashboardShell role="student" user={userData}>
      {children}
    </DashboardShell>
  );
}
