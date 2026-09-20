import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Parse .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach((line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanupStaleSessions() {
  console.log('====================================================');
  console.log('🧹 CHESSHUB ACADEMY: CLEANING UP STALE SESSIONS');
  console.log('====================================================');

  // 1. Find all active live_sessions that started more than 4 hours ago
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  console.log(`Checking for active sessions started before: ${fourHoursAgo}`);

  const { data: staleSessions, error: sErr } = await supabase
    .from('live_sessions')
    .select('id, class_id, started_at, status')
    .eq('status', 'active')
    .lt('started_at', fourHoursAgo);

  if (sErr) {
    console.error('Error fetching stale sessions:', sErr);
    return;
  }

  console.log(`Found ${staleSessions?.length || 0} stale active sessions.`);

  if (staleSessions && staleSessions.length > 0) {
    for (const session of staleSessions) {
      // Calculate ended_at as started_at + 60 mins
      const started = new Date(session.started_at);
      const ended = new Date(started.getTime() + 60 * 60 * 1000).toISOString();

      const { error: upErr } = await supabase
        .from('live_sessions')
        .update({
          status: 'ended',
          ended_at: ended,
        })
        .eq('id', session.id);

      if (upErr) {
        console.warn(`Failed to close session ${session.id}:`, upErr);
      } else {
        console.log(`✓ Closed stale session ${session.id} (Started: ${session.started_at})`);
      }
    }
  }

  // 2. Find classes from previous dates that are still marked as SCHEDULED
  // If scheduled_start is older than 24 hours, mark them as COMPLETED so they don't linger in limbo
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  console.log(`\nChecking for past scheduled classes before: ${oneDayAgo}`);

  const { data: pastClasses, error: cErr } = await supabase
    .from('classes')
    .select('id, scheduled_start, status')
    .eq('status', 'SCHEDULED')
    .lt('scheduled_start', oneDayAgo);

  if (cErr) {
    console.error('Error fetching past classes:', cErr);
    return;
  }

  console.log(`Found ${pastClasses?.length || 0} past classes scheduled before yesterday.`);

  if (pastClasses && pastClasses.length > 0) {
    const ids = pastClasses.map((c) => c.id);
    const { error: batchUpErr } = await supabase
      .from('classes')
      .update({ status: 'COMPLETED' })
      .in('id', ids);

    if (batchUpErr) {
      console.warn('Failed to update past classes:', batchUpErr);
    } else {
      console.log(`✓ Updated ${ids.length} past classes to COMPLETED status.`);
    }
  }

  console.log('\n====================================================');
  console.log('🎉 DATABASE CLEANUP COMPLETE!');
  console.log('====================================================');
}

cleanupStaleSessions().catch(console.error);
