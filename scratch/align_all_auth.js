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

const desiredPasswords = {
  'admin@chesshub.com': 'Admin123!',
  'coach@chesshub.com': 'Coach123!',
  'student@chesshub.com': 'Student123!',
  'tisha@gmail.com': 'Animesh@1',
  'kuni@gmail.com': 'Animesh@1',
  'royduguu786@gmail.com': 'Animesh@1',
  'animeshray786@gmail.com': 'Animesh@1'
};

async function main() {
  console.log('Querying public.users...');
  const { data: dbUsers, error: dbErr } = await supabase.from('users').select('*');
  if (dbErr) {
    console.error('Error fetching db users:', dbErr);
    return;
  }

  console.log('Querying auth users...');
  const { data: { users: authUsers }, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    console.error('Error listing auth users:', authErr);
    return;
  }

  const authUserMap = new Map(authUsers.map(u => [u.email.toLowerCase(), u]));

  for (const dbUser of dbUsers) {
    const emailLower = dbUser.email.toLowerCase();
    const desiredPassword = desiredPasswords[emailLower] || 'Animesh@1';
    const existingAuthUser = authUserMap.get(emailLower);

    if (existingAuthUser) {
      console.log(`User ${dbUser.email} exists in auth. Resetting password to: ${desiredPassword}...`);
      const { error: updErr } = await supabase.auth.admin.updateUserById(existingAuthUser.id, {
        password: desiredPassword,
        email_confirm: true
      });
      if (updErr) {
        console.error(`  Failed to reset password: ${updErr.message}`);
      } else {
        console.log(`  Successfully reset password.`);
      }
    } else {
      console.log(`User ${dbUser.email} NOT in auth. Creating auth user with ID: ${dbUser.id} and password: ${desiredPassword}...`);
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        id: dbUser.id, // Keep the same ID to match public.users!
        email: dbUser.email,
        password: desiredPassword,
        email_confirm: true,
        user_metadata: {
          role: dbUser.role,
          first_name: dbUser.first_name,
          last_name: dbUser.last_name,
          username: dbUser.username
        }
      });

      if (createErr) {
        // If it failed because of ID conflict or similar, try creating without specifying ID
        console.log(`  Failed to create with fixed ID (${createErr.message}). Retrying without fixed ID...`);
        const { data: retryCreated, error: retryErr } = await supabase.auth.admin.createUser({
          email: dbUser.email,
          password: desiredPassword,
          email_confirm: true,
          user_metadata: {
            role: dbUser.role,
            first_name: dbUser.first_name,
            last_name: dbUser.last_name,
            username: dbUser.username
          }
        });

        if (retryErr) {
          console.error(`  Retry failed: ${retryErr.message}`);
        } else {
          console.log(`  Retry successful! Newly created Auth ID: ${retryCreated.user.id}`);
          // Update public.users row to map to the new auth ID
          const oldId = dbUser.id;
          const newId = retryCreated.user.id;
          console.log(`  Updating public.users ID references from ${oldId} to ${newId}...`);
          
          // Update foreign key references first if any, or update users table
          const { error: userUpdErr } = await supabase.from('users').update({ id: newId }).eq('id', oldId);
          if (userUpdErr) {
            console.error(`  Failed to update user ID in DB: ${userUpdErr.message}`);
          } else {
            console.log(`  Successfully mapped DB user ID.`);
          }
        }
      } else {
        console.log(`  Successfully created auth user.`);
      }
    }
  }

  console.log('All auth alignments complete!');
}

main();
