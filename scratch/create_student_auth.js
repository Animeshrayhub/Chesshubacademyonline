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

  const studentEmail = 'student@chesshub.com';
  const studentId = 'e65fc70b-e548-4dae-ad95-7c27c67d9c73';
  const studentPassword = 'Student1!';

  console.log(`Checking if ${studentEmail} exists in auth...`);
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('Error listing auth users:', listErr);
    return;
  }

  const existing = users.find(u => u.email === studentEmail);
  if (existing) {
    console.log(`User ${studentEmail} already exists in auth. Resetting password...`);
    const { error: updateErr } = await supabase.auth.admin.updateUserById(existing.id, {
      password: studentPassword,
    });
    if (updateErr) {
      console.error('Error resetting password:', updateErr);
    } else {
      console.log('Password reset successfully.');
    }
  } else {
    console.log(`User ${studentEmail} does not exist in auth. Creating user with ID: ${studentId}...`);
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      id: studentId,
      email: studentEmail,
      password: studentPassword,
      email_confirm: true,
      user_metadata: {
        role: 'STUDENT',
        first_name: 'Rahul',
        last_name: 'Patel',
        username: 'student_rahul',
      }
    });

    if (createErr) {
      console.error('Error creating auth user:', createErr);
      console.log('Details:', createErr.message, createErr.status);
    } else {
      console.log('Auth user created successfully:', created.user.id);
    }
  }
}

main();
