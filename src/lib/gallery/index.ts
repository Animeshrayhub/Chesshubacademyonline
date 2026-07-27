import { createSupabaseAdmin } from '../supabase/admin';

export interface GalleryItem {
  id: string;
  title: string;
  imageUrl: string;
  category: 'Tournaments' | 'Classes' | 'Events' | 'Certificates';
  isPublished: boolean;
  createdAt: string;
}

/**
 * Converts Google Drive view/folder/file links into direct web image URLs.
 */
export function fixGoogleDriveUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();

  // Match Google Drive file ID: /d/FILE_ID/ or id=FILE_ID
  const driveMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/id=([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    const fileId = driveMatch[1];
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  return trimmed;
}

const DEFAULT_GALLERY: GalleryItem[] = [
  {
    id: 'g-1',
    title: 'FIDE Rated State Championship Tournament',
    imageUrl: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800&h=600&fit=crop&q=85',
    category: 'Tournaments',
    isPublished: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'g-2',
    title: 'Grandmaster Live Tactical Workshop & Analysis',
    imageUrl: 'https://images.unsplash.com/photo-1580541832626-2a7131ee809f?w=800&h=600&fit=crop&q=85',
    category: 'Classes',
    isPublished: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'g-3',
    title: 'Academy Blitz Arena Trophy Winners',
    imageUrl: 'https://images.unsplash.com/photo-1560174038-da43ac74f01b?w=800&h=600&fit=crop&q=85',
    category: 'Events',
    isPublished: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'g-4',
    title: 'FIDE Certified Student Graduation & Honors',
    imageUrl: 'https://images.unsplash.com/photo-1586165368502-1bad197a6461?w=800&h=600&fit=crop&q=85',
    category: 'Certificates',
    isPublished: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'g-5',
    title: 'Junior International Open Masterclass',
    imageUrl: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&h=600&fit=crop&q=85',
    category: 'Tournaments',
    isPublished: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'g-6',
    title: 'Simultaneous Chess Exhibition with Grandmasters',
    imageUrl: 'https://images.unsplash.com/photo-1528819622765-d6bcf132f793?w=800&h=600&fit=crop&q=85',
    category: 'Events',
    isPublished: true,
    createdAt: new Date().toISOString(),
  },
];

/**
 * Adds a new photo item to the gallery (Admin).
 */
export async function addGalleryPhoto(data: {
  title: string;
  imageUrl: string;
  category?: 'Tournaments' | 'Classes' | 'Events' | 'Certificates';
}): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createSupabaseAdmin();
    const formattedUrl = fixGoogleDriveUrl(data.imageUrl);
    const category = data.category || 'Events';

    const payload = JSON.stringify({
      imageUrl: formattedUrl,
      rawUrl: data.imageUrl,
      category,
    });

    const { error } = await admin.from('announcements').insert({
      title: data.title,
      body: payload,
      target_roles: ['GALLERY'],
      is_published: true,
    });

    if (error) {
      console.error('Failed to insert gallery photo:', error);
      return { success: false, error: 'Database save error' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error adding gallery photo:', err);
    return { success: false, error: err?.message || 'Server error' };
  }
}

/**
 * Fetches all published gallery photos for public display.
 */
export async function getPublicGallery(): Promise<GalleryItem[]> {
  try {
    const admin = createSupabaseAdmin();
    const { data } = await admin
      .from('announcements')
      .select('*')
      .contains('target_roles', ['GALLERY'])
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      const dbItems: GalleryItem[] = data.map((d: any) => {
        try {
          const parsed = JSON.parse(d.body);
          return {
            id: d.id,
            title: d.title,
            imageUrl: fixGoogleDriveUrl(parsed.imageUrl || parsed.rawUrl),
            category: parsed.category || 'Events',
            isPublished: true,
            createdAt: d.created_at,
          };
        } catch {
          return {
            id: d.id,
            title: d.title,
            imageUrl: fixGoogleDriveUrl(d.body),
            category: 'Events',
            isPublished: true,
            createdAt: d.created_at,
          };
        }
      });

      return [...dbItems, ...DEFAULT_GALLERY];
    }
  } catch (err) {
    console.error('Error fetching public gallery:', err);
  }

  return DEFAULT_GALLERY;
}

/**
 * Fetches all gallery photos (Published & Unpublished) for Admin.
 */
export async function getAdminGallery(): Promise<GalleryItem[]> {
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
            title: d.title,
            imageUrl: fixGoogleDriveUrl(parsed.imageUrl || parsed.rawUrl),
            category: parsed.category || 'Events',
            isPublished: !!d.is_published,
            createdAt: d.created_at,
          };
        } catch {
          return {
            id: d.id,
            title: d.title,
            imageUrl: fixGoogleDriveUrl(d.body),
            category: 'Events',
            isPublished: !!d.is_published,
            createdAt: d.created_at,
          };
        }
      });
    }
  } catch (err) {
    console.error('Error loading admin gallery:', err);
  }

  return [];
}

/**
 * Toggles published state or deletes gallery item.
 */
export async function toggleGalleryPhotoPublished(id: string, isPublished: boolean): Promise<boolean> {
  try {
    const admin = createSupabaseAdmin();
    const { error } = await admin.from('announcements').update({ is_published: isPublished }).eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteGalleryPhoto(id: string): Promise<boolean> {
  try {
    const admin = createSupabaseAdmin();
    const { error } = await admin.from('announcements').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}
