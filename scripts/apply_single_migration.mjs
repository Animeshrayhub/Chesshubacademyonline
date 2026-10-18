import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const projectRef = 'titqwyiiagdxmzkgimpe';
const host = `db.${projectRef}.supabase.co`;
const port = 5432;
const database = 'postgres';
const user = 'postgres';
const password = process.argv[2] || process.env.SUPABASE_DB_PASSWORD;

if (!password) {
  console.error('\n❌ ERROR: Database password required.');
  console.error('Usage: node scripts/apply_single_migration.mjs <db_password>\n');
  process.exit(1);
}

const migrationPath = path.join('supabase', 'migrations', '20260928000000_rating_bot_leaderboard_system.sql');

if (!fs.existsSync(migrationPath)) {
  console.error(`\n❌ ERROR: Migration file not found: ${migrationPath}\n`);
  process.exit(1);
}

const sqlContent = fs.readFileSync(migrationPath, 'utf8');

async function run() {
  console.log('====================================================');
  console.log('CHESSHUB ACADEMY — CONTROLLED MIGRATION EXECUTION');
  console.log('====================================================');
  console.log(`Target Host:     ${host}:${port}`);
  console.log(`Database:        ${database}`);
  console.log(`Database User:   ${user}`);
  console.log(`Migration File:  ${migrationPath}`);
  console.log('====================================================\n');

  const client = new Client({
    host,
    port,
    database,
    user,
    password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  try {
    console.log('Connecting to PostgreSQL database...');
    await client.connect();
    console.log('✅ Connected successfully to ChessHub production database!\n');

    console.log('Starting transactional execution...');
    await client.query('BEGIN;');

    console.log('Executing 20260928000000_rating_bot_leaderboard_system.sql...');
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
