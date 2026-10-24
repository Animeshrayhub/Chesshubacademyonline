'use server';

import { revalidatePath } from 'next/cache';
import * as bookingsService from '@/lib/bookings';
import { type BookingStatus } from '@/types/dashboard';

export async function updateBookingStatusAction(bookingId: string, status: BookingStatus) {
  const result = await bookingsService.updateBookingStatus(bookingId, status);
  if (result.success) {
    revalidatePath('/dashboard/admin/bookings');
    revalidatePath('/dashboard/admin');
  }
  return JSON.parse(JSON.stringify(result));
}

export async function assignCoachToBookingAction(bookingId: string, coachId: string) {
  const result = await bookingsService.assignCoachToBooking(bookingId, coachId);
  if (result.success) {
    revalidatePath('/dashboard/admin/bookings');
  }
  return JSON.parse(JSON.stringify(result));
}

export async function confirmBookingAction(params: {
  bookingId: string;
  coachUserId: string;
  confirmedTime: string;
  timeZone?: string;
  googleMeetUrl?: string;
}) {
  const result = await bookingsService.confirmBooking(params);
  if (result.success) {
    revalidatePath('/dashboard/admin/bookings');
    revalidatePath('/dashboard/admin');
  }
  return JSON.parse(JSON.stringify(result));
}

export async function updateBookingMeetingUrlAction(bookingId: string, meetingUrl: string) {
  const result = await bookingsService.updateBookingMeetingUrl(bookingId, meetingUrl);
  if (result.success) {
    revalidatePath('/dashboard/admin/bookings');
  }
  return JSON.parse(JSON.stringify(result));
}

export async function cancelBookingAction(bookingId: string, reason?: string) {
  const result = await bookingsService.cancelBooking(bookingId, reason);
  if (result.success) {
    revalidatePath('/dashboard/admin/bookings');
    revalidatePath('/dashboard/admin');
  }
  return JSON.parse(JSON.stringify(result));
}

export async function convertBookingToStudentAction(bookingId: string, passwordConfirm: string) {
  const result = await bookingsService.convertBookingToStudent(bookingId, passwordConfirm);
  if (result.success) {
    revalidatePath('/dashboard/admin/bookings');
    revalidatePath('/dashboard/admin/students');
    revalidatePath('/dashboard/admin');
    revalidatePath('/dashboard/student');
  }
  return JSON.parse(JSON.stringify(result));
}

export async function createBookingAction(bookingData: {
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  student_name: string;
  student_age: number | string;
  preferred_time: string;
  referral_code?: string;
  experience?: string;
  timezone?: string;
  message?: string;
}) {
  const result = await bookingsService.createBooking(bookingData);
  if (result.success) {
    revalidatePath('/dashboard/admin/bookings');
    revalidatePath('/dashboard/admin');
  }
  return JSON.parse(JSON.stringify(result));
}

export async function rescheduleBookingAction(
  bookingId: string,
  newPreferredTime: string,
  timeZone?: string
) {
  const result = await bookingsService.rescheduleBooking(bookingId, newPreferredTime, timeZone);
  if (result.success) {
    revalidatePath('/dashboard/admin/bookings');
    revalidatePath('/dashboard/admin/reports/bookings');
  }
  return JSON.parse(JSON.stringify(result));
}

export async function convertInquiryToDemoBookingAction(
  bookingId: string,
  data: {
    student_name: string;
    student_age: number;
    preferred_time: string;
  }
) {
  const result = await bookingsService.convertInquiryToDemoBooking(bookingId, data);
  if (result.success) {
    revalidatePath('/dashboard/admin/bookings');
    revalidatePath('/dashboard/admin');
  }
  return JSON.parse(JSON.stringify(result));
}
