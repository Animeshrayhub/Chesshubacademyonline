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
  const oldId = 'e65fc70b-e548-4dae-ad95-7c27c67d9c73';

  // 1. Delete the conflicting row in public.users
  // Wait, if we delete it, will it fail due to foreign key constraints?
  // Let's try deleting it. If it fails, we will know why.
  console.log(`Attempting to delete user ${oldId} from public.users...`);
  const { error: delErr } = await supabase.from('users').delete().eq('id', oldId);
  if (delErr) {
    console.error('Failed to delete user:', delErr.message);
    
    // If it fails, let's try updating its ID to a temporary ID
    const tempId = 'e65fc70b-e548-4dae-ad95-7c27c67d9c79';
    console.log(`Trying to update user ID to ${tempId} to resolve conflict...`);
    const { error: updErr } = await supabase.from('users').update({ id: tempId }).eq('id', oldId);
    if (updErr) {
      console.error('Failed to update user ID:', updErr.message);
      return;
    }
    console.log('Successfully updated user ID to temporary ID.');
  } else {
    console.log('Successfully deleted user from public.users.');
  }

  // 2. Create the auth user
  console.log(`Creating auth user for ${studentEmail}...`);
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: studentEmail,
    password: 'Student1!',
    email_confirm: true,
    user_metadata: {
      role: 'STUDENT',
      first_name: 'Rahul',
      last_name: 'Patel',
      username: 'student_rahul',
    }
  });

  if (createErr) {
    console.error('Error creating auth user:', createErr.message);
    return;
  }

  const newId = created.user.id;
  console.log('Auth user created successfully with ID:', newId);

  // 3. Make sure the role is correct in public.users
  const { data: dbUser, error: fetchErr } = await supabase.from('users').select('*').eq('id', newId).single();
  if (fetchErr || !dbUser) {
    console.log('User not auto-inserted by trigger. Inserting manually...');
    const { error: insErr } = await supabase.from('users').insert({
      id: newId,
      email: studentEmail,
      username: 'student_rahul',
      first_name: 'Rahul',
      last_name: 'Patel',
      role: 'STUDENT',
      is_active: true,
    });
    if (insErr) {
      console.error('Failed to insert user manually:', insErr.message);
    }
  } else {
    console.log('User was auto-inserted by trigger. Updating role to STUDENT...');
    await supabase.from('users').update({ role: 'STUDENT' }).eq('id', newId);
  }

  // 4. Update references in student_profiles and other tables from oldId to newId
  console.log(`Updating student_profiles references from ${oldId} to ${newId}...`);
  const { error: spErr } = await supabase.from('student_profiles').update({ id: newId, user_id: newId }).eq('user_id', oldId);
  if (spErr) {
    console.error('Failed to update student_profiles:', spErr.message);
  } else {
    console.log('Successfully updated student_profiles.');
  }

  const { error: enrollErr } = await supabase.from('lms_course_enrollments').update({ student_id: newId }).eq('student_id', oldId);
  if (enrollErr) {
    console.error('Failed to update enrollments:', enrollErr.message);
  }

  const { error: asgnErr } = await supabase.from('homework_assignments').update({ student_id: newId }).eq('student_id', oldId);
  if (asgnErr) {
    console.error('Failed to update assignments:', asgnErr.message);
  }
}

main();
