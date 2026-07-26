const { Client } = require('pg');

const regions = [
  'ap-south-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-west-2',
  'eu-central-1',
  'sa-east-1',
  'ca-central-1'
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
      connectionTimeoutMillis: 3000 // speed up timeout
    });

    try {
      await client.connect();
      console.log(`SUCCESS! Connected to ${region}`);
      await client.end();
      break;
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('tenant/user') && msg.includes('not found')) {
        // Tenant not found in this region
        console.log(`  Not in this region (tenant not found).`);
      } else {
        // Any other error means the tenant WAS found but connection/auth failed
        console.log(`  FOUND TENANT in ${region}! Connection result:`, msg);
        await client.end();
        break;
      }
    }
  }
}

main();
