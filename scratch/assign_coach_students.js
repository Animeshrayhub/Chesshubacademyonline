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
  const coachUserId = '0e386fc6-2d6f-449e-b28c-6add6ce0f150'; // Animesh Ray
  
  // Get coach profile id
  const { data: coachProfile } = await supabase
    .from('coach_profiles')
    .select('id')
    .eq('user_id', coachUserId)
    .single();
    
  if (!coachProfile) {
    console.error('Coach profile not found!');
    return;
  }
  
  console.log('Coach Profile ID:', coachProfile.id);
  
  // Get all student profile ids
  const { data: students } = await supabase.from('student_profiles').select('id');
  console.log('Students found:', students);
  
  // 1. Assign students to coach in coach_student_assignments table
  for (const student of students) {
    const { data: existing } = await supabase
      .from('coach_student_assignments')
      .select('id')
      .eq('coach_id', coachProfile.id)
      .eq('student_id', student.id)
      .maybeSingle();
      
    if (!existing) {
      const { error: insErr } = await supabase
        .from('coach_student_assignments')
        .insert({
          coach_id: coachProfile.id,
          student_id: student.id
        });
      if (insErr) {
        console.error('Insert error:', insErr);
      } else {
        console.log(`Assigned student ${student.id} to coach ${coachProfile.id}`);
      }
    } else {
      console.log(`Student ${student.id} already assigned to coach`);
    }
  }

  // 2. Link existing homework assignments to this coach
  const { data: updatedAssignments, error: updErr } = await supabase
    .from('homework_assignments')
    .update({ coach_id: coachProfile.id })
    .is('coach_id', null);
    
  if (updErr) {
    console.error('Update assignments error:', updErr);
  } else {
    console.log('Updated homework assignments coach_id values to', coachProfile.id);
  }
}

main();
