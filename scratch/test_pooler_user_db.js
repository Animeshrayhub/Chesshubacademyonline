const { Client } = require('pg');

async function testCombo(user, database) {
  console.log(`Testing User: "${user}", DB: "${database}"...`);
  const client = new Client({
    host: 'aws-0-ap-south-1.pooler.supabase.com',
    port: 6543,
    database: database,
    user: user,
    password: 'Animesh@1',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });

  try {
    await client.connect();
    console.log(`  SUCCESS! Connected!`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`  Error:`, err.message || err);
    await client.end();
    return false;
  }
}

async function main() {
  const combos = [
    { user: 'postgres', db: 'postgres' },
    { user: 'postgres', db: 'postgres.titqwyiiagdxmzkgimpe' },
    { user: 'postgres.titqwyiiagdxmzkgimpe', db: 'postgres' },
    { user: 'postgres.titqwyiiagdxmzkgimpe', db: 'postgres.titqwyiiagdxmzkgimpe' },
    { user: 'postgres.titqwyiiagdxmzkgimpe', db: 'titqwyiiagdxmzkgimpe' },
    { user: 'postgres', db: 'titqwyiiagdxmzkgimpe' }
  ];

  for (const combo of combos) {
    await testCombo(combo.user, combo.db);
  }
}

main();
