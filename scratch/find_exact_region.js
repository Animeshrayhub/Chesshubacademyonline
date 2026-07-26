const fs = require('fs');

// Simple IPv6 parser and mask matcher
function ipv6ToBits(ip) {
  // Expand :: if present
  let expanded = ip;
  if (ip.includes('::')) {
    const parts = ip.split('::');
    const left = parts[0].split(':').filter(Boolean);
    const right = parts[1].split(':').filter(Boolean);
    const missing = 8 - (left.length + right.length);
    const middle = Array(missing).fill('0');
    expanded = [...left, ...middle, ...right].join(':');
  }
  
  const blocks = expanded.split(':');
  let bitString = '';
  for (const block of blocks) {
    const val = parseInt(block, 16);
    bitString += val.toString(2).padStart(16, '0');
  }
  return bitString;
}

function matchPrefix(ipBits, prefix) {
  const [prefixIp, maskStr] = prefix.split('/');
  const mask = parseInt(maskStr, 10);
  const prefixBits = ipv6ToBits(prefixIp);
  
  return ipBits.substring(0, mask) === prefixBits.substring(0, mask);
}

async function main() {
  const targetIp = '2406:da1a:b00:1300:5049:fb3b:4b63:fbe';
  const ipBits = ipv6ToBits(targetIp);
  console.log('Target IP bits:', ipBits.substring(0, 64));

  try {
    const res = await fetch('https://ip-ranges.amazonaws.com/ip-ranges.json');
    const data = await res.json();
    console.log('Scanning all IPv6 prefixes...');

    let found = [];
    for (const item of data.ipv6_prefixes) {
      if (matchPrefix(ipBits, item.ipv6_prefix)) {
        found.push(item);
      }
    }

    console.log('Matching AWS prefixes found:', found);
  } catch (err) {
    console.error(err);
  }
}

main();
