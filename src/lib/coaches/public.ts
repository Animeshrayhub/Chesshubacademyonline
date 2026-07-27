import { createSupabaseAdmin } from '../supabase/admin';
import { COACHES } from '@/constants/COACHES';
import type { Coach } from '@/types';

/**
 * Converts Google Drive view links to direct image web URLs.
 */
function fixGoogleDriveUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const driveMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/id=([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  }
  return trimmed;
}

/**
 * Fetches all active coaches from Supabase database for public website display.
 * Merges with static fallbacks if DB contains fewer than 4 coaches.
 */
export async function getPublicCoachesList(): Promise<Coach[]> {
  try {
    const admin = createSupabaseAdmin();

    // 1. Fetch active coach users
    const { data: users } = await admin
      .from('users')
      .select('id, first_name, last_name, email, is_active')
      .eq('role', 'COACH')
      .eq('is_active', true)
      .is('archived_at', null);

    if (users && users.length > 0) {
      const userIds = users.map((u: any) => u.id);

      // 2. Fetch coach profiles
      const { data: profiles } = await admin
        .from('coach_profiles')
        .select('*')
        .in('user_id', userIds);

      const profileMap = new Map<string, any>((profiles || []).map((p: any) => [p.user_id, p]));

      const dbCoaches: Coach[] = users.map((u: any) => {
        const p: any = profileMap.get(u.id);

        let textBio = 'Experienced FIDE coach dedicated to student improvement and tactical mastery.';
        let fideIdStr: string | undefined = undefined;
        let fideRatingNum: number | undefined = undefined;
        let countryStr = 'India';

        if (p?.bio) {
          try {
            const parsed = JSON.parse(p.bio);
            textBio = parsed.text || textBio;
            if (parsed.fideId) fideIdStr = String(parsed.fideId);
            if (parsed.fideRating) fideRatingNum = Number(parsed.fideRating);
            if (parsed.country) countryStr = parsed.country;
          } catch {
            textBio = p.bio;
          }
        }

        const photo = fixGoogleDriveUrl(p?.photo_url) || '/coaches/animesh-ray.jpg';

        return {
          id: u.id,
          name: `${u.first_name} ${u.last_name}`,
          title: p?.title || 'FIDE Certified Coach',
          fideRating: fideRatingNum,
          fideId: fideIdStr,
          specialization: 'Tactical Fundamentals & Tournament Preparation',
          experience: p?.experience_years ? `${p.experience_years}+ Years Experience` : 'Certified FIDE Trainer',
          students: 120,
          country: countryStr,
          flag: countryStr.toLowerCase() === 'india' ? '🇮🇳' : '🌐',
          imageUrl: photo,
          bio: textBio,
          achievements: [
            p?.title || 'FIDE Certified Coach',
            fideRatingNum ? `FIDE Rating: ${fideRatingNum}` : fideIdStr ? `FIDE ID: ${fideIdStr}` : 'Official Instructor',
            `Languages: ${p?.languages?.join(', ') || 'English, Hindi'}`,
          ],
          languages: p?.languages || ['English', 'Hindi'],
          coachingMode: 'Online • 1-on-1 • Group Classes',
        };
      });

      if (dbCoaches.length > 0) {
        const dbNames = new Set(dbCoaches.map((c) => c.name.toLowerCase()));
        const fallbackRemaining = COACHES.filter((c) => !dbNames.has(c.name.toLowerCase()));
        return [...dbCoaches, ...fallbackRemaining];
      }
    }
  } catch (err) {
    console.error('Error fetching public coaches:', err);
  }

  return COACHES;
}
