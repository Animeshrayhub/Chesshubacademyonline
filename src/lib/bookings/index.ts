import { createSupabaseAdmin } from '../supabase/admin';
import { assertAdmin } from '../permissions';
import {
  BaseError,
  DatabaseError,
  NotFoundError,
  ValidationError,
  InternalServerError,
  type Result,
} from '../errors';
import type { DbBooking, BookingStatus } from '@/types/dashboard';
import {
  sendParentBookingReceiptEmail,
  sendAdminNewBookingAlertEmail,
  sendParentBookingConfirmedEmail,
  sendBookingRescheduledEmail,
  sendBookingCancelledEmail,
} from '../email/bookingEmails';
import { validateStudentAge, isValidGoogleMeetUrl, getBookingReference } from './shared';

export { validateStudentAge, isValidGoogleMeetUrl, getBookingReference };

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

    // Record audit log
    await admin.from('audit_logs').insert({
      action: 'BOOKING_STATUS_UPDATED',
      ip_address: '127.0.0.1',
      details: {
        booking_id: bookingId,
        new_status: status,
        updated_at: new Date().toISOString(),
      },
    });

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
 * Assigns a coach to a booking, saves manual Google Meet link, and atomically confirms the session.
 * Prevents double-booking by verifying the coach has no conflicting session at that confirmed time.
 */
