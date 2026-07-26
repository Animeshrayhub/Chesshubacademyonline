const dns = require('dns').promises;
const { Client } = require('pg');

async function main() {
  const host = 'db.titqwyiiagdxmzkgimpe.supabase.co';
  try {
    console.log('Resolving IPv6 addresses for:', host);
    const ips = await dns.resolve6(host);
    console.log('Resolved IPs:', ips);

    if (ips.length === 0) {
      console.error('No IPv6 addresses found.');
      return;
    }

    const targetIp = ips[0];
    console.log(`Connecting directly to IPv6 address: [${targetIp}]`);

    const client = new Client({
      host: targetIp, // Pass IPv6 address directly
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: 'Animesh@1',
      ssl: {
        rejectUnauthorized: false
      }
    });

    await client.connect();
    console.log('Connected successfully via IPv6!');
    
    const { rows } = await client.query('select version();');
    console.log('Postgres version:', rows[0].version);
    
    await client.end();
  } catch (err) {
    console.error('Connection failed:', err);
  }
}

main();
