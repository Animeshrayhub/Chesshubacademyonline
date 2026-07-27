import { createSupabaseAdmin } from '../supabase/admin';

export interface GalleryPhoto {
  id: string;
  title: string;
  imageUrl: string;
  category?: string;
  sourceUrl?: string;
  createdAt: string;
}

export const DEFAULT_DRIVE_FOLDER_ID = '1AvSHNysv8fda_6b4M6FliRi0aU4aSNLg';

/**
 * Converts Google Drive file / share link into a direct high-res web image URL.
 */
export function convertGoogleDriveUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  const driveMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/id=([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    const fileId = driveMatch[1];
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  return trimmed;
}

/**
 * Fetches public photos for website gallery.
 */
export async function getPublicGalleryPhotos(): Promise<GalleryPhoto[]> {
  try {
    const admin = createSupabaseAdmin();
    const { data } = await admin
      .from('announcements')
      .select('*')
      .contains('target_roles', ['GALLERY'])
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      return data.map((d: any) => {
        try {
          const parsed = JSON.parse(d.body);
          return {
            id: d.id,
            title: d.title || 'Academy Moment',
            imageUrl: convertGoogleDriveUrl(parsed.imageUrl || parsed.url || parsed.rawUrl || ''),
            sourceUrl: parsed.sourceUrl || '',
            createdAt: d.created_at,
          };
        } catch {
          return {
            id: d.id,
            title: d.title || 'Academy Moment',
            imageUrl: convertGoogleDriveUrl(d.body),
            createdAt: d.created_at,
          };
        }
      });
    }
  } catch (err) {
    console.error('Error fetching gallery photos:', err);
  }

  // Default showcase gallery photos if DB empty
  return [
    {
      id: 'g-1',
      title: 'Academy Live Tournament Finals',
      imageUrl: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800&h=600&fit=crop&q=85',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'g-2',
      title: 'Grandmaster Live Masterclass Session',
      imageUrl: 'https://images.unsplash.com/photo-1580541832626-2a7131ee809f?w=800&h=600&fit=crop&q=85',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'g-3',
      title: 'Junior Champions Award Ceremony',
      imageUrl: 'https://images.unsplash.com/photo-1560174038-da43ac74f01b?w=800&h=600&fit=crop&q=85',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'g-4',
      title: 'Interactive Tactical Puzzle Workshop',
      imageUrl: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800&h=600&fit=crop&q=85',
      createdAt: new Date().toISOString(),
    },
  ];
}

/**
 * Saves a new photo link to the gallery.
 */
export async function addGalleryPhoto(title: string, imageUrl: string): Promise<boolean> {
  try {
    const admin = createSupabaseAdmin();
    const finalUrl = convertGoogleDriveUrl(imageUrl);
    const payload = JSON.stringify({ imageUrl: finalUrl, rawUrl: imageUrl });

    const { error } = await admin.from('announcements').insert({
      title: title || 'Academy Gallery Photo',
      body: payload,
      target_roles: ['GALLERY'],
      is_published: true,
    });

    return !error;
  } catch {
    return false;
  }
}

/**
 * Deletes a gallery photo by ID.
 */
export async function deleteGalleryPhoto(id: string): Promise<boolean> {
  try {
    const admin = createSupabaseAdmin();
    const { error } = await admin.from('announcements').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}
