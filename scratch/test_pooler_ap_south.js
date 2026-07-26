const { Client } = require('pg');

async function testPort(port) {
  const host = 'aws-0-ap-south-1.pooler.supabase.com';
  console.log(`Connecting to pooler ${host} on port ${port}...`);
  const client = new Client({
    host: host,
    port: port,
    database: 'postgres',
    user: 'postgres.titqwyiiagdxmzkgimpe',
    password: 'Animesh@1',
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 15000
  });

  try {
    await client.connect();
    console.log(`Connected successfully on port ${port}!`);
    const { rows } = await client.query('SELECT now()');
    console.log('Result:', rows);
    return true;
  } catch (err) {
    console.error(`Failed on port ${port}:`, err.message || err);
    return false;
  } finally {
    await client.end();
  }
}

async function main() {
  const s1 = await testPort(6543);
  if (!s1) {
    await testPort(5432);
  }
}

main();
