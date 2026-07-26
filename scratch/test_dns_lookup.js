const dns = require('dns');

dns.lookup('db.titqwyiiagdxmzkgimpe.supabase.co', (err, address, family) => {
  console.log('Default lookup:', address, family, err);
});

dns.lookup('aws-0-sa-east-1.pooler.supabase.com', (err, address, family) => {
  console.log('Pooler default lookup:', address, family, err);
});
