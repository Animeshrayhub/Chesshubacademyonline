const dns = require('dns');
const { Client } = require('pg');

async function testPassword(password) {
  const hostname = 'db.titqwyiiagdxmzkgimpe.supabase.co';
  
  return new Promise((resolve) => {
    dns.lookup(hostname, { family: 6 }, async (err, address) => {
      if (err) {
        // Fallback to pooler IP
        address = '54.94.90.106'; // sa-east-1
      }
      
      const client = new Client({
        host: address,
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: password,
        ssl: {
          rejectUnauthorized: false
        },
        connectionTimeoutMillis: 5000
      });
      
      try {
        await client.connect();
        console.log(`SUCCESS with password: ${password}`);
        resolve(true);
      } catch (connErr) {
        console.log(`Failed with password ${password}:`, connErr.message);
        resolve(false);
      } finally {
        await client.end();
      }
    });
  });
}

async function main() {
  const passwords = [
    'Animesh@1',
    'Animesh@123',
    'Admin123!',
    'Animesh123!',
    'chesshub',
    'postgres'
  ];
  
  for (const pwd of passwords) {
    const ok = await testPassword(pwd);
    if (ok) break;
  }
}

main();
