import React from 'react';
import { redirect } from 'next/navigation';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import PuzzleBankRegistry from '@/features/admin/PuzzleBankRegistry';

export const dynamic = 'force-dynamic';

export default async function AdminPuzzlesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?redirectTo=/dashboard/admin/puzzles');
  }

  const admin = createSupabaseAdmin();
  const { data: dbUser } = await admin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (dbUser?.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central Tactical Puzzle Bank"
        subtitle="Manage, create, and bulk-import chess tactical puzzles, FEN positions, solution moves, and theme tags for student practice."
      />
      <PuzzleBankRegistry />
    </div>
  );
}
