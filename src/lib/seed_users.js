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

console.log('Connecting to Supabase at:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

const accounts = [
  {
    email: 'admin@chesshub.com',
    password: 'Admin123!',
    role: 'ADMIN',
    username: 'admin_portal',
    firstName: 'Academy',
    lastName: 'Admin',
    meta: {
      title: 'Administrator',
      whatsapp: '+1000000000',
    },
  },
  {
    email: 'royduguu786@gmail.com',
    password: 'Admin123!',
    role: 'ADMIN',
    username: 'royduguu',
    firstName: 'Roy',
    lastName: 'Duguu',
    meta: {
      title: 'Administrator',
      whatsapp: '+1000000000',
    },
  },
  {
    email: 'coach@chesshub.com',
    password: 'Coach123!',
    role: 'COACH',
    username: 'coach_arjun',
    firstName: 'Arjun',
    lastName: 'Mehta',
    meta: {
      title: 'Grandmaster',
      whatsapp: '+919999999999',
      languages: ['English', 'Hindi'],
      experience_years: 12,
      bio: 'FIDE Grandmaster since 2018. Expert junior coach.',
    },
  },
  {
    email: 'student@chesshub.com',
    password: 'Student123!',
    role: 'STUDENT',
    username: 'student_rahul',
    firstName: 'Rahul',
    lastName: 'Patel',
    meta: {
      age: 12,
      level: 'BEGINNER',
      parent_name: 'Carol Patel',
      parent_whatsapp: '+19998887777',
      notes: 'Positional training focus.',
    },
  },
];

async function seed() {
  try {
    // 1. Clean up orphan database records in public.users to prevent email constraint collisions
    console.log('Cleaning up orphan database records from public.users...');
    const emailsToClean = accounts.map(a => a.email);
    
    // Check if they exist first
    const { data: orphans } = await supabase
      .from('users')
      .select('id, email')
      .in('email', emailsToClean);

    if (orphans && orphans.length > 0) {
      console.log(`Found ${orphans.length} orphan users in public.users. Deleting...`);
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .in('email', emailsToClean);
        
      if (deleteError) {
        throw new Error(`Failed to delete orphan database users: ${deleteError.message}`);
      }
      console.log('Orphan database records deleted successfully.');
    } else {
      console.log('No orphan database records found.');
    }

    // 2. Fetch current auth users
    console.log('Inspecting auth.users...');
    const { data: usersList, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      throw new Error(`Failed to list auth users: ${listError.message}`);
    }

    const existingUsers = usersList?.users || [];
    console.log(`Found ${existingUsers.length} existing auth users.`);

    for (const acc of accounts) {
      const match = existingUsers.find((u) => u.email === acc.email);
      if (match) {
        console.log(`User ${acc.email} already exists in Auth (ID: ${match.id}). Deleting first to reset password...`);
        await supabase.auth.admin.deleteUser(match.id);
      }

      console.log(`Creating user: ${acc.email} (${acc.role})...`);

      // Call auth.admin.createUser
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true,
        app_metadata: { role: acc.role },
        user_metadata: {
          role: acc.role,
          username: acc.username,
          first_name: acc.firstName,
          last_name: acc.lastName,
          display_name: `${acc.firstName} ${acc.lastName}`,
          ...acc.meta,
        },
      });

      if (authError) {
        console.error(`Error creating ${acc.email}:`, authError.message);
      } else {
        console.log(`User ${acc.email} created successfully (ID: ${authUser.user.id}).`);
      }
    }

    // 3. Verification check
    console.log('\n--- VERIFICATION ---');
    
    // Check auth.users
    const { data: finalAuthList } = await supabase.auth.admin.listUsers();
    console.log('auth.users contains:');
    finalAuthList?.users.forEach(u => {
      console.log(`- ${u.email} (${u.app_metadata.role})`);
    });

    // Check public.users
    const { data: publicUsers, error: dbError } = await supabase.from('users').select('id, email, username, role, is_active');
    if (dbError) {
      console.error('Error fetching public.users:', dbError.message);
    } else {
      console.log('public.users contains:');
      publicUsers.forEach(u => {
        console.log(`- ${u.email} (${u.role}) - Active: ${u.is_active}`);
      });
    }

  } catch (err) {
    console.error('Seeding script failed:', err.message);
  }
}

seed();