export async function confirmBooking(params: {
  bookingId: string;
  coachUserId: string;
  confirmedTime: string;
  timeZone?: string;
  googleMeetUrl?: string;
}): Promise<Result<DbBooking>> {
  try {
    const adminUser = await assertAdmin();
    const admin = createSupabaseAdmin();

    // 1. Verify booking exists
    const { data: booking, error: bErr } = await admin
      .from('bookings')
      .select('*')
      .eq('id', params.bookingId)
      .single();

    if (bErr || !booking) {
      return { success: false, error: new NotFoundError('Booking not found') };
    }

    // 2. Validate Google Meet URL if provided
    if (params.googleMeetUrl && params.googleMeetUrl.trim()) {
      if (!isValidGoogleMeetUrl(params.googleMeetUrl)) {
        return {
          success: false,
          error: new ValidationError(
            'Invalid Google Meet link. Must be a valid URL starting with https://meet.google.com/'
          ),
        };
      }
    }

    // 3. Resolve coach user and profile
    const { data: coachUser } = await admin
      .from('users')
      .select('id, first_name, last_name, email')
      .eq('id', params.coachUserId)
      .eq('role', 'COACH')
      .single();

    if (!coachUser) {
      return { success: false, error: new NotFoundError('Coach not found or not active') };
    }

    let { data: coachProfile } = await admin
      .from('coach_profiles')
      .select('id')
      .eq('user_id', params.coachUserId)
      .maybeSingle();

    if (!coachProfile) {
      const { data: newProfile } = await admin
        .from('coach_profiles')
        .insert({
          user_id: params.coachUserId,
          title: 'FIDE Coach',
          experience_years: 5,
          bio: 'Professional chess coach.',
        })
        .select('id')
        .single();
      coachProfile = newProfile;
    }

    if (!coachProfile) {
      return { success: false, error: new DatabaseError('Failed to resolve coach profile') };
    }

    // 4. Double-Booking Prevention: Check conflicting assigned bookings for this coach at the same confirmed time
    const cleanConfirmedTime = params.confirmedTime.trim();
    const { data: conflicts } = await admin
      .from('bookings')
      .select('id, student_name, preferred_time')
      .eq('assigned_coach_id', coachProfile.id)
      .eq('status', 'assigned')
      .neq('id', params.bookingId);

    const isConflict = conflicts?.some((c: { id: string; student_name: string; preferred_time: string }) => {
      return (
        c.preferred_time &&
        c.preferred_time.toLowerCase().includes(cleanConfirmedTime.toLowerCase())
      );
    });

    if (isConflict) {
      return {
        success: false,
        error: new ValidationError(
          `Coach is already reserved for a confirmed session at "${cleanConfirmedTime}". Please pick another time or assign an alternate coach.`
        ),
      };
    }

    // 5. Atomic Update
    const updatePayload: Record<string, any> = {
      assigned_coach_id: coachProfile.id,
      status: 'assigned',
      preferred_time: params.timeZone
        ? `${cleanConfirmedTime} (${params.timeZone})`
        : cleanConfirmedTime,
    };

    if (params.googleMeetUrl && params.googleMeetUrl.trim()) {
      updatePayload.zoom_meeting_url = params.googleMeetUrl.trim();
    }

    const { data: updatedBooking, error: updateErr } = await admin
      .from('bookings')
      .update(updatePayload)
      .eq('id', params.bookingId)
      .select()
      .single();

    if (updateErr || !updatedBooking) {
      return { success: false, error: new DatabaseError('Failed to confirm booking', updateErr) };
    }

    const bookingRef = getBookingReference(updatedBooking.id);
    const coachDisplayName = `${coachUser.first_name || ''} ${coachUser.last_name || ''}`.trim() || 'FIDE Master';

    // 6. Record audit trail
    await admin.from('audit_logs').insert({
      action: 'BOOKING_CONFIRMED',
      user_id: adminUser.id,
      ip_address: '127.0.0.1',
      details: {
        booking_id: updatedBooking.id,
        booking_ref: bookingRef,
        coach_id: coachProfile.id,
        coach_name: coachDisplayName,
        confirmed_time: cleanConfirmedTime,
        timezone: params.timeZone || 'UTC',
        meet_link: updatedBooking.zoom_meeting_url,
        confirmed_at: new Date().toISOString(),
      },
    });

    // 7. Dispatch Confirmation Email to Parent
    try {
      await sendParentBookingConfirmedEmail({
        bookingId: updatedBooking.id,
        bookingRef,
        parentName: updatedBooking.parent_name,
        parentEmail: updatedBooking.parent_email,
        studentName: updatedBooking.student_name,
        studentAge: updatedBooking.student_age,
        confirmedTime: cleanConfirmedTime,
        timeZone: params.timeZone,
        coachName: coachDisplayName,
        meetLink: updatedBooking.zoom_meeting_url || undefined,
      });
    } catch (emailErr) {
      console.warn('[confirmBooking] Parent confirmation email failed:', emailErr);
    }

    return { success: true, data: updatedBooking };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Assigns a coach to a booking (legacy compatible wrapper).
 */
export async function assignCoachToBooking(
  bookingId: string,
  coachUserId: string
): Promise<Result<DbBooking>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    const { data: coachUser } = await admin
      .from('users')
      .select('id')
      .eq('id', coachUserId)
      .eq('role', 'COACH')
      .single();

    if (!coachUser) {
      return { success: false, error: new NotFoundError('Coach not found') };
    }

    let { data: coachProfile } = await admin
      .from('coach_profiles')
      .select('id')
      .eq('user_id', coachUserId)
      .maybeSingle();

    if (!coachProfile) {
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
 * Updates or sets the manual Google Meet link for a booking.
 */
export async function updateBookingMeetingUrl(
  bookingId: string,
  meetingUrl: string
): Promise<Result<DbBooking>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    if (meetingUrl && meetingUrl.trim() && !isValidGoogleMeetUrl(meetingUrl)) {
      return {
        success: false,
        error: new ValidationError('Invalid Google Meet link. Must start with https://meet.google.com/'),
      };
    }

    const { data, error } = await admin
      .from('bookings')
      .update({ zoom_meeting_url: meetingUrl.trim() || null })
      .eq('id', bookingId)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: new DatabaseError('Failed to update meeting URL', error) };
    }

    await admin.from('audit_logs').insert({
      action: 'BOOKING_MEET_URL_UPDATED',
      ip_address: '127.0.0.1',
      details: {
        booking_id: bookingId,
        meet_url: data.zoom_meeting_url,
        updated_at: new Date().toISOString(),
      },
    });

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
 */
export async function convertBookingToStudent(
  bookingId: string,
  password: string
): Promise<Result<{ userId: string; bookingId: string }>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    const { data: booking, error: bookingErr } = await admin
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingErr || !booking) {
      return { success: false, error: new NotFoundError('Booking not found') };
    }

    const nameParts = booking.student_name.trim().split(' ');
    const firstName = nameParts[0] ?? booking.student_name;
    const lastName = nameParts.slice(1).join(' ') || '';
    const username = booking.parent_email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');

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

    await admin
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

    await admin
      .from('student_profiles')
      .upsert({
        id: userId,
        user_id: userId,
        age: booking.student_age ?? 10,
        level: 'BEGINNER',
        parent_name: booking.parent_name,
        parent_whatsapp: booking.parent_phone,
      }, { onConflict: 'user_id' });

    await admin
      .from('bookings')
      .update({ status: 'completed' })
      .eq('id', bookingId);

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
 * Creates a new demo booking request with validation and automated email notifications.
 */
