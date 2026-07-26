const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

function loadEnvFile(path) {
  try {
    if (!fs.existsSync(path)) return;
    const content = fs.readFileSync(path, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    }
  } catch (err) {
    console.error('Error loading env file:', path, err);
  }
}

async function main() {
  loadEnvFile('.env');
  loadEnvFile('.env.local');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(url, key);

  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error listing auth users:', error);
    return;
  }

  // Desired passwords
  const passwordMap = {
    'admin@chesshub.com': 'Admin123!',
    'coach@chesshub.com': 'Coach123!',
    'royduguu786@gmail.com': 'Animesh@1',
    'animeshray786@gmail.com': 'Animesh@1',
    'tisha@gmail.com': 'Animesh@1',
  };

  for (const user of users) {
    const desiredPassword = passwordMap[user.email];
    if (desiredPassword) {
      console.log(`Resetting password for ${user.email} to: ${desiredPassword}...`);
      const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
        password: desiredPassword,
      });
      if (updateErr) {
        console.error(`  Failed:`, updateErr.message);
      } else {
        console.log(`  Success!`);
      }
    }
  }
}

main();
