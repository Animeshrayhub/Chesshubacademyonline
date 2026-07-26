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
  console.log('Querying public.users table...');
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, role, first_name, last_name, is_active');
    
  if (error) {
    console.error('Error fetching users:', error);
  } else {
    console.log(`Found ${users.length} users:`);
    users.forEach((u) => {
      console.log(`- ${u.first_name} ${u.last_name} (${u.email}) | Role: ${u.role} | Active: ${u.is_active}`);
    });
  }
}

main();
