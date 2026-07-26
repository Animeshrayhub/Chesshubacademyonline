const dns = require('dns');

dns.resolve4('aws-0-sa-east-1.pooler.supabase.com', (err, addresses) => {
  console.log('IPv4 addresses:', addresses, err);
});
