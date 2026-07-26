const dns = require('dns');

dns.lookup('aws-0-ap-south-1.pooler.supabase.com', (err, address, family) => {
  console.log('ap-south-1 lookup:', address, family, err);
});
