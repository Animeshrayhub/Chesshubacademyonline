const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function tryConnectAndRun(port) {
  console.log(`Attempting to connect via port ${port} in sa-east-1 (São Paulo)...`);
  const client = new Client({
    host: 'aws-0-sa-east-1.pooler.supabase.com',
    port: port,
    database: 'postgres',
    user: 'postgres.titqwyiiagdxmzkgimpe',
    password: process.argv[2],
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 15000 // 15 seconds timeout
  });

  try {
    await client.connect();
    console.log(`Connected successfully on port ${port}!`);

    // 1. Read classroom_features migration
    console.log('Reading migration: classroom_features.sql...');
    const classSql = fs.readFileSync(path.join('supabase', 'migrations', '20260714000000_classroom_features.sql'), 'utf8');
    
    // 2. Read homework_lms migration
    console.log('Reading migration: homework_lms.sql...');
    const lmsSql = fs.readFileSync(path.join('supabase', 'migrations', '20260714000001_homework_lms.sql'), 'utf8');

    // 3. Execute classroom_features
    console.log('Executing classroom_features migration...');
    await client.query(classSql);
    console.log('Classroom features migration applied successfully!');

    // 4. Execute homework_lms
    console.log('Executing homework_lms migration...');
    await client.query(lmsSql);
    console.log('Homework LMS migration applied successfully!');

    // 5. Reload PostgREST schema cache
    console.log('Reloading PostgREST schema cache...');
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log('Schema cache reload notification sent!');
    
    return true;
  } catch (err) {
    console.error(`Failed on port ${port}:`, err.message || err);
    return false;
  } finally {
    await client.end();
  }
}

async function main() {
  const password = process.argv[2];
  if (!password) {
    console.error('Usage: node scratch/run_migrations.js <db_password>');
    process.exit(1);
  }

  // Try 6543 (Pooler transaction/session port) first, fallback to 5432 (Session port)
  const success = await tryConnectAndRun(6543);
  if (!success) {
    console.log('Trying fallback port 5432...');
    await tryConnectAndRun(5432);
  }
}

main();
