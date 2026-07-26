const dns = require('dns');
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

async function checkRegion(region) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  
  return new Promise((resolve) => {
    dns.lookup(host, async (dnsErr, address) => {
      if (dnsErr) {
        resolve({ region, success: false, error: 'DNS ENOTFOUND' });
        return;
      }
      
      const client = new Client({
        host: address,
        port: 5432,
        database: 'postgres',
        user: 'postgres.titqwyiiagdxmzkgimpe',
        password: 'Animesh@1',
        ssl: {
          rejectUnauthorized: false
        },
        connectionTimeoutMillis: 5000
      });
      
      try {
        await client.connect();
        resolve({ region, success: true, address });
      } catch (err) {
        resolve({ region, success: false, error: err.message, address });
      } finally {
        await client.end();
      }
    });
  });
}

async function main() {
  console.log('Scanning regions...');
  for (const reg of regions) {
    const res = await checkRegion(reg);
    if (res.success) {
      console.log(`\n>>> SUCCESS: Tenant found in region ${res.region} (${res.address})!\n`);
      break;
    } else {
      console.log(`Region ${res.region} (${res.address || 'no IP'}): ${res.error}`);
    }
  }
}

main();
