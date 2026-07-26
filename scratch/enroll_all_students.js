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

  // 1. Get the workbook ID
  const { data: workbooks } = await supabase.from('homework_workbooks').select('id');
  if (!workbooks || workbooks.length === 0) {
    console.log('No workbooks found.');
    return;
  }
  const courseId = workbooks[0].id;

  // 2. Get the first chapter ID of this course
  const { data: chapters } = await supabase
    .from('homework_chapters')
    .select('id')
    .eq('workbook_id', courseId)
    .order('chapter_number', { ascending: true })
    .limit(1);
  const firstChapterId = chapters?.[0]?.id || null;

  // 3. Get all students
  const { data: profiles } = await supabase.from('student_profiles').select('id, user_id');
  
  console.log(`Enrolling ${profiles?.length || 0} students in course: ${courseId}`);

  for (const profile of profiles ?? []) {
    // Check if enrollment already exists
    const { data: existing } = await supabase
      .from('lms_course_enrollments')
      .select('id')
      .eq('student_id', profile.id)
      .eq('course_id', courseId)
      .maybeSingle();

    if (!existing) {
      const { data: enrolled, error: enrollErr } = await supabase
        .from('lms_course_enrollments')
        .insert({
          student_id: profile.id,
          course_id: courseId,
          current_chapter_id: firstChapterId,
        })
        .select()
        .single();
      
      if (enrollErr) {
        console.error(`Failed to enroll student ${profile.id}:`, enrollErr.message);
      } else {
        console.log(`Successfully enrolled student ${profile.id}`);
      }
    } else {
      console.log(`Student ${profile.id} is already enrolled.`);
    }

    // Auto-create assignment for the first chapter and set unlocked = true
    if (firstChapterId) {
      const { data: existingAsgn } = await supabase
        .from('homework_assignments')
        .select('id')
        .eq('chapter_id', firstChapterId)
        .eq('student_id', profile.id)
        .maybeSingle();

      if (!existingAsgn) {
        const { error: asgnErr } = await supabase.from('homework_assignments').insert({
          chapter_id: firstChapterId,
          student_id: profile.id,
          coach_id: null,
          status: 'assigned',
          unlocked: true,
        });
        if (asgnErr) {
          console.error(`Failed to create assignment for student ${profile.id}:`, asgnErr.message);
        } else {
          console.log(`Successfully created assignment for student ${profile.id}`);
        }
      } else {
        await supabase.from('homework_assignments').update({ unlocked: true }).eq('id', existingAsgn.id);
        console.log(`Updated assignment unlock status for student ${profile.id}`);
      }
    }
  }
}

main();
