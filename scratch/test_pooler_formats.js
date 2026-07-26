const { Client } = require('pg');

async function testHost(host) {
  console.log(`Testing host: ${host}...`);
  const client = new Client({
    host: host,
    port: 6543,
    database: 'postgres',
    user: 'postgres.titqwyiiagdxmzkgimpe',
    password: 'Animesh@1',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });

  try {
    await client.connect();
    console.log(`  SUCCESS! Connected to ${host}`);
    await client.end();
    return true;
  } catch (err) {
    const msg = err.message || '';
    if (msg.includes('tenant/user') && msg.includes('not found')) {
      console.log(`  Tenant not found on ${host}`);
    } else {
      console.log(`  FOUND TENANT on ${host}! Connection result:`, msg);
    }
    await client.end();
    return false;
  }
}

async function main() {
  const hosts = [
    'aws-0-ap-south-1.pooler.supabase.com',
    'aws-ap-south-1.pooler.supabase.com',
    // Let's also test Singapore just in case
    'aws-0-ap-southeast-1.pooler.supabase.com',
    'aws-ap-southeast-1.pooler.supabase.com'
  ];

  for (const host of hosts) {
    await testHost(host);
  }
}

main();
