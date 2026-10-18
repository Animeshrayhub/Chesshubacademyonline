import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !serviceKey) {
  console.error('Missing Supabase configuration in .env.local');
  process.exit(1);
}

const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } });
const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });

async function verifyLive() {
  console.log('====================================================');
  console.log('CHESSHUB ACADEMY — LIVE POST-MIGRATION VERIFICATION');
  console.log('Target Project: ' + url);
  console.log('====================================================\n');

  const results = {};

  // 1. Verify public.users
  console.log('1. Checking public.users schema & data...');
  const { data: users, error: uErr } = await adminClient
    .from('users')
    .select('id, username, email, role, is_active, status, user_code')
    .limit(5);

  if (uErr) {
    results.users = { status: 'FAILED', error: uErr.message };
    console.error('   ❌ Users query failed:', uErr.message);
  } else {
    const hasUserCode = users.length > 0 && 'user_code' in users[0];
    const hasStatus = users.length > 0 && 'status' in users[0];
    results.users = {
      status: hasUserCode && hasStatus ? 'PASSED' : 'PARTIAL',
      hasUserCode,
      hasStatus,
      sample: users[0]
    };
    console.log(`   ✅ Users verified. user_code present: ${hasUserCode}, status present: ${hasStatus}`);
    console.log(`   Sample User: ID=${users[0]?.id}, Code=${users[0]?.user_code}, Status=${users[0]?.status}, Role=${users[0]?.role}`);
  }

  // 2. Verify public.bookings
  console.log('\n2. Checking public.bookings schema & data...');
  const { data: bookings, error: bErr } = await adminClient
    .from('bookings')
    .select('id, parent_name, status, lead_stage, internal_notes, converted_student_profile_id')
    .limit(5);

  if (bErr) {
    results.bookings = { status: 'FAILED', error: bErr.message };
    console.error('   ❌ Bookings query failed:', bErr.message);
  } else {
    const hasLeadStage = bookings.length > 0 && 'lead_stage' in bookings[0];
    const hasInternalNotes = bookings.length > 0 && 'internal_notes' in bookings[0];
    results.bookings = {
      status: hasLeadStage && hasInternalNotes ? 'PASSED' : 'PARTIAL',
      hasLeadStage,
      hasInternalNotes,
      sample: bookings[0]
    };
    console.log(`   ✅ Bookings verified. lead_stage present: ${hasLeadStage}, internal_notes present: ${hasInternalNotes}`);
    console.log(`   Sample Booking: ID=${bookings[0]?.id}, Status=${bookings[0]?.status}, Stage=${bookings[0]?.lead_stage}`);
  }

  // 3. Verify no demo_bookings view
  console.log('\n3. Verifying absence of public.demo_bookings view...');
  const { error: vErr } = await adminClient.from('demo_bookings').select('*').limit(1);
  const noView = vErr !== null;
  results.noDemoBookingsView = { status: noView ? 'PASSED' : 'WARNING', message: vErr ? vErr.message : 'View still exists' };
  console.log(`   ${noView ? '✅ Confirmed: public.demo_bookings view does NOT exist' : '⚠️ Warning: demo_bookings view was found'}`);

  // 4. Verify Careers Tables
  console.log('\n4. Checking Careers tables existence...');
  const { error: jErr } = await adminClient.from('job_openings').select('id, title, status').limit(1);
  const { error: aErr } = await adminClient.from('career_applications').select('id, full_name, status').limit(1);
  const { error: nErr } = await adminClient.from('career_application_notes').select('id, note').limit(1);

  results.careers = {
    job_openings: !jErr ? 'EXISTS' : jErr.message,
    career_applications: !aErr ? 'EXISTS' : aErr.message,
    career_application_notes: !nErr ? 'EXISTS' : nErr.message
  };
  console.log(`   job_openings:            ${!jErr ? '✅ EXISTS' : '❌ ' + jErr.message}`);
  console.log(`   career_applications:     ${!aErr ? '✅ EXISTS' : '❌ ' + aErr.message}`);
  console.log(`   career_application_notes: ${!nErr ? '✅ EXISTS' : '❌ ' + nErr.message}`);

  // 5. Verify Careers RLS for Anonymous user
  console.log('\n5. Testing Careers RLS boundaries for Anonymous caller...');
  const { data: anonApps, error: anonAppErr } = await anonClient.from('career_applications').select('*');
  const { data: anonNotes, error: anonNotesErr } = await anonClient.from('career_application_notes').select('*');

  const anonAppsBlocked = anonApps === null || anonApps.length === 0;
  const anonNotesBlocked = anonNotes === null || anonNotes.length === 0;
  results.careersRls = { anonAppsBlocked, anonNotesBlocked };
  console.log(`   Anonymous applications SELECT: ${anonAppsBlocked ? '🔒 BLOCKED / EMPTY (Secure)' : '⚠️ LEAKING DATA'}`);
  console.log(`   Anonymous recruiter notes SELECT: ${anonNotesBlocked ? '🔒 BLOCKED / EMPTY (Secure)' : '⚠️ LEAKING DATA'}`);

  // 6. Verify Resume Storage Bucket
  console.log('\n6. Checking storage bucket "resumes"...');
  const { data: buckets, error: bktErr } = await adminClient.storage.listBuckets();
  const resumesBkt = buckets?.find(b => b.id === 'resumes');

  results.storage = {
    exists: !!resumesBkt,
    isPublic: resumesBkt ? resumesBkt.public : null,
    fileSizeLimit: resumesBkt ? resumesBkt.file_size_limit : null
  };

  if (resumesBkt) {
    console.log(`   ✅ "resumes" bucket exists.`);
    console.log(`   Public:          ${resumesBkt.public} (Expected: false)`);
    console.log(`   File Size Limit: ${resumesBkt.file_size_limit} bytes (Expected: 10485760)`);
  } else {
    console.log(`   ❌ "resumes" bucket not found:`, bktErr ? bktErr.message : 'Not listed');
  }

  // 7. Verify Existing Core Tables
  console.log('\n7. Verifying core production tables integrity...');
  const { count: studentCount } = await adminClient.from('student_profiles').select('*', { count: 'exact', head: true });
  const { count: coachCount } = await adminClient.from('coach_profiles').select('*', { count: 'exact', head: true });
  const { count: classCount } = await adminClient.from('classes').select('*', { count: 'exact', head: true });

  console.log(`   student_profiles count: ${studentCount}`);
  console.log(`   coach_profiles count:   ${coachCount}`);
  console.log(`   classes count:          ${classCount}`);

  results.coreIntegrity = { studentCount, coachCount, classCount };

  console.log('\n====================================================');
  console.log('VERIFICATION COMPLETE');
  console.log('====================================================');
  return results;
}

verifyLive().then(res => {
  console.log('\nSUMMARY_JSON:' + JSON.stringify(res));
}).catch(console.error);
