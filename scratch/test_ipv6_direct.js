const { Client } = require('pg');

async function main() {
  const targetIp = '2406:da1a:b00:1300:5049:fb3b:4b63:fbe';
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

  try {
    await client.connect();
    console.log('Connected successfully via IPv6 direct IP!');
    const { rows } = await client.query('select version();');
    console.log('Postgres version:', rows[0].version);
    await client.end();
  } catch (err) {
    console.error('Connection failed:', err);
  }
}

main();
