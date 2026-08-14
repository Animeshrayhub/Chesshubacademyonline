import { createSupabaseAdmin } from '../supabase/admin';
import { assertAdmin } from '../permissions';
import {
  BaseError,
  DatabaseError,
  NotFoundError,
  InternalServerError,
  type Result,
} from '../errors';
import type { DbBooking, BookingStatus } from '@/types/dashboard';

/**
 * Lists all bookings, optionally filtered by status.
 */
export async function listBookings(
  filter?: { status?: BookingStatus }
): Promise<Result<DbBooking[]>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    let query = admin
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter?.status) {
      query = query.eq('status', filter.status);
    }

    const { data, error } = await query;
    if (error) {
      return { success: false, error: new DatabaseError('Failed to list bookings', error) };
    }

    return { success: true, data: data ?? [] };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Updates the status of a booking.
 */
export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus
): Promise<Result<DbBooking>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    const { data, error } = await admin
      .from('bookings')
      .update({ status })
      .eq('id', bookingId)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: new DatabaseError('Failed to update booking status', error) };
    }

    return { success: true, data };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Assigns a coach to a booking and marks it as assigned.
 * Resolves coach_profiles.id from users.id to satisfy the FK constraint.
 */
export async function assignCoachToBooking(
  bookingId: string,
  coachUserId: string
): Promise<Result<DbBooking>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    // Verify coach user exists
    const { data: coachUser } = await admin
      .from('users')
      .select('id')
      .eq('id', coachUserId)
      .eq('role', 'COACH')
      .single();

    if (!coachUser) {
      return { success: false, error: new NotFoundError('Coach not found') };
    }

    // Resolve coach_profiles.id (FK used in bookings.assigned_coach_id)
    let { data: coachProfile } = await admin
      .from('coach_profiles')
      .select('id')
      .eq('user_id', coachUserId)
      .maybeSingle();

    if (!coachProfile) {
      // Dynamic fallback: If profile is missing (e.g. created during session before the trigger bugfix), create it on the fly!
      const { data: insertedProfile } = await admin
        .from('coach_profiles')
        .insert({
          user_id: coachUserId,
          title: 'FIDE Coach',
          experience_years: 5,
          bio: 'Professional chess coach.',
        })
        .select('id')
        .single();
      coachProfile = insertedProfile;
    }

    if (!coachProfile) {
      return { success: false, error: new NotFoundError('Failed to resolve or create coach profile') };
    }

    const { data, error } = await admin
      .from('bookings')
      .update({ assigned_coach_id: coachProfile.id, status: 'assigned' })
      .eq('id', bookingId)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: new DatabaseError('Failed to assign coach to booking', error) };
    }

    return { success: true, data };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Converts a booking into a student account.
 * Explicitly creates: auth.users → public.users (trigger) → student_profiles.
 * Only works for pending/assigned bookings.
 */
