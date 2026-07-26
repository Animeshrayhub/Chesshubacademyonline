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
  const coachUserId = '9fe909df-a86a-455f-9235-1fbd6464fe47'; // New auth user ID for Arjun Mehta
  const oldCoachId = 'e3df0e41-5faa-4206-8e47-a3680511aeab';

  console.log(`Re-creating coach profile for Arjun Mehta (User ID: ${coachUserId})...`);
  
  const { data: inserted, error: cpErr } = await supabase
    .from('coach_profiles')
    .insert({
      id: coachUserId,
      user_id: coachUserId,
      title: 'Grandmaster',
      whatsapp: '+919999999999',
      languages: ['English', 'Hindi'],
      experience_years: 5,
      bio: 'FIDE certified senior coach.'
    })
    .select();

  if (cpErr) {
    console.error('Failed to create coach profile:', cpErr.message);
  } else {
    console.log('Successfully created coach profile:', inserted);
  }

  // Restore student assignments if any were deleted or set to null
  console.log('Restoring student assignments...');
  
  // Let's find students that were assigned to Arjun Mehta
  // Tisha (tisha@gmail.com) and tisha Ray (animeshray786@gmail.com) were in his cohort
  const studentUserEmails = ['tisha@gmail.com', 'animeshray786@gmail.com'];
  
  const { data: studentUsers } = await supabase
    .from('users')
    .select('id, email')
    .in('email', studentUserEmails);

  if (studentUsers && studentUsers.length > 0) {
    const studentUserIds = studentUsers.map(u => u.id);
    
    // Find their student profile IDs
    const { data: studentProfiles } = await supabase
      .from('student_profiles')
      .select('id, user_id')
      .in('user_id', studentUserIds);

    if (studentProfiles && studentProfiles.length > 0) {
      for (const sp of studentProfiles) {
        console.log(`Checking assignment for student profile ${sp.id}...`);
        
        // Upsert assignment
        const { error: asgErr } = await supabase
          .from('coach_student_assignments')
          .upsert({
            coach_id: coachUserId,
            student_id: sp.id
          }, { onConflict: 'coach_id, student_id' });

        if (asgErr) {
          console.error(`  Failed to assign student ${sp.id}:`, asgErr.message);
        } else {
          console.log(`  Assigned student ${sp.id} successfully.`);
        }
      }
    }
  }

  // Update classes that might still reference the old coach profile ID
  console.log('Updating classes to point to the new coach profile ID...');
  const { error: clsErr } = await supabase
    .from('classes')
    .update({ coach_id: coachUserId })
    .eq('coach_id', oldCoachId);

  if (clsErr) {
    console.error('Failed to update classes:', clsErr.message);
  } else {
    console.log('Classes updated successfully.');
  }

  console.log('Coach profile restore complete!');
}

main();
