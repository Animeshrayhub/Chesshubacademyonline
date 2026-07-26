const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env file to get credentials
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

if (!supabaseServiceKey) {
  supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpdHF3eWlpYWdkeG16a2dpbXBlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzYxODA1MiwiZXhwIjoyMDk5MTk0MDUyfQ.WcpkODKOmKI0q75Id0RCeaheoZdbUYaT6NrivUX_u30';
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function verify() {
  try {
    console.log('--- DETAILED PROFILE VERIFICATION ---');

    // 1. Fetch coach profiles
    const { data: coaches, error: coachErr } = await supabase.from('coach_profiles').select('*');
    if (coachErr) {
      console.error('Error fetching coach_profiles:', coachErr.message);
    } else {
      console.log(`Found ${coaches.length} coach profiles:`);
      coaches.forEach(c => {
        console.log(`- ID: ${c.id} | User ID: ${c.user_id} | Title: ${c.title}`);
      });
    }

    // 2. Fetch student profiles
    const { data: students, error: studErr } = await supabase.from('student_profiles').select('*');
    if (studErr) {
      console.error('Error fetching student_profiles:', studErr.message);
    } else {
      console.log(`Found ${students.length} student profiles:`);
      students.forEach(s => {
        console.log(`- ID: ${s.id} | User ID: ${s.user_id} | Level: ${s.level} | Parent Name: ${s.parent_name}`);
      });
    }

  } catch (err) {
    console.error('Verification failed:', err.message);
  }
}

verify();
