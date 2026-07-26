import React from 'react';
import BookingsRegistry from '@/features/admin/BookingsRegistry';
import { listBookings } from '@/lib/bookings';
import { listCoaches } from '@/lib/coaches';

export const dynamic = 'force-dynamic';

export default async function AdminBookingsPage() {
  const [bookingsRes, coachesRes] = await Promise.all([
    listBookings(),
    listCoaches(),
  ]);

  const bookings = bookingsRes.success ? (bookingsRes.data ?? []) : [];
  const coaches = coachesRes.success ? (coachesRes.data ?? []) : [];

  return <BookingsRegistry bookings={bookings} coaches={coaches} />;
}
