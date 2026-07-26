const { Client } = require('pg');

async function main() {
  const ipAddress = '54.94.90.106';
  const servername = 'aws-0-sa-east-1.pooler.supabase.com';

  console.log(`Connecting directly to IP ${ipAddress} with SNI ${servername}...`);
  const client = new Client({
    host: ipAddress,
    port: 6543,
    database: 'postgres',
    user: 'postgres.titqwyiiagdxmzkgimpe',
    password: 'Animesh@1',
    ssl: {
      rejectUnauthorized: false,
      servername: servername,
    },
    connectionTimeoutMillis: 30000,
  });

  try {
    await client.connect();
    console.log('Connected successfully to Supabase PostgreSQL!');

    console.log('Adding session_notes column to public.classes table...');
    await client.query('ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS session_notes text;');
    console.log('Added session_notes column successfully!');

    console.log('Reloading PostgREST schema cache...');
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log('PostgREST schema cache reloaded successfully!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    try { await client.end(); } catch (e) {}
  }
}

main();
