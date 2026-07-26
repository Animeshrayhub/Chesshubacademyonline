async function main() {
  const targetIp = '2406:da1a:b00:1300:5049:fb3b:4b63:fbe';
  try {
    const res = await fetch('https://ip-ranges.amazonaws.com/ip-ranges.json');
    const data = await res.json();
    console.log('Total prefixes:', data.ipv6_prefixes.length);
    
    // Let's filter prefixes starting with 2406:da1a:
    const matches = data.ipv6_prefixes.filter(p => p.ipv6_prefix.startsWith('2406:da1a:'));
    console.log('Matching prefixes:', matches);
  } catch (err) {
    console.error(err);
  }
}

main();
