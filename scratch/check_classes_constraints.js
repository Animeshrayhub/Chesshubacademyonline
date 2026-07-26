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
  const { data, error } = await supabase.rpc('get_table_constraints', { t_name: 'classes' });
  if (error) {
    // Try querying pg_catalog directly
    const { data: directData, error: directErr } = await supabase.from('classes').select('*').limit(1);
    console.log('Direct test:', directData, directErr);
    
    // We can run an alter statement via sql editor or a migration runner if available.
    // Let's inspect active classes row structure
    console.log('Classes row structure sample:', directData);
  } else {
    console.log('Constraints:', data);
  }
}

main();
