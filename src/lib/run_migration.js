const https = require('https');

const projectRef = 'titqwyiiagdxmzkgimpe';
const serviceKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpdHF3eWlpYWdkeG16a2dpbXBlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzYxODA1MiwiZXhwIjoyMDk5MTk0MDUyfQ.WcpkODKOmKI0q75Id0RCeaheoZdbUYaT6NrivUX_u30';

// We'll use the Supabase Management API to run SQL
// The management API requires the project's service_role or a management token
// Instead, use pg via the Supabase URL

const { createClient } = require('@supabase/supabase-js');
const client = createClient(
  'https://' + projectRef + '.supabase.co',
  serviceKey,
  { auth: { persistSession: false } }
);

// Execute DDL statements one at a time using custom SQL function approach
// Since we can't run raw SQL via REST, we'll try using supabase functions

async function runSQL(statement) {
  // Try using the Supabase postgres extension if available
  const response = await fetch(
    'https://' + projectRef + '.supabase.co/rest/v1/',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: 'Bearer ' + serviceKey,
      },
      body: JSON.stringify({ query: statement }),
    }
  );
  return response;
}

async function main() {
  console.log('Attempting to create tables via Supabase REST...');

  // Try creating via insert to check if table exists
  const { data: a, error: ae } = await client.from('announcements').select('id').limit(1);
  if (!ae) {
    console.log('announcements already exists');
  } else {
    console.log('announcements missing. Manual SQL needed.');
  }

  const { data: c, error: ce } = await client.from('certificates').select('id').limit(1);
  if (!ce) {
    console.log('certificates already exists');
  } else {
    console.log('certificates missing. Manual SQL needed.');
  }

  console.log('\n=== MANUAL MIGRATION REQUIRED ===');
  console.log('Please run this SQL in Supabase SQL Editor:');
  console.log('https://app.supabase.com/project/' + projectRef + '/sql/new');
  console.log('\n--- SQL START ---');
  console.log(`
create table if not exists public.announcements (
  id            uuid default gen_random_uuid() primary key,
  title         text not null,
  body          text not null,
  target_roles  text[] not null default '{}',
  is_published  boolean not null default false,
  published_at  timestamp with time zone,
  created_by    uuid references public.users(id) on delete set null,
  created_at    timestamp with time zone default timezone('utc', now()) not null,
  updated_at    timestamp with time zone default timezone('utc', now()) not null
);
alter table public.announcements enable row level security;

create table if not exists public.certificates (
  id          uuid default gen_random_uuid() primary key,
  student_id  uuid references public.users(id) on delete cascade not null,
  title       text not null,
  file_url    text,
  issued_at   date not null default current_date,
  created_at  timestamp with time zone default timezone('utc', now()) not null,
  updated_at  timestamp with time zone default timezone('utc', now()) not null
);
alter table public.certificates enable row level security;
  `);
  console.log('--- SQL END ---');
}

main().catch(console.error);
