import { createSupabaseAdmin } from '../supabase/admin';
import { TESTIMONIALS } from '@/constants/TESTIMONIALS';

export interface ReviewItem {
  id: string;
  name: string;
  role: 'Parent' | 'Student';
  rating: number;
  quote: string;
  location?: string;
  result?: string;
  isApproved: boolean;
  createdAt: string;
}

/**
 * Submits a new parent/student review (Pending Admin Approval).
 */
export async function submitParentReview(data: {
  name: string;
  role: 'Parent' | 'Student';
  rating: number;
  quote: string;
  location?: string;
  result?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createSupabaseAdmin();
    const payload = JSON.stringify({
      role: data.role,
      rating: data.rating,
      quote: data.quote,
      location: data.location || 'Global Learner',
      result: data.result || 'Academy Student',
    });

    const { error } = await admin.from('announcements').insert({
      title: data.name,
      body: payload,
      target_roles: ['REVIEW'],
      is_published: false, // Requires admin approval
    });

    if (error) {
      console.error('Failed to insert review into database:', error);
      return { success: false, error: 'Database save failed. Please try again.' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error submitting parent review:', err);
    return { success: false, error: err?.message || 'Server error occurred.' };
  }
}

/**
 * Fetches all approved reviews for public website rendering.
 */
export async function getApprovedReviews(): Promise<ReviewItem[]> {
  const defaultReviews: ReviewItem[] = TESTIMONIALS.map((t) => ({
    id: t.id,
    name: t.name,
    role: (t.role as 'Parent' | 'Student') || 'Parent',
    rating: t.rating,
    quote: t.quote,
    location: t.location,
    result: t.result,
    isApproved: true,
    createdAt: new Date().toISOString(),
  }));

  try {
    const admin = createSupabaseAdmin();
    const { data } = await admin
      .from('announcements')
      .select('*')
      .contains('target_roles', ['REVIEW'])
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      const dbApproved: ReviewItem[] = data.map((d: any) => {
        try {
          const parsed = JSON.parse(d.body);
          return {
            id: d.id,
            name: d.title,
            role: parsed.role || 'Parent',
            rating: parsed.rating || 5,
            quote: parsed.quote || '',
            location: parsed.location || 'Global',
            result: parsed.result || 'Verified Review',
            isApproved: true,
            createdAt: d.created_at,
          };
        } catch {
          return {
            id: d.id,
            name: d.title,
            role: 'Parent',
            rating: 5,
            quote: d.body,
            location: 'Global',
            isApproved: true,
            createdAt: d.created_at,
          };
        }
      });

      return [...dbApproved, ...defaultReviews];
    }
  } catch (err) {
    console.error('Error fetching approved reviews:', err);
  }

  return defaultReviews;
}

/**
 * Fetches all reviews (both Pending & Approved) for Admin Moderation.
 */
export async function getAllReviewsForAdmin(): Promise<ReviewItem[]> {
  try {
    const admin = createSupabaseAdmin();
    const { data } = await admin
      .from('announcements')
      .select('*')
      .contains('target_roles', ['REVIEW'])
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      return data.map((d: any) => {
        try {
          const parsed = JSON.parse(d.body);
          return {
            id: d.id,
            name: d.title,
            role: parsed.role || 'Parent',
            rating: parsed.rating || 5,
            quote: parsed.quote || '',
            location: parsed.location || 'Global',
            result: parsed.result || 'Submitted Review',
            isApproved: !!d.is_published,
            createdAt: d.created_at,
          };
        } catch {
          return {
            id: d.id,
            name: d.title,
            role: 'Parent',
            rating: 5,
            quote: d.body,
            location: 'Global',
            isApproved: !!d.is_published,
            createdAt: d.created_at,
          };
        }
      });
    }
  } catch (err) {
    console.error('Error loading reviews for admin:', err);
  }

  return [];
}

/**
 * Admin Action: Approve review (Publish to live website).
 */
export async function approveReview(id: string): Promise<boolean> {
  try {
    const admin = createSupabaseAdmin();
    const { error } = await admin
      .from('announcements')
      .update({ is_published: true, published_at: new Date().toISOString() })
      .eq('id', id);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Admin Action: Delete / Reject review.
 */
export async function deleteReview(id: string): Promise<boolean> {
  try {
    const admin = createSupabaseAdmin();
    const { error } = await admin.from('announcements').delete().eq('id', id);

    return !error;
  } catch {
    return false;
  }
}
