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

const accounts = [
  { email: 'admin@chesshub.com', password: 'Admin123!', role: 'ADMIN', first: 'Academy', last: 'Admin', username: 'admin' },
  { email: 'coach@chesshub.com', password: 'Coach123!', role: 'COACH', first: 'Arjun', last: 'Mehta', username: 'coach_arjun' },
  { email: 'student@chesshub.com', password: 'Student123!', role: 'STUDENT', first: 'Rahul', last: 'Patel', username: 'student_rahul' }
];

async function syncAccount(acc) {
  console.log(`\n--- Syncing ${acc.email} ---`);
  
  // 1. Check if user already exists in auth
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
  const existingAuth = authUsers.find(u => u.email.toLowerCase() === acc.email.toLowerCase());
  
  if (existingAuth) {
    console.log(`User ${acc.email} already in auth with ID ${existingAuth.id}. Updating password to: ${acc.password}...`);
    const { error: updErr } = await supabase.auth.admin.updateUserById(existingAuth.id, {
      password: acc.password,
      email_confirm: true
    });
    if (updErr) console.error('Password update failed:', updErr.message);
    else console.log('Password updated successfully.');
    return;
  }

  // 2. Resolve existing user in public.users
  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', acc.email)
    .maybeSingle();

  let oldId = null;
  if (dbUser) {
    oldId = dbUser.id;
    console.log(`Found existing DB user ${acc.email} with ID ${oldId}. Renaming to free constraint...`);
    const tempEmail = `temp_${Date.now()}_${acc.email}`;
    const { error: renameErr } = await supabase
      .from('users')
      .update({ email: tempEmail })
      .eq('id', oldId);
      
    if (renameErr) {
      console.error(`Failed to rename:`, renameErr.message);
      return;
    }
    console.log(`Renamed successfully to ${tempEmail}`);
  }

  // 3. Create auth user (this triggers handle_new_auth_user insert in public.users)
  console.log(`Creating auth user for ${acc.email}...`);
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: acc.email,
    password: acc.password,
    email_confirm: true,
    user_metadata: {
      role: acc.role,
      first_name: acc.first,
      last_name: acc.last,
      username: acc.username
    }
  });

  if (createErr) {
    console.error(`Failed to create auth user:`, createErr.message);
    // Rollback rename if needed
    if (oldId) {
      await supabase.from('users').update({ email: acc.email }).eq('id', oldId);
    }
    return;
  }

  const newId = created.user.id;
  console.log(`Auth user created successfully with ID ${newId}`);

  // 4. Update the role in public.users to match
  console.log(`Updating role to ${acc.role} in public.users...`);
  await supabase.from('users').update({ role: acc.role }).eq('id', newId);

  // 5. Update references from oldId to newId
  if (oldId) {
    console.log(`Migrating references from old ID ${oldId} to new ID ${newId}...`);
    
    // Check coach_profiles
    if (acc.role === 'COACH') {
      const { error: cpErr } = await supabase.from('coach_profiles').update({ id: newId, user_id: newId }).eq('user_id', oldId);
      if (cpErr) console.error('Failed to update coach_profiles:', cpErr.message);
      else console.log('Updated coach_profiles successfully.');
    }
    
    // Check student_profiles
    if (acc.role === 'STUDENT') {
      const { error: spErr } = await supabase.from('student_profiles').update({ id: newId, user_id: newId }).eq('user_id', oldId);
      if (spErr) console.error('Failed to update student_profiles:', spErr.message);
      else console.log('Updated student_profiles successfully.');
    }

    // Check classes (where coach_id references coach_profiles.id)
    const { error: clsErr } = await supabase.from('classes').update({ coach_id: newId }).eq('coach_id', oldId);
    if (clsErr) console.error('Failed to update classes coach_id:', clsErr.message);

    // Delete the old renamed user
    console.log(`Deleting old renamed user ${oldId} from public.users...`);
    const { error: delErr } = await supabase.from('users').delete().eq('id', oldId);
    if (delErr) console.error('Failed to delete old user:', delErr.message);
    else console.log('Deleted old user successfully.');
  }
}

async function main() {
  for (const acc of accounts) {
    await syncAccount(acc);
  }
  console.log('\nAll sync accounts complete!');
}

main();
