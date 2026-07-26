const dns = require('dns');

dns.lookup('aws-ap-south-1.pooler.supabase.com', (err, address, family) => {
  console.log('ap-south-1 (no -0-) lookup:', address, family, err);
});
