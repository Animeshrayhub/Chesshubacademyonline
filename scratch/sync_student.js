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
  const email = 'student@chesshub.com';
  const password = 'Student123!';
  
  // 1. Resolve existing user in public.users
  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (!dbUser) {
    console.error('No student user found in DB.');
    return;
  }
  const oldId = dbUser.id;
  console.log(`Found old student user ID: ${oldId}`);

  // 2. Rename old student user email and username
  const tempEmail = `temp_${Date.now()}_${email}`;
  const tempUsername = `temp_${Date.now()}_student`;
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
      first_name: 'Rahul',
      last_name: 'Patel',
      username: 'student_rahul'
    }
  });

  if (createErr) {
    console.error('Create auth user failed. Rolling back rename...', createErr);
    await supabase.from('users').update({ email: email, username: 'student_rahul' }).eq('id', oldId);
    return;
  }

  const newId = created.user.id;
  console.log(`Auth user created successfully with ID: ${newId}`);

  // 4. Correct the role in public.users to STUDENT
  console.log('Correcting role in public.users to STUDENT...');
  await supabase.from('users').update({ role: 'STUDENT' }).eq('id', newId);

  // 5. Query the old student profile details to preserve them
  const { data: oldProfile } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('user_id', oldId)
    .maybeSingle();

  if (oldProfile) {
    console.log(`Found existing student profile:`, oldProfile);

    // 6. Create the new student profile row
    console.log(`Inserting new student profile with ID ${newId}...`);
    const { error: insErr } = await supabase.from('student_profiles').insert({
      id: newId,
      user_id: newId,
      age: oldProfile.age,
      level: oldProfile.level,
      parent_name: oldProfile.parent_name,
      parent_whatsapp: oldProfile.parent_whatsapp,
      joined_date: oldProfile.joined_date,
      notes: oldProfile.notes
    });

    if (insErr) {
      console.error('Failed to insert new student profile:', insErr.message);
      return;
    }

    // 7. Update all tables referencing oldProfile.id to newId
    console.log('Updating coach_student_assignments student_id...');
    await supabase.from('coach_student_assignments').update({ student_id: newId }).eq('student_id', oldProfile.id);

    console.log('Updating lms_course_enrollments student_id...');
    await supabase.from('lms_course_enrollments').update({ student_id: newId }).eq('student_id', oldProfile.id);

    console.log('Updating class_students student_id...');
    await supabase.from('class_students').update({ student_id: newId }).eq('student_id', oldProfile.id);

    console.log('Updating homework_submissions student_id...');
    await supabase.from('homework_submissions').update({ student_id: newId }).eq('student_id', oldProfile.id);

    // 8. Delete old student profile and old user
    console.log(`Deleting old student profile ${oldProfile.id}...`);
    await supabase.from('student_profiles').delete().eq('id', oldProfile.id);
  }

  console.log(`Deleting old temporary user ${oldId}...`);
  const { error: delErr } = await supabase.from('users').delete().eq('id', oldId);
  if (delErr) {
    console.error('Failed to delete old user:', delErr.message);
  } else {
    console.log('Deleted old user successfully.');
  }

  console.log('Student sync complete!');
}

main();
