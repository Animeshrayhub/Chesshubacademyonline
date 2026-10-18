import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const projectRef = 'titqwyiiagdxmzkgimpe';
const password = process.argv[2] || process.env.SUPABASE_DB_PASSWORD;

if (!password) {
  console.error('\n❌ ERROR: Database password required.');
  console.error('Usage: node scripts/apply_events_migration.mjs <db_password>\n');
  process.exit(1);
}

const migrationPath = path.join('supabase', 'migrations', '20261003000000_chesshub_events_phase1.sql');

if (!fs.existsSync(migrationPath)) {
  console.error(`\n❌ ERROR: Migration file not found: ${migrationPath}\n`);
  process.exit(1);
}

const sqlContent = fs.readFileSync(migrationPath, 'utf8');

// Target pooler and direct hosts
const connectionConfigs = [
  {
    name: 'Supabase Direct Connection',
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres'
  },
  {
    name: 'Supabase Session Pooler (IPv4)',
    host: 'aws-0-ap-south-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: `postgres.${projectRef}`
  },
  {
    name: 'Supabase Transaction Pooler (IPv4)',
    host: 'aws-0-ap-south-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: `postgres.${projectRef}`
  }
];

async function run() {
  console.log('====================================================');
  console.log('CHESSHUB ACADEMY — EVENTS PHASE 1 DATABASE MIGRATION');
  console.log(`Project Ref:     ${projectRef}`);
  console.log(`Migration File:  ${migrationPath}`);
  console.log('====================================================\n');

  let client = null;
  let connectedConfig = null;

  for (const config of connectionConfigs) {
    console.log(`Attempting connection via ${config.name} (${config.host}:${config.port})...`);
    const c = new Client({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: password,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });

    try {
      await c.connect();
      client = c;
      connectedConfig = config;
      console.log(`✅ Connected successfully via ${config.name}!\n`);
      break;
    } catch (err) {
      console.log(`Connection via ${config.name} failed: ${err.message}`);
      try { await c.end(); } catch (e) {}
    }
  }

  if (!client) {
    console.error('\n❌ Could not establish database connection with provided password across target endpoints.');
    process.exit(1);
  }

  try {
    console.log('Starting transactional execution...');
    await client.query('BEGIN;');

    console.log('Executing 20261003000000_chesshub_events_phase1.sql...');
    await client.query(sqlContent);

    console.log('Committing transaction...');
    await client.query('COMMIT;');
    console.log('✅ Migration applied successfully!\n');

    console.log('Reloading PostgREST schema cache...');
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log('✅ PostgREST schema cache reloaded!\n');

    console.log('====================================================');
    console.log('MIGRATION EXECUTION STATUS: SUCCESS');
    console.log('====================================================');
  } catch (err) {
    console.error('\n❌ MIGRATION FAILED:');
    console.error(err.message || err);
    try {
      console.log('Rolling back transaction...');
      await client.query('ROLLBACK;');
      console.log('Rollback complete.');
    } catch (rbErr) {
      console.error('Rollback error:', rbErr.message);
    }
    process.exit(1);
  } finally {
    try {
      await client.end();
    } catch (e) {}
  }
}

run();
