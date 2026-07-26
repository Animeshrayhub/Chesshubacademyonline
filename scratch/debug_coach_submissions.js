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

  console.log('\n--- homework_assignments ---');
  const { data: assignments, error: aErr } = await supabase
    .from('homework_assignments')
    .select('id, chapter_id, student_id, coach_id, status, unlocked, assigned_at');
  if (aErr) console.error('Error:', aErr);
  console.log(JSON.stringify(assignments, null, 2));

  console.log('\n--- homework_submissions ---');
  const { data: submissions, error: sErr } = await supabase
    .from('homework_submissions')
    .select('id, assignment_id, answers, submitted_at, grade_score');
  if (sErr) console.error('Error:', sErr);
  console.log(JSON.stringify(submissions, null, 2));

  console.log('\n--- coach_profiles ---');
  const { data: coaches, error: cErr } = await supabase
    .from('coach_profiles')
    .select('id, user_id');
  if (cErr) console.error('Error:', cErr);
  console.log(JSON.stringify(coaches, null, 2));
}

main();