export async function convertBookingToStudent(
  bookingId: string,
  password: string
): Promise<Result<{ userId: string; bookingId: string }>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    // Fetch booking
    const { data: booking, error: bookingErr } = await admin
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingErr || !booking) {
      return { success: false, error: new NotFoundError('Booking not found') };
    }

    // Parse name
    const nameParts = booking.student_name.trim().split(' ');
    const firstName = nameParts[0] ?? booking.student_name;
    const lastName = nameParts.slice(1).join(' ') || '';
    const username = booking.parent_email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');

    // Create auth user
    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email: booking.parent_email,
      password,
      email_confirm: true,
      app_metadata: { role: 'STUDENT' },
      user_metadata: {
        role: 'STUDENT',
        username,
        first_name: firstName,
        last_name: lastName,
        display_name: booking.student_name,
        parent_name: booking.parent_name,
        parent_whatsapp: booking.parent_phone,
        age: booking.student_age,
        level: 'BEGINNER',
      },
    });

    if (authErr || !authUser.user) {
      return {
        success: false,
        error: new DatabaseError(authErr?.message ?? 'Failed to create student auth account', authErr),
      };
    }

    const userId = authUser.user.id;

    // Explicitly upsert into public.users (in case the trigger hasn't run yet or doesn't exist)
    const { error: userInsertErr } = await admin
      .from('users')
      .upsert({
        id: userId,
        username,
        email: booking.parent_email,
        first_name: firstName,
        last_name: lastName,
        role: 'STUDENT',
        is_active: true,
      }, { onConflict: 'id' });

    if (userInsertErr) {
      // Non-fatal: trigger may have already created it
      console.warn('[convertBookingToStudent] public.users upsert warning:', userInsertErr.message);
    }

    // Explicitly create student_profiles
    const { error: profileErr } = await admin
      .from('student_profiles')
      .upsert({
        id: userId,
        user_id: userId,
        age: booking.student_age ?? 10,
        level: 'BEGINNER',
        parent_name: booking.parent_name,
        parent_whatsapp: booking.parent_phone,
      }, { onConflict: 'user_id' });

    if (profileErr) {
      console.warn('[convertBookingToStudent] student_profiles upsert warning:', profileErr.message);
    }

    // Mark booking as completed
    await admin
      .from('bookings')
      .update({ status: 'completed' })
      .eq('id', bookingId);

    // Process referral conversion: mark referral as enrolled & award 250 XP
    try {
      await admin
        .from('referrals')
        .update({
          status: 'enrolled',
          xp_awarded: 250,
          enrolled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('referred_email', booking.parent_email)
        .neq('status', 'enrolled');
    } catch (refErr) {
      console.warn('[convertBookingToStudent] referral update warning:', refErr);
    }

    return { success: true, data: { userId, bookingId } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Creates a new demo booking request.
 */
export async function createBooking(bookingData: {
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  student_name: string;
  student_age: number;
  preferred_time: string;
  referral_code?: string;
}): Promise<Result<DbBooking>> {
  try {
    const admin = createSupabaseAdmin();

    const newBooking = {
      parent_name: bookingData.parent_name,
      parent_email: bookingData.parent_email,
      parent_phone: bookingData.parent_phone,
      student_name: bookingData.student_name,
      student_age: bookingData.student_age,
      preferred_time: bookingData.preferred_time,
      status: 'pending' as BookingStatus,
    };

    const { data, error } = await admin
      .from('bookings')
      .insert(newBooking)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: new DatabaseError('Failed to create demo booking', error) };
    }

    // Record referral if a referral code was provided
    if (bookingData.referral_code) {
      try {
        const parts = bookingData.referral_code.split('-');
        const prefix = parts[parts.length - 1]?.toLowerCase();
        if (prefix && prefix.length >= 4) {
          const { data: referrers } = await admin
            .from('student_profiles')
            .select('id');

          const referrer = referrers?.find((r: { id: string }) => r.id.toLowerCase().startsWith(prefix));
          if (referrer) {
            await admin.from('referrals').insert({
              referrer_student_id: referrer.id,
              referral_code: bookingData.referral_code,
              referred_name: bookingData.student_name,
              referred_email: bookingData.parent_email,
              referred_phone: bookingData.parent_phone,
              demo_request_id: data.id,
              status: 'pending_demo',
              xp_awarded: 0,
            });
          }
        }
      } catch (refErr) {
        console.warn('[createBooking] referral insert warning:', refErr);
      }
    }

    return { success: true, data };

  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Reschedules a demo booking's preferred time.
 */
export async function rescheduleBooking(
  bookingId: string,
  newPreferredTime: string
): Promise<Result<DbBooking>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    const { data, error } = await admin
      .from('bookings')
      .update({ preferred_time: newPreferredTime })
      .eq('id', bookingId)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: new DatabaseError('Failed to reschedule demo booking', error) };
    }

    return { success: true, data };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}
