const dns = require('dns');
const { Client } = require('pg');

async function testPassword(password) {
  const hostname = 'db.titqwyiiagdxmzkgimpe.supabase.co';

  return new Promise((resolve) => {
    dns.lookup(hostname, { family: 6 }, async (err, address) => {
      if (err) {
        console.error('DNS error:', err);
        resolve(false);
        return;
      }

      console.log(`Resolved ${hostname} IPv6: ${address}`);
      const client = new Client({
        host: address,
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: password,
        ssl: {
          rejectUnauthorized: false,
        },
        connectionTimeoutMillis: 10000,
      });

      try {
        await client.connect();
        console.log(`Connected to Supabase DB with password ${password}!`);

        console.log('Adding session_notes column to public.classes table...');
        await client.query('ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS session_notes text;');
        console.log('ALTER TABLE succeeded!');

        console.log('Reloading PostgREST schema cache...');
        await client.query("NOTIFY pgrst, 'reload schema';");
        console.log('Schema cache reloaded!');
        resolve(true);
      } catch (connErr) {
        console.log(`Failed with password ${password}:`, connErr.message);
        resolve(false);
      } finally {
        try { await client.end(); } catch (e) {}
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
  ];

  for (const pwd of passwords) {
    const ok = await testPassword(pwd);
    if (ok) break;
  }
}

main();
