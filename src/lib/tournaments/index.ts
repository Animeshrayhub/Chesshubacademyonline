import { createSupabaseAdmin } from '../supabase/admin';

export interface AcademyTournament {
  id: string;
  title: string;
  lichessUrl: string;
  date: string;
  timeControl: string;
  status: 'UPCOMING' | 'LIVE' | 'ENDED';
  createdAt?: string;
}

/**
 * Fetches all official tournaments published by academy coaches/admin.
 */
export async function getAcademyTournaments(): Promise<AcademyTournament[]> {
  try {
    const admin = createSupabaseAdmin();
    const { data } = await admin
      .from('announcements')
      .select('*')
      .eq('target_roles', ['TOURNAMENT'])
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      return data.map((d: any) => {
        try {
          const parsed = JSON.parse(d.body);
          return {
            id: d.id,
            title: d.title,
            lichessUrl: parsed.lichessUrl || d.body,
            date: parsed.date || 'Upcoming Tournament',
            timeControl: parsed.timeControl || '3+0 Blitz',
            status: parsed.status || 'UPCOMING',
            createdAt: d.created_at,
          };
        } catch {
          return {
            id: d.id,
            title: d.title,
            lichessUrl: d.body.startsWith('http') ? d.body : `https://${d.body}`,
            date: 'Upcoming Tournament',
            timeControl: '3+0 Blitz',
            status: 'UPCOMING',
            createdAt: d.created_at,
          };
        }
      });
    }
  } catch (err) {
    console.error('Error loading academy tournaments:', err);
  }

  return [];
}

/**
 * Publishes a new Lichess tournament link.
 */
export async function saveAcademyTournament(data: {
  title: string;
  lichessUrl: string;
  date?: string;
  timeControl?: string;
}): Promise<boolean> {
  try {
    const admin = createSupabaseAdmin();
    const payload = JSON.stringify({
      lichessUrl: data.lichessUrl.startsWith('http') ? data.lichessUrl : `https://${data.lichessUrl}`,
      date: data.date || 'Upcoming Session',
      timeControl: data.timeControl || '3+0 Blitz',
      status: 'UPCOMING',
    });

    const { error } = await admin.from('announcements').insert({
      title: data.title,
      body: payload,
      target_roles: ['TOURNAMENT'],
      is_published: true,
      published_at: new Date().toISOString(),
    });

    return !error;
  } catch {
    return false;
  }
}
