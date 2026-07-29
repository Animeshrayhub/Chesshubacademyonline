const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../../.env');
let supabaseUrl = 'https://titqwyiiagdxmzkgimpe.supabase.co';
let supabaseServiceKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
  const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
  if (urlMatch && urlMatch[1]) supabaseUrl = urlMatch[1].trim();
  if (keyMatch && keyMatch[1]) supabaseServiceKey = keyMatch[1].trim();
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  try {
    // 1. Resolve coach profile ID
    const { data: coachUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'coach.alex@chesshub.com')
      .single();
      
    const { data: coachProfile } = await supabase
      .from('coach_profiles')
      .select('id')
      .eq('user_id', coachUser.id)
      .single();

    console.log('New Coach Profile ID:', coachProfile.id);

    // 2. Resolve student profile ID
    const { data: studentUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'student@chesshub.com')
      .single();
      
    const { data: studentProfile } = await supabase
      .from('student_profiles')
      .select('id')
      .eq('user_id', studentUser.id)
      .single();

    console.log('New Student Profile ID:', studentProfile.id);

    // 3. Get existing completed classes
    const classIds = [
      'f7caf607-81b0-4a53-8ef5-71de370ef665',
      'badec997-15ef-4a56-a215-1bef4d6127e1',
      'ee1c98a6-9d78-458b-9944-b3a9efd7a0cb'
    ];

    // Update coach_id for these classes
    console.log('Updating classes coach_id...');
    await supabase
      .from('classes')
      .update({ coach_id: coachProfile.id })
      .in('id', classIds);

    // 4. Insert class_students mapping to link the new student
    console.log('Linking student to classes...');
    for (const classId of classIds) {
      // Clear existing links first to avoid unique key conflicts
      await supabase
        .from('class_students')
        .delete()
        .eq('class_id', classId)
        .eq('student_id', studentProfile.id);

      const { data, error } = await supabase
        .from('class_students')
        .insert({
          class_id: classId,
          student_id: studentProfile.id,
        })
        .select();
      
      if (error) {
        console.error(`Error linking class ${classId}:`, error.message);
      } else {
        console.log(`Successfully linked class ${classId} to student.`);
      }
    }
    
    console.log('Linkage repair completed!');
  } catch (err) {
    console.error('Error repairing linkages:', err.message);
  }
}

run();
