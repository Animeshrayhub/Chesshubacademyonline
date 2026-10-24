import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { sendSessionReminderEmail } from '@/lib/email/bookingEmails';
import { getBookingReference } from '@/lib/bookings';

export const dynamic = 'force-dynamic';

/**
 * Scheduled Job Handler for Demo Class Reminders (24h and 1h intervals)
 *
 * Security: Requires Bearer Authorization header matching CRON_SECRET or SUPABASE_SERVICE_ROLE_KEY.
 */
export async function GET(req: NextRequest) {
  return handleReminders(req);
}

export async function POST(req: NextRequest) {
  return handleReminders(req);
}

async function handleReminders(req: NextRequest) {
  // 1. Authenticate Request
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

  const isAuthorized =
    Boolean(cronSecret && authHeader && authHeader === `Bearer ${cronSecret}`) ||
    Boolean(cronSecret && req.nextUrl.searchParams.get('key') === cronSecret);

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized: Invalid cron authorization token.' }, { status: 401 });
  }

  try {
    const admin = createSupabaseAdmin();

    // 2. Query only confirmed ('assigned') bookings
    const { data: bookings, error } = await admin
      .from('bookings')
      .select('id, parent_name, parent_email, student_name, student_age, preferred_time, zoom_meeting_url, status, assigned_coach_id')
      .eq('status', 'assigned');

    if (error) {
      return NextResponse.json({ error: 'Database error querying bookings', details: error.message }, { status: 500 });
    }

    const now = Date.now();
    let reminders24hSent = 0;
    let reminders1hSent = 0;
    let skippedAlreadySent = 0;
    let skippedUnparseableOrPassed = 0;

    for (const b of bookings || []) {
      // Attempt to parse confirmed date from preferred_time
      // Format examples: "Oct 28, 2026 6:30 PM", "2026-10-28T18:30:00Z", "2026-10-28 18:30"
      const timeStr = b.preferred_time || '';
      const cleanTimeMatch = timeStr.match(/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(:\d{2})?/) ||
        timeStr.match(/[A-Za-z]{3}\s+\d{1,2},?\s+\d{4}\s+\d{1,2}:\d{2}\s*(AM|PM)?/i);

      let sessionTimestamp: number | null = null;
      if (cleanTimeMatch) {
        const parsed = Date.parse(cleanTimeMatch[0]);
        if (!isNaN(parsed)) sessionTimestamp = parsed;
      } else {
        const directParsed = Date.parse(timeStr.split('(')[0].trim());
        if (!isNaN(directParsed)) sessionTimestamp = directParsed;
      }

      if (!sessionTimestamp || sessionTimestamp <= now) {
        skippedUnparseableOrPassed++;
        continue;
      }

      const diffMs = sessionTimestamp - now;
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffMinutes = diffMs / (1000 * 60);

      const bookingRef = getBookingReference(b.id);

      // Check 24-hour interval: between 23 and 25 hours away
      if (diffHours >= 23 && diffHours <= 25) {
        const res = await sendSessionReminderEmail({
          reminderInterval: '24h',
          bookingId: b.id,
          bookingRef,
          parentName: b.parent_name,
          parentEmail: b.parent_email,
          studentName: b.student_name,
          studentAge: b.student_age,
          sessionTime: b.preferred_time,
          meetLink: b.zoom_meeting_url || undefined,
        });

        if (res.skipped) {
          skippedAlreadySent++;
        } else if (res.success) {
          reminders24hSent++;
        }
      }

      // Check 1-hour interval: between 45 and 75 minutes away
      if (diffMinutes >= 45 && diffMinutes <= 75) {
        const res = await sendSessionReminderEmail({
          reminderInterval: '1h',
          bookingId: b.id,
          bookingRef,
          parentName: b.parent_name,
          parentEmail: b.parent_email,
          studentName: b.student_name,
          studentAge: b.student_age,
          sessionTime: b.preferred_time,
          meetLink: b.zoom_meeting_url || undefined,
        });

        if (res.skipped) {
          skippedAlreadySent++;
        } else if (res.success) {
          reminders1hSent++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      checkedCount: bookings?.length || 0,
      reminders24hSent,
      reminders1hSent,
      skippedAlreadySent,
      skippedUnparseableOrPassed,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Unexpected error processing reminders', message: err?.message }, { status: 500 });
  }
}
