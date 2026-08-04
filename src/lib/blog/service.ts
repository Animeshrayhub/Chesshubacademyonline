import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { fixGoogleDriveUrl } from '@/utils/imageUtils';
import type { BlogPost, BlogCategory } from '@/types';

export interface CreateBlogPostInput {
  title: string;
  category: BlogCategory | string;
  readingTimeMinutes: number;
  excerpt: string;
  content: string;
  imageUrl?: string;
  status: 'published' | 'draft';
  tags?: string[];
  featured?: boolean;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Fetches all published blog posts for public website.
 */
export async function getPublicBlogPosts(): Promise<BlogPost[]> {
  try {
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Error fetching public blog posts:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt || '',
      content: row.content || '',
      category: (row.category || 'Parent Guide') as BlogCategory,
      author: row.author || 'ChessHub Academy Team',
      authorTitle: 'Master Instructor',
      authorImageUrl: '/coaches/animesh-ray.jpg',
      imageUrl: fixGoogleDriveUrl(row.featured_image_url) || 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800&h=500&fit=crop&q=85',
      publishedAt: row.published_at || row.created_at,
      featured: Boolean(row.featured),
      readingTimeMinutes: Number(row.reading_time_minutes) || 5,
      tags: row.tags || [],
    }));
  } catch (err) {
    console.error('Error in getPublicBlogPosts:', err);
    return [];
  }
}

/**
 * Fetches a single public blog post by slug.
 */
export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      slug: data.slug,
      title: data.title,
      excerpt: data.excerpt || '',
      content: data.content || '',
      category: (data.category || 'Parent Guide') as BlogCategory,
      author: data.author || 'ChessHub Academy Team',
      authorTitle: 'Master Instructor',
      authorImageUrl: '/coaches/animesh-ray.jpg',
      imageUrl: fixGoogleDriveUrl(data.featured_image_url) || 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800&h=500&fit=crop&q=85',
      publishedAt: data.published_at || data.created_at,
      featured: Boolean(data.featured),
      readingTimeMinutes: Number(data.reading_time_minutes) || 5,
      tags: data.tags || [],
    };
  } catch (err) {
    console.error('Error in getBlogPostBySlug:', err);
    return null;
  }
}

/**
 * Fetches all blog posts for admin management (both published and drafts).
 */
export async function getAdminBlogPosts(statusFilter?: 'published' | 'draft'): Promise<any[]> {
  try {
    const admin = createSupabaseAdmin();
    let query = admin.from('blog_posts').select('*').order('created_at', { ascending: false });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error in getAdminBlogPosts:', err);
    return [];
  }
}

/**
 * Saves a blog post (Create or Update).
 */
export async function saveBlogPost(input: CreateBlogPostInput, id?: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const admin = createSupabaseAdmin();
    const slug = slugify(input.title);
    const formattedImage = fixGoogleDriveUrl(input.imageUrl);

    const payload: any = {
      title: input.title,
      slug,
      excerpt: input.excerpt,
      content: input.content,
      featured_image_url: formattedImage || null,
      status: input.status,
      updated_at: new Date().toISOString(),
    };

    if (input.status === 'published') {
      payload.published_at = new Date().toISOString();
    }

    if (id) {
      const { data, error } = await admin.from('blog_posts').update(payload).eq('id', id).select();
      if (error) return { success: false, error: error.message };
      return { success: true, data: data?.[0] };
    } else {
      payload.created_at = new Date().toISOString();
      const { data, error } = await admin.from('blog_posts').insert([payload]).select();
      if (error) return { success: false, error: error.message };
      return { success: true, data: data?.[0] };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Deletes a blog post by ID.
 */
export async function deleteBlogPost(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createSupabaseAdmin();
    const { error } = await admin.from('blog_posts').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
