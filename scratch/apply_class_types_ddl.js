const { Client } = require('pg');

async function tryConnectAndRun(port) {
  const ipAddress = '54.94.90.106'; // sa-east-1 pooler IPv4
  const servername = 'aws-0-sa-east-1.pooler.supabase.com';
  
  console.log(`Connecting directly to IP ${ipAddress} on port ${port} with SNI ${servername}...`);
  const client = new Client({
    host: ipAddress,
    port: port,
    database: 'postgres',
    user: 'postgres.titqwyiiagdxmzkgimpe',
    password: 'Animesh@1',
    ssl: {
      rejectUnauthorized: false,
      servername: servername // Force SNI routing!
    },
    connectionTimeoutMillis: 30000
  });

  try {
    await client.connect();
    console.log(`Connected successfully on port ${port}!`);

    // 1. Alter classes constraint
    console.log('Altering public.classes check constraints...');
    await client.query('ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_class_type_check;');
    await client.query("ALTER TABLE public.classes ADD CONSTRAINT classes_class_type_check CHECK (class_type IN ('PRIVATE', 'BUDDY', 'GROUP'));");

    // 2. Alter weekly_schedules constraint
    console.log('Altering public.weekly_schedules check constraints...');
    await client.query('ALTER TABLE public.weekly_schedules DROP CONSTRAINT IF EXISTS weekly_schedules_class_type_check;');
    await client.query("ALTER TABLE public.weekly_schedules ADD CONSTRAINT weekly_schedules_class_type_check CHECK (class_type IN ('PRIVATE', 'BUDDY', 'GROUP'));");

    // 3. Add column first_joined_at to class_students table
    console.log('Adding first_joined_at column to public.class_students table...');
    await client.query('ALTER TABLE public.class_students ADD COLUMN IF NOT EXISTS first_joined_at timestamp with time zone;');

    // 4. Reload PostgREST schema cache
    console.log('Reloading PostgREST schema cache...');
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log('Schema cache reload notification sent!');

    console.log('Database DDL applied successfully!');
    return true;
  } catch (err) {
    console.error(`Failed on port ${port}:`, err.message || err);
    return false;
  } finally {
    await client.end();
  }
}

async function main() {
  const success = await tryConnectAndRun(6543);
  if (!success) {
    console.log('Trying fallback port 5432...');
    await tryConnectAndRun(5432);
  }
}

main();
