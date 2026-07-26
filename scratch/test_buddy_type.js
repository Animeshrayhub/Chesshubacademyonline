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
  console.log('Testing insertion of BUDDY class type...');
  const { data, error } = await supabase
    .from('classes')
    .insert({
      coach_id: '0e386fc6-2d6f-449e-b28c-6add6ce0f150',
      scheduled_start: new Date().toISOString(),
      duration_minutes: 60,
      class_type: 'BUDDY',
      status: 'SCHEDULED'
    })
    .select();
    
  console.log('Result:', { data, error });
  
  if (data && data.length > 0) {
    // Delete the test row if it succeeded
    await supabase.from('classes').delete().eq('id', data[0].id);
    console.log('Test BUDDY class deleted.');
  }
}

main();
