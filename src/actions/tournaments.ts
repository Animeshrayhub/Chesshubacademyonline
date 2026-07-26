'use server';

import { revalidatePath } from 'next/cache';
import { saveAcademyTournament, getAcademyTournaments } from '@/lib/tournaments';

export async function addTournamentAction(data: {
  title: string;
  lichessUrl: string;
  date?: string;
  timeControl?: string;
}) {
  const success = await saveAcademyTournament(data);
  if (success) {
    revalidatePath('/dashboard/student');
    revalidatePath('/dashboard/admin');
  }
  return { success };
}

export async function getTournamentsAction() {
  const list = await getAcademyTournaments();
  return { success: true, tournaments: list };
}
