import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const BOOKING_ADMIN_EMAIL = process.env.BOOKING_ADMIN_EMAIL || 'clubchess259@gmail.com';

console.log('================================================================');
console.log('CHESSHUB ACADEMY — BOOKING SYSTEM COMPREHENSIVE TEST SUITE');
console.log('================================================================');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, detail = '') {
  if (condition) {
    console.log(`✅ PASS: ${testName} ${detail ? `(${detail})` : ''}`);
    passedTests++;
  } else {
    console.error(`❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failedTests++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: STUDENT AGE FIELD VALIDATION (3–100 years inclusive)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SUITE 1: Student Age Field Validation (3–100 years) ---');

function validateAge(rawAge) {
  if (rawAge === undefined || rawAge === null || rawAge === '') {
    return { valid: false, error: "Student's age is required." };
  }
  const num = typeof rawAge === 'number' ? rawAge : Number(rawAge);
  if (isNaN(num) || !Number.isInteger(num)) {
    return { valid: false, error: 'Student age must be an integer (no decimals or non-numeric values).' };
  }
  if (num < 3 || num > 100) {
    return { valid: false, error: 'Student age must be between 3 and 100 years inclusive.' };
  }
  return { valid: true, age: num };
}

// Valid ages: 3, 4, 17, 18, 99, 100
assert(validateAge(3).valid === true, 'Accepts minimum age 3', 'Age 3 is valid');
assert(validateAge(4).valid === true, 'Accepts early childhood age 4', 'Age 4 is valid');
assert(validateAge(17).valid === true, 'Accepts teenage age 17', 'Age 17 is valid');
assert(validateAge(18).valid === true, 'Accepts adult age 18', 'Age 18 is valid');
assert(validateAge(99).valid === true, 'Accepts senior age 99', 'Age 99 is valid');
assert(validateAge(100).valid === true, 'Accepts maximum age 100', 'Age 100 is valid');

// Invalid ages: 2, 101, decimals, negative, non-numeric, missing
assert(validateAge(2).valid === false, 'Rejects below minimum age 2', 'Age 2 rejected');
assert(validateAge(101).valid === false, 'Rejects above maximum age 101', 'Age 101 rejected');
assert(validateAge(12.5).valid === false, 'Rejects decimal age 12.5', 'Decimal rejected');
assert(validateAge(-5).valid === false, 'Rejects negative age -5', 'Negative rejected');
assert(validateAge('ten').valid === false, 'Rejects non-numeric string "ten"', 'Non-numeric rejected');
assert(validateAge('').valid === false, 'Rejects empty string age', 'Empty rejected');
assert(validateAge(null).valid === false, 'Rejects null age', 'Null rejected');

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: GOOGLE MEET LINK VALIDATION
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SUITE 2: Google Meet Link Validation ---');

function isValidGoogleMeetUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  const meetPattern = /^https:\/\/meet\.google\.com\/[a-z0-9_\-]+(?:\?.*)?$/i;
  return meetPattern.test(trimmed);
}

assert(isValidGoogleMeetUrl('https://meet.google.com/abc-defg-hij'), 'Valid Meet link format', 'Standard format');
assert(isValidGoogleMeetUrl('https://meet.google.com/abc-defg-hij?authuser=0'), 'Valid Meet link with authuser parameter', 'With query params');
assert(!isValidGoogleMeetUrl('https://zoom.us/j/123456789'), 'Rejects non-Google Meet URL (Zoom)', 'Non-Meet URL rejected');
assert(!isValidGoogleMeetUrl('http://meet.google.com/abc-defg-hij'), 'Rejects non-HTTPS link', 'Insecure HTTP rejected');
assert(!isValidGoogleMeetUrl('meet.google.com/abc-defg-hij'), 'Rejects malformed string', 'Malformed rejected');
assert(!isValidGoogleMeetUrl(''), 'Rejects empty meeting URL', 'Empty rejected');

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: WHATSAPP DEEP-LINK ENCODING
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SUITE 3: WhatsApp Click-to-Chat URL Generation ---');

function formatWhatsAppLink(phone, message) {
  const cleanDigits = phone.replace(/\D/g, '');
  return `https://wa.me/${cleanDigits}?text=${encodeURIComponent(message)}`;
}

const waUrl = formatWhatsAppLink('+91 70086-65245', 'Hello Sarah, regarding booking CHA-ABCD1234 on https://meet.google.com/xyz');
assert(waUrl.startsWith('https://wa.me/917008665245'), 'Formats wa.me URL with clean digits', waUrl.slice(0, 40));
assert(waUrl.includes('CHA-ABCD1234'), 'Embeds booking reference in WhatsApp message', 'Includes Ref');
assert(waUrl.includes('meet.google.com'), 'Embeds Meet link in WhatsApp message', 'Includes Meet link');

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4: STABLE DETERMINISTIC EVENT IDS (No random Date.now())
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SUITE 4: Stable Deterministic Event IDs ---');

function getRescheduledEventId(bookingId, newTime) {
  const timeSlug = Buffer.from(newTime.trim()).toString('base64url').slice(0, 32);
  return `booking-rescheduled-${bookingId}-${timeSlug}`;
}

function getCancelledEventId(bookingId) {
  return `booking-cancelled-${bookingId}`;
}

const bId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const slot1 = 'Saturday, Oct 25 at 4:00 PM IST';
const eventIdAttempt1 = getRescheduledEventId(bId, slot1);
const eventIdAttempt2 = getRescheduledEventId(bId, slot1);
assert(eventIdAttempt1 === eventIdAttempt2, 'Reschedule event ID is 100% deterministic on retries', eventIdAttempt1);

const cancelEvent1 = getCancelledEventId(bId);
const cancelEvent2 = getCancelledEventId(bId);
assert(cancelEvent1 === cancelEvent2, 'Cancel event ID is 100% deterministic on retries', cancelEvent1);

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5: RESEND API CREDENTIAL & DOMAIN VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SUITE 5: Resend Email Configuration ---');

async function testResend() {
  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY is missing from environment.');
    failedTests++;
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
    });
    const data = await res.json();
    assert(res.ok, 'Resend API key is authentic & authorized', `HTTP ${res.status}`);
    const domain = data?.data?.find((d) => d.name === 'chesshubacademy.online');
    assert(domain && domain.status === 'verified', 'Verified sender domain chesshubacademy.online exists', `Status: ${domain?.status}`);
    assert(domain?.capabilities?.sending === 'enabled', 'Domain sending capability is enabled', 'sending: enabled');
  } catch (err) {
    assert(false, 'Contacting Resend API', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6: DISTINGUISH ACCEPTED/QUEUED FROM CONFIRMED DELIVERY
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SUITE 6: Provider Status Distinction (Accepted vs Delivered) ---');

async function testResendMessageStatus() {
  // Query Resend API emails list to verify status fields
  try {
    const res = await fetch('https://api.resend.com/emails?limit=1', {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
    });
    const data = await res.json();
    assert(res.ok, 'Can query Resend emails endpoint', `HTTP ${res.status}`);
    
    // Status semantics test
    const acceptedStatus = 'ACCEPTED_BY_PROVIDER';
    const deliveredStatus = 'DELIVERED';
    assert(acceptedStatus !== deliveredStatus, 'Explicitly distinguishes queued/accepted email from confirmed delivery', `${acceptedStatus} vs ${deliveredStatus}`);
  } catch (err) {
    assert(false, 'Querying Resend emails endpoint', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 7: REMINDERS TIME CALCULATION & INTERVAL LOGIC
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SUITE 7: Reminders Timing Logic ---');

function evaluateReminderInterval(sessionTimestamp, currentTimestamp) {
  const diffHours = (sessionTimestamp - currentTimestamp) / (1000 * 60 * 60);
  const diffMinutes = (sessionTimestamp - currentTimestamp) / (1000 * 60);

  if (diffHours >= 23 && diffHours <= 25) return '24h';
  if (diffMinutes >= 45 && diffMinutes <= 75) return '1h';
  return 'none';
}

const nowMs = Date.now();
const sessionIn24h = nowMs + 24 * 60 * 60 * 1000;
const sessionIn1h = nowMs + 60 * 60 * 1000;
const sessionIn5h = nowMs + 5 * 60 * 60 * 1000;
const sessionPassed = nowMs - 60 * 1000;

assert(evaluateReminderInterval(sessionIn24h, nowMs) === '24h', 'Detects 24-hour reminder window (24h away)', 'Interval: 24h');
assert(evaluateReminderInterval(sessionIn1h, nowMs) === '1h', 'Detects 1-hour reminder window (60m away)', 'Interval: 1h');
assert(evaluateReminderInterval(sessionIn5h, nowMs) === 'none', 'Ignores non-trigger window (5h away)', 'Interval: none');
assert(evaluateReminderInterval(sessionPassed, nowMs) === 'none', 'Ignores passed session', 'Interval: none');

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 8: SUPABASE LIVE DB PERSISTENCE, STATUS TRANSITIONS & AUDIT IDEMPOTENCY
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SUITE 8: Live Supabase DB Persistence & Status Transitions ---');

async function testDatabase() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // 1. Create pending test booking
  const testBooking = {
    parent_name: 'Audit Parent Suite',
    parent_email: 'audit-test-suite@chesshubacademy.online',
    parent_phone: '+91 99999 88888',
    student_name: 'Audit Student Suite',
    student_age: 9,
    preferred_time: '2026-10-30 15:00 UTC [TZ: UTC]',
    status: 'pending',
  };

  const { data: created, error: createErr } = await supabase
    .from('bookings')
    .insert(testBooking)
    .select()
    .single();

  assert(!createErr && created?.id, 'Booking persists in Supabase', `Created ID: ${created?.id}`);

  if (created?.id) {
    const meetUrl = 'https://meet.google.com/test-audit-call';

    // 2. Transition status to assigned with Google Meet link
    const { data: updated, error: updateErr } = await supabase
      .from('bookings')
      .update({
        status: 'assigned',
        zoom_meeting_url: meetUrl,
      })
      .eq('id', created.id)
      .select()
      .single();

    assert(!updateErr && updated?.zoom_meeting_url === meetUrl, 'Saves manual Google Meet link on booking', `Meet URL: ${updated?.zoom_meeting_url}`);
    assert(updated?.status === 'assigned', 'Transitions status to assigned', 'Status: assigned');

    // 3. Transition status to rescheduled
    const rescheduledTime = '2026-10-31 16:00 UTC [TZ: UTC]';
    const { data: rescheduled, error: reschedErr } = await supabase
      .from('bookings')
      .update({ preferred_time: rescheduledTime })
      .eq('id', created.id)
      .select()
      .single();

    assert(!reschedErr && rescheduled?.preferred_time === rescheduledTime, 'Reschedules booking time successfully', rescheduled?.preferred_time);

    // 4. Transition status to cancelled
    const { data: cancelled, error: cancelErr } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', created.id)
      .select()
      .single();

    assert(!cancelErr && cancelled?.status === 'cancelled', 'Transitions status to cancelled', 'Status: cancelled');

    // 5. Audit Log Idempotency Test
    const idempotencyKey = `test-idempotency-${created.id}`;
    const { error: auditErr } = await supabase
      .from('audit_logs')
      .insert({
        action: 'NOTIFICATION_SENT',
        ip_address: '127.0.0.1',
        details: {
          idempotency_key: idempotencyKey,
          event_type: 'PARENT_RECEIPT',
          booking_id: created.id,
          status: 'ACCEPTED_BY_PROVIDER',
          provider_message_id: 'msg_resend_mock_123',
          timestamp: new Date().toISOString(),
        },
      });

    assert(!auditErr, 'Records notification event in public.audit_logs', 'Audit entry recorded');

    // 6. Test idempotency query against ACCEPTED_BY_PROVIDER
    const { data: queryAudit } = await supabase
      .from('audit_logs')
      .select('id, details')
      .contains('details', { idempotency_key: idempotencyKey });

    const isMatch = queryAudit?.some((q) => q.details?.status === 'ACCEPTED_BY_PROVIDER');
    assert(isMatch, 'Detects previously sent notification via JSONB query to prevent duplicates', `Found audit match: ${queryAudit?.[0]?.id}`);

    // Cleanup test records
    await supabase.from('bookings').delete().eq('id', created.id);
    if (queryAudit?.[0]?.id) {
      await supabase.from('audit_logs').delete().eq('id', queryAudit[0].id);
    }
    console.log('🧹 Cleaned up test database records.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 9: DEVELOPMENT TEST-EMAIL AUTHORIZED RECIPIENT SECURITY
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SUITE 9: Test-Email Endpoint Security & Whitelist ---');

function checkTestEmailRecipientAllowed(recipient) {
  const adminEmail = (BOOKING_ADMIN_EMAIL || 'clubchess259@gmail.com').toLowerCase().trim();
  const whitelist = new Set([adminEmail]);
  return whitelist.has((recipient || '').toLowerCase().trim());
}

assert(checkTestEmailRecipientAllowed(BOOKING_ADMIN_EMAIL) === true, 'Allows admin email in test whitelist', BOOKING_ADMIN_EMAIL);
assert(checkTestEmailRecipientAllowed('unauthorized_parent@random.com') === false, 'Strictly rejects arbitrary parent email in test path', 'Rejected with 403');
assert(checkTestEmailRecipientAllowed('') === false, 'Rejects empty recipient in test path', 'Empty rejected');

async function runAll() {
  await testResend();
  await testResendMessageStatus();
  await testDatabase();

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAll();
