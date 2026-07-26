const fs = require('fs');

function loadEnvFile(path) {
  try {
    if (!fs.existsSync(path)) return;
    const content = fs.readFileSync(path, 'utf8');
    for (const line of content.split('\n')) {
      const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
      if (match) {
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        process.env[match[1].trim()] = val;
      }
    }
  } catch(e) {}
}

loadEnvFile('.env');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!key) {
  console.error('No service role key found in .env');
  return;
}

try {
  const parts = key.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  const payloadBase64 = parts[1];
  const payloadDecoded = Buffer.from(payloadBase64, 'base64').toString('utf8');
  console.log('Decoded JWT Payload:', JSON.parse(payloadDecoded));
} catch (err) {
  console.error('Failed to decode JWT:', err);
}
