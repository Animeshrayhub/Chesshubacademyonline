const { createClient } = require('@supabase/supabase-js');
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
loadEnvFile('.env.local');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('Testing createUser for admin@chesshub.com...');
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'admin@chesshub.com',
    password: 'Admin123!',
    email_confirm: true
  });
  
  if (error) {
    console.error('Error properties:', Object.getOwnPropertyNames(error));
    console.error('Error details:', error);
  } else {
    console.log('Success:', data);
  }
}

main();
