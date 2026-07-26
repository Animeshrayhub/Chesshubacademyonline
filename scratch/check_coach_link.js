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
  const { data: sp } = await supabase.from('student_profiles').select('id, user_id, coach_id');
  console.log('student_profiles:', JSON.stringify(sp, null, 2));
  
  const { data: cp } = await supabase.from('coach_profiles').select('id, user_id');
  console.log('coach_profiles:', JSON.stringify(cp, null, 2));
  
  const { data: users } = await supabase.from('users').select('id, role, first_name, last_name');
  console.log('users:', JSON.stringify(users, null, 2));
}

main();
