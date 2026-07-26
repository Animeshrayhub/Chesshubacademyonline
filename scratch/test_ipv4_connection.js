const dns = require('dns');
const { Client } = require('pg');

async function main() {
  const hostname = 'db.titqwyiiagdxmzkgimpe.supabase.co';
  
  console.log(`Looking up IP for ${hostname}...`);
  dns.lookup(hostname, { family: 4 }, async (err, address) => {
    if (err) {
      console.error('DNS Lookup failed:', err);
      return;
    }
    console.log(`Resolved IPv4 address: ${address}`);
    
    const client = new Client({
      host: address, // Use IP address directly!
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: 'Animesh@1',
      ssl: {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 15000
    });
    
    try {
      console.log(`Connecting to ${address}:5432...`);
      await client.connect();
      console.log('Connected successfully via IPv4 address!');
      
      const { rows } = await client.query('SELECT now()');
      console.log('Now:', rows);
    } catch (connErr) {
      console.error('Connection failed:', connErr);
    } finally {
      await client.end();
    }
  });
}

main();
