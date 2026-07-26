const { Client } = require('pg');

const regions = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ca-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'eu-north-1',
  'eu-south-1',
  'ap-east-1',
  'ap-south-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-southeast-3',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-northeast-3',
  'sa-east-1',
  'me-south-1',
  'me-central-1',
  'af-south-1'
];

async function main() {
  const password = 'Animesh@1';
  const projectRef = 'titqwyiiagdxmzkgimpe';

  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    console.log(`Testing region: ${region} (${host})...`);
    
    const client = new Client({
      host: host,
      port: 6543,
      database: 'postgres',
      user: `postgres.${projectRef}`,
      password: password,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 4000 // 4s timeout
    });

    try {
      await client.connect();
      console.log(`  SUCCESS! Connected to ${region}`);
      await client.end();
      break;
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('tenant/user') && msg.includes('not found')) {
        // Tenant not found
      } else {
        console.log(`  RESULT for ${region}:`, msg);
        if (!msg.includes('timeout expired') && !msg.includes('ENOTFOUND')) {
          await client.end();
          break;
        }
      }
    }
  }
}

main();
