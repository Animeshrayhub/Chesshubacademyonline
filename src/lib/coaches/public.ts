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
 * Filters out archived/disabled users and test records.
 * Merges with static fallbacks to guarantee 4 unique certified coaches.
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
      const filteredUsers = users.filter((u: any) => {
        const fn = u.first_name?.toLowerCase() || '';
        const ln = u.last_name?.toLowerCase() || '';
        const em = u.email?.toLowerCase() || '';

        // Exclude test/demo accounts
        if (fn.includes('arjun') && ln.includes('mehta')) return false;
        if (em === 'coach@chesshub.com' || em === 'coach.alex@chesshub.com') return false;
        if (fn === 'coach' && ln === 'alex') return false;
        if (fn.includes('test') || ln.includes('test')) return false;

        return true;
      });

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
              if (parsed.fideId) fideIdStr = String(parsed.fideId).trim();
              if (parsed.fideRating) fideRatingNum = Number(parsed.fideRating);
              if (parsed.country) countryStr = parsed.country;
            } catch {
              textBio = p.bio;
            }
          }

          const fullName = `${u.first_name} ${u.last_name}`.trim();
          const nameLower = fullName.toLowerCase();

          // Match static fallback to get appropriate default photo if photo_url is missing
          const matchedStatic = COACHES.find((c) => {
            const staticName = c.name.toLowerCase();
            return (
              staticName === nameLower ||
              (u.last_name && u.last_name.length > 2 && staticName.includes(u.last_name.toLowerCase()))
            );
          });

          const defaultPhoto = matchedStatic?.imageUrl || '/coaches/animesh-ray.jpg';
          const photo = fixGoogleDriveUrl(p?.photo_url) || defaultPhoto;

          return {
            id: u.id,
            name: fullName,
            title: p?.title || matchedStatic?.title || 'FIDE Certified Coach',
            fideRating: fideRatingNum || matchedStatic?.fideRating,
            fideId: fideIdStr || matchedStatic?.fideId,
            specialization: matchedStatic?.specialization || 'Tactical Fundamentals & Tournament Preparation',
            experience: p?.experience_years ? `${p.experience_years}+ Years Experience` : matchedStatic?.experience || 'Certified FIDE Trainer',
            students: matchedStatic?.students || 120,
            country: countryStr,
            flag: countryStr.toLowerCase() === 'india' ? '🇮🇳' : '🌐',
            imageUrl: photo,
            bio: textBio || matchedStatic?.bio || '',
            achievements: matchedStatic?.achievements || [
              p?.title || 'FIDE Certified Coach',
              fideRatingNum ? `FIDE Rating: ${fideRatingNum}` : fideIdStr ? `FIDE ID: ${fideIdStr}` : 'Official Instructor',
              `Languages: ${p?.languages?.join(', ') || 'English, Hindi'}`,
            ],
            languages: p?.languages || matchedStatic?.languages || ['English', 'Hindi'],
            coachingMode: 'Online • 1-on-1 • Group Classes',
          };
        });

        if (dbCoaches.length > 0) {
          // Normalize names for deduplication
          const getBaseName = (n: string) => n.toLowerCase().replace(/^(coach|fide|gm)\s+/i, '').trim();
          const dbNames = new Set(dbCoaches.map((c) => getBaseName(c.name)));

          const fallbackRemaining = COACHES.filter((c) => {
            const baseCName = getBaseName(c.name);
            for (const existing of dbNames) {
              if (existing.includes(baseCName) || baseCName.includes(existing)) return false;
            }
            return true;
          });

          return [...dbCoaches, ...fallbackRemaining].slice(0, 4);
        }
      }
    }
  } catch (err) {
    console.error('Error fetching public coaches:', err);
  }

  return COACHES;
}

