'use server';

import { revalidatePath } from 'next/cache';
import { submitParentReview, approveReview, deleteReview, getApprovedReviews, getAllReviewsForAdmin } from '@/lib/reviews';

export async function submitReviewAction(data: {
  name: string;
  role: 'Parent' | 'Student';
  rating: number;
  quote: string;
  location?: string;
}) {
  const result = await submitParentReview(data);
  if (result.success) {
    revalidatePath('/');
    revalidatePath('/about');
    revalidatePath('/dashboard/admin/reviews');
  }
  return result;
}

export async function approveReviewAction(id: string) {
  const success = await approveReview(id);
  if (success) {
    revalidatePath('/');
    revalidatePath('/about');
    revalidatePath('/dashboard/admin/reviews');
  }
  return { success };
}

export async function deleteReviewAction(id: string) {
  const success = await deleteReview(id);
  if (success) {
    revalidatePath('/');
    revalidatePath('/about');
    revalidatePath('/dashboard/admin/reviews');
  }
  return { success };
}

export async function fetchApprovedReviewsAction() {
  const reviews = await getApprovedReviews();
  return { success: true, reviews };
}

export async function fetchAdminReviewsAction() {
  const reviews = await getAllReviewsForAdmin();
  return { success: true, reviews };
}
