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
  const { data, error } = await supabase.from('student_profiles').select('*').limit(1);
  console.log('Student Profile Row:', data, error);
}

run();
