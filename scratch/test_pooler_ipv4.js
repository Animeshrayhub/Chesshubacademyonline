const { Client } = require('pg');

async function testPort(port) {
  console.log(`Connecting to pooler IP 54.94.90.106 on port ${port}...`);
  const client = new Client({
    host: '54.94.90.106',
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
