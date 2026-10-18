import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const projectRef = 'titqwyiiagdxmzkgimpe';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://titqwyiiagdxmzkgimpe.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const dbPassword = process.argv[2] || process.env.SUPABASE_DB_PASSWORD;

async function runDirectPgVerification(password) {
  const hosts = [
    { name: 'Direct Host', host: `db.${projectRef}.supabase.co`, port: 5432, user: 'postgres' },
    { name: 'Session Pooler', host: 'aws-0-ap-south-1.pooler.supabase.com', port: 5432, user: `postgres.${projectRef}` },
    { name: 'Transaction Pooler', host: 'aws-0-ap-south-1.pooler.supabase.com', port: 6543, user: `postgres.${projectRef}` },
  ];

  let client = null;
  for (const h of hosts) {
    const c = new Client({
      host: h.host,
      port: h.port,
      database: 'postgres',
      user: h.user,
      password: password,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });
    try {
      await c.connect();
      client = c;
      console.log(`Connected via ${h.name} for deep catalog verification.`);
      break;
    } catch (e) {
      try { await c.end(); } catch (err) {}
    }
  }

  if (!client) {
    console.log('Direct PG connection could not be established; falling back to Supabase client verification.');
    return null;
  }

  try {
    const report = {};

    // A. Check table public.events exists
    const resA = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'events'
      ) as exists;
    `);
    report['A'] = { exists: resA.rows[0].exists };

    // B. Check events columns
    const resB = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'events'
      ORDER BY ordinal_position;
    `);
    report['B'] = { columns: resB.rows.map(r => r.column_name) };

    // C, D, E, F. Constraints on events
    const resConstraints = await client.query(`
      SELECT conname, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'public.events'::regclass;
    `);
    report['constraints'] = resConstraints.rows;

    // G. Indexes on events
    const resG = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE schemaname = 'public' AND tablename = 'events';
    `);
    report['G'] = { indexes: resG.rows };

    // H. notifications extended columns
    const resH = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'notifications'
      AND column_name IN ('type', 'event_id', 'read_at', 'metadata');
    `);
    report['H'] = { extended_columns: resH.rows };

    // I. uq_notifications_user_event_type index
    const resI = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE schemaname = 'public' AND tablename = 'notifications'
      AND indexname = 'uq_notifications_user_event_type';
    `);
    report['I'] = { index: resI.rows[0] || null };

    // J & K. RLS enabled on events and notifications
    const resRLS = await client.query(`
      SELECT relname, relrowsecurity 
      FROM pg_class 
      WHERE relname IN ('events', 'notifications')
      AND relnamespace = 'public'::regnamespace;
    `);
    report['RLS'] = resRLS.rows;

    // L & M. Policies on events and notifications
    const resPol = await client.query(`
      SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE schemaname = 'public' AND tablename IN ('events', 'notifications');
    `);
    report['policies'] = resPol.rows;

    // N. Table privileges / grants
    const resGrants = await client.query(`
      SELECT grantee, table_name, privilege_type
      FROM information_schema.role_table_grants 
      WHERE table_schema = 'public' AND table_name IN ('events', 'notifications')
      ORDER BY table_name, grantee, privilege_type;
    `);
    report['grants'] = resGrants.rows;

    await client.end();
    return report;
  } catch (err) {
    console.error('Catalog query error:', err.message);
    try { await client.end(); } catch (e) {}
    return null;
  }
}

async function main() {
  console.log('====================================================');
  console.log('CHESSHUB ACADEMY — DATABASE VERIFICATION SUITE');
  console.log(`Target: https://${projectRef}.supabase.co`);
  console.log('====================================================\n');

  if (dbPassword) {
    console.log('Postgres credentials provided. Running deep catalog verification...');
    const catalogReport = await runDirectPgVerification(dbPassword);
    if (catalogReport) {
      console.log('\n--- Deep Catalog Verification Report ---');
      console.log(JSON.stringify(catalogReport, null, 2));
      return;
    }
  }

  // REST API Probe
  console.log('Probing via Supabase PostgREST client...');
  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const anonClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

  const { data: ev, error: evErr } = await adminClient.from('events').select('id, title, status, event_type, visibility').limit(1);
  if (evErr) {
    console.log(`❌ Table public.events: ${evErr.message}`);
  } else {
    console.log('✅ Table public.events: Present and accessible by admin');
  }

  const { data: notif, error: notifErr } = await adminClient.from('notifications').select('id, type, event_id, read_at, metadata').limit(1);
  if (notifErr) {
    console.log(`❌ Notifications columns: ${notifErr.message}`);
  } else {
    console.log('✅ Notifications columns: type, event_id, read_at, metadata present');
  }
}

main();
