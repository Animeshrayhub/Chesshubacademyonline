const { Client } = require('pg');

async function main() {
  const connectionString = 'postgresql://postgres:Animesh@1@db.titqwyiiagdxmzkgimpe.supabase.co:5432/postgres';
  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Connected via connection string!');
    const { rows } = await client.query('SELECT now()');
    console.log('Query result:', rows);
  } catch (err) {
    console.error('Connection error:', err);
  } finally {
    await client.end();
  }
}

main();
