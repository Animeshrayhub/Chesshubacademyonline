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
  const email = 'coach@chesshub.com';
  const password = 'Coach123!';
  
  // 1. Resolve existing user in public.users
  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (!dbUser) {
    console.error('No coach user found in DB.');
    return;
  }
  const oldId = dbUser.id;
  console.log(`Found old coach user ID: ${oldId}`);

  // 2. Rename the old user temporarily (both email and username!)
  const tempEmail = `temp_${Date.now()}_${email}`;
  const tempUsername = `temp_${Date.now()}_coach`;
  console.log(`Renaming DB user to email ${tempEmail} and username ${tempUsername}...`);
  const { error: renameErr } = await supabase
    .from('users')
    .update({ email: tempEmail, username: tempUsername })
    .eq('id', oldId);

  if (renameErr) {
    console.error('Rename failed:', renameErr.message);
    return;
  }
  console.log('Renamed successfully.');

  // 3. Create the auth user with metadata role = 'ADMIN' to bypass trigger profile insert!
  console.log(`Creating auth user for ${email} with ADMIN role...`);
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: {
      role: 'ADMIN', // Bypasses trigger!
      first_name: 'Arjun',
      last_name: 'Mehta',
      username: 'coach_arjun'
    }
  });

  if (createErr) {
    console.error('Create auth user failed. Rolling back rename...', createErr);
    await supabase.from('users').update({ email: email, username: 'coach_arjun' }).eq('id', oldId);
    return;
  }

  const newId = created.user.id;
  console.log(`Auth user created successfully with ID: ${newId}`);

  // 4. Correct the role in public.users to COACH
  console.log('Correcting role in public.users to COACH...');
  await supabase.from('users').update({ role: 'COACH' }).eq('id', newId);

  // 5. Migrate the existing coach profile user_id to newId
  console.log(`Migrating coach profile for oldId ${oldId} to newId ${newId}...`);
  
  const { data: profile } = await supabase
    .from('coach_profiles')
    .select('id')
    .eq('user_id', oldId)
    .maybeSingle();

  if (profile) {
    console.log(`Found coach profile with ID ${profile.id}.`);
    const { error: cpErr } = await supabase
      .from('coach_profiles')
      .update({ id: newId, user_id: newId })
      .eq('id', profile.id);

    if (cpErr) {
      console.error('Failed to update coach profile:', cpErr.message);
    } else {
      console.log('Successfully updated coach profile id and user_id.');
    }
  }

  // 6. Update classes coach_id to newId
  console.log('Updating classes coach_id...');
  await supabase.from('classes').update({ coach_id: newId }).eq('coach_id', oldId);

  // 7. Delete old renamed user
  console.log(`Deleting old temporary user ${oldId}...`);
  const { error: delErr } = await supabase.from('users').delete().eq('id', oldId);
  if (delErr) {
    console.error('Failed to delete old user:', delErr.message);
  } else {
    console.log('Deleted old user successfully.');
  }

  console.log('Coach sync complete!');
}

main();