export async function createBooking(bookingData: {
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
}): Promise<Result<DbBooking & { booking_reference: string }>> {
  try {
    // 1. Validate Parent Name
    const parentName = (bookingData.parent_name || '').trim();
    if (!parentName) {
      return { success: false, error: new ValidationError('Parent / Guardian name is required.') };
    }

    // 2. Validate Email
    const parentEmail = (bookingData.parent_email || '').trim().toLowerCase();
    if (!parentEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
      return { success: false, error: new ValidationError('A valid email address is required.') };
    }

    // 3. Validate Phone Number
    const parentPhone = (bookingData.parent_phone || '').trim();
    if (!parentPhone || !/^\+?[0-9\s\-()]{7,20}$/.test(parentPhone)) {
      return {
        success: false,
        error: new ValidationError('A valid phone or WhatsApp number with country code is required.'),
      };
    }

    // 4. Validate Student Name
    const studentName = (bookingData.student_name || '').trim();
    if (!studentName) {
      return { success: false, error: new ValidationError("Child's name is required.") };
    }

    // 5. Validate Student Age (3 to 100 inclusive)
    const ageValidation = validateStudentAge(bookingData.student_age);
    if (!ageValidation.valid || ageValidation.age === undefined) {
      return {
        success: false,
        error: new ValidationError(ageValidation.error || 'Student age must be between 3 and 100.'),
      };
    }
    const studentAge = ageValidation.age;

    // 6. Validate Preferred Time
    const preferredTime = (bookingData.preferred_time || '').trim();
    if (!preferredTime) {
      return { success: false, error: new ValidationError('Preferred class time is required.') };
    }

    const admin = createSupabaseAdmin();

    // 7. Duplicate Submission Prevention:
    // Check if an identical pending booking exists created in the past 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: existingRecent } = await admin
      .from('bookings')
      .select('*')
      .eq('parent_email', parentEmail)
      .eq('student_name', studentName)
      .gte('created_at', fiveMinutesAgo)
      .limit(1);

    if (existingRecent && existingRecent.length > 0) {
      const recent = existingRecent[0];
      const ref = getBookingReference(recent.id);
      return {
        success: true,
        data: {
          ...recent,
          booking_reference: ref,
        },
      };
    }

    // Compose human-readable preferred_time with contextual metadata
    let enrichedTime = preferredTime;
    if (bookingData.timezone) {
      enrichedTime += ` [TZ: ${bookingData.timezone}]`;
    }
    if (bookingData.experience) {
      enrichedTime += ` [Level: ${bookingData.experience}]`;
    }
    if (bookingData.message && bookingData.message.trim()) {
      enrichedTime += ` [Notes: ${bookingData.message.trim().slice(0, 100)}]`;
    }

    const newBooking = {
      parent_name: parentName,
      parent_email: parentEmail,
      parent_phone: parentPhone,
      student_name: studentName,
      student_age: studentAge,
      preferred_time: enrichedTime,
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

    const bookingRef = getBookingReference(data.id);

    // Record creation in audit log
    await admin.from('audit_logs').insert({
      action: 'BOOKING_CREATED',
      ip_address: '127.0.0.1',
      details: {
        booking_id: data.id,
        booking_ref: bookingRef,
        parent_email: parentEmail,
        student_name: studentName,
        student_age: studentAge,
        preferred_time: preferredTime,
        timezone: bookingData.timezone || null,
        experience: bookingData.experience || null,
        created_at: new Date().toISOString(),
      },
    });

    // 8. Referral tracking
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
              referred_name: studentName,
              referred_email: parentEmail,
              referred_phone: parentPhone,
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

    // 9. Dispatch Transactional Emails (Parent Receipt + Admin Alert)
    // Non-blocking so database record is guaranteed even if provider has transient issues
    try {
      await Promise.allSettled([
        sendParentBookingReceiptEmail({
          bookingId: data.id,
          bookingRef,
          parentName,
          parentEmail,
          studentName,
          studentAge,
          requestedTime: preferredTime,
          timeZone: bookingData.timezone,
          experience: bookingData.experience,
        }),
        sendAdminNewBookingAlertEmail({
          bookingId: data.id,
          bookingRef,
          parentName,
          parentEmail,
          parentPhone,
          studentName,
          studentAge,
          requestedTime: preferredTime,
          timeZone: bookingData.timezone,
          experience: bookingData.experience,
          notes: bookingData.message,
        }),
      ]);
    } catch (emailErr) {
      console.warn('[createBooking] Initial email dispatch error:', emailErr);
    }

    return {
      success: true,
      data: {
        ...data,
        booking_reference: bookingRef,
      },
    };
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
  newPreferredTime: string,
  timeZone?: string
): Promise<Result<DbBooking>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    const { data: booking } = await admin
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (!booking) {
      return { success: false, error: new NotFoundError('Booking not found') };
    }

    const { data, error } = await admin
      .from('bookings')
      .update({ preferred_time: newPreferredTime.trim() })
      .eq('id', bookingId)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: new DatabaseError('Failed to reschedule demo booking', error) };
    }

    const bookingRef = getBookingReference(data.id);

    await admin.from('audit_logs').insert({
      action: 'BOOKING_RESCHEDULED',
      ip_address: '127.0.0.1',
      details: {
        booking_id: bookingId,
        new_time: newPreferredTime,
        updated_at: new Date().toISOString(),
      },
    });

    try {
      await sendBookingRescheduledEmail({
        bookingId: data.id,
        bookingRef,
        parentName: data.parent_name,
        parentEmail: data.parent_email,
        studentName: data.student_name,
        studentAge: data.student_age,
        newTime: newPreferredTime,
        timeZone,
        meetLink: data.zoom_meeting_url || undefined,
      });
    } catch (emailErr) {
      console.warn('[rescheduleBooking] Email dispatch error:', emailErr);
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
 * Cancels a demo booking.
 */
export async function cancelBooking(
  bookingId: string,
  reason?: string
): Promise<Result<DbBooking>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    const { data, error } = await admin
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: new DatabaseError('Failed to cancel booking', error) };
    }

    const bookingRef = getBookingReference(data.id);

    await admin.from('audit_logs').insert({
      action: 'BOOKING_CANCELLED',
      ip_address: '127.0.0.1',
      details: {
        booking_id: bookingId,
        reason: reason || null,
        cancelled_at: new Date().toISOString(),
      },
    });

    try {
      await sendBookingCancelledEmail({
        bookingId: data.id,
        bookingRef,
        parentName: data.parent_name,
        parentEmail: data.parent_email,
        studentName: data.student_name,
        studentAge: data.student_age,
        reason,
      });
    } catch (emailErr) {
      console.warn('[cancelBooking] Email dispatch error:', emailErr);
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
 * Converts a contact web inquiry into a structured, scheduled Demo Booking request.
 */
export async function convertInquiryToDemoBooking(
  bookingId: string,
  data: {
    student_name: string;
    student_age: number;
    preferred_time: string;
  }
): Promise<Result<DbBooking>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    const ageValidation = validateStudentAge(data.student_age);
    if (!ageValidation.valid || ageValidation.age === undefined) {
      return { success: false, error: new ValidationError(ageValidation.error || 'Invalid student age') };
    }

    const { data: updated, error } = await admin
      .from('bookings')
      .update({
        student_name: data.student_name.trim(),
        student_age: ageValidation.age,
        preferred_time: data.preferred_time.trim(),
        status: 'pending',
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (error || !updated) {
      return {
        success: false,
        error: new DatabaseError('Failed to convert inquiry to demo booking', error),
      };
    }

    return { success: true, data: updated };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}
