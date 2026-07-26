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

  console.log('--- Checking student_profiles ---');
  const { data: profiles } = await supabase.from('student_profiles').select('id, user_id, level');
  console.log(profiles);

  console.log('--- Checking users (STUDENT role) ---');
  const { data: students } = await supabase.from('users').select('id, username, first_name, last_name, role').eq('role', 'STUDENT');
  console.log(students);

  console.log('--- Checking homework_workbooks ---');
  const { data: workbooks } = await supabase.from('homework_workbooks').select('id, title, track');
  console.log(workbooks);

  console.log('--- Checking homework_chapters ---');
  const { data: chapters } = await supabase.from('homework_chapters').select('id, workbook_id, title, chapter_number, module_id');
  console.log(chapters);

  console.log('--- Checking lms_course_enrollments ---');
  const { data: enrollments } = await supabase.from('lms_course_enrollments').select('*');
  console.log(enrollments);

  console.log('--- Checking lms_modules ---');
  const { data: lmsModules } = await supabase.from('lms_modules').select('*');
  console.log(lmsModules);
}

main();
