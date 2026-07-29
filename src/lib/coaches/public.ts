import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { COACHES } from '@/constants/COACHES';
import type { Coach } from '@/types';

/**
 * Fixes Google Drive sharing URLs into direct image URLs.
 */
function fixGoogleDriveUrl(url?: string): string {
  if (!url) return '';
  if (url.includes('drive.google.com') && url.includes('id=')) {
    const idMatch = url.match(/id=([^&]+)/);
    if (idMatch && idMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
    }
  }
  return url;
}

/**
 * Fetches public coaches list dynamically from Supabase database.
 * Filters out archived/disabled users and Arjun Mehta mock records.
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
      const filteredUsers = users.filter(
        (u: any) =>
          !u.first_name?.toLowerCase().includes('arjun') &&
          !u.last_name?.toLowerCase().includes('mehta') &&
          u.email !== 'coach@chesshub.com'
      );

      if (filteredUsers.length > 0) {
        const userIds = filteredUsers.map((u: any) => u.id);

        // 2. Fetch coach profiles
        const { data: profiles } = await admin
          .from('coach_profiles')
          .select('*')
          .in('user_id', userIds);

        const profileMap = new Map<string, any>((profiles || []).map((p: any) => [p.user_id, p]));

        const dbCoaches: Coach[] = filteredUsers.map((u: any) => {
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
    }
  } catch (err) {
    console.error('Error fetching public coaches:', err);
  }

  return COACHES;
}
