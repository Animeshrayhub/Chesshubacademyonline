const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://titqwyiiagdxmzkgimpe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpdHF3eWlpYWdkeG16a2dpbXBlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzYxODA1MiwiZXhwIjoyMDk5MTk0MDUyfQ.WcpkODKOmKI0q75Id0RCeaheoZdbUYaT6NrivUX_u30';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  console.log('Data:', data);
  console.log('Error:', error);
}

check();
