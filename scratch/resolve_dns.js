const dns = require('dns');

dns.resolveCname('db.titqwyiiagdxmzkgimpe.supabase.co', (err, addresses) => {
  if (err) {
    console.error('Cname resolve error:', err);
    // Try resolving IP address instead
    dns.resolve4('db.titqwyiiagdxmzkgimpe.supabase.co', (err2, addresses2) => {
      console.log('IP addresses:', addresses2, err2);
    });
  } else {
    console.log('CNAME addresses:', addresses);
  }
});
