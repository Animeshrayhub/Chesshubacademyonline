import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://titqwyiiagdxmzkgimpe.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function ensureAuth() {
  const { data: users, error } = await admin.auth.admin.listUsers();
  if (error) {
    console.error('listUsers error:', error.message);
    return;
  }

  console.log('Existing Supabase Auth Users:', users.users.map(u => u.email));

  const accounts = [
    { email: 'coach@chesshubacademy.online', pass: 'CoachPassword123!', role: 'COACH', first: 'Alex', last: 'Coach' },
    { email: 'student@chesshubacademy.online', pass: 'StudentPassword123!', role: 'STUDENT', first: 'Leo', last: 'Student' },
  ];

  for (const acc of accounts) {
    const existing = users.users.find(u => u.email === acc.email);
    let userId = existing?.id;

    if (!existing) {
      const res = await admin.auth.admin.createUser({
        email: acc.email,
        password: acc.pass,
        email_confirm: true,
        user_metadata: { role: acc.role, first_name: acc.first, last_name: acc.last },
      });
      if (res.error) console.error(`Error creating ${acc.email}:`, res.error.message);
      else {
        console.log(`Created auth user ${acc.email}`);
        userId = res.data.user.id;
      }
    } else {
      await admin.auth.admin.updateUserById(existing.id, { password: acc.pass });
      console.log(`Updated password for ${acc.email}`);
    }

    if (userId) {
      // Ensure public.users row
      await admin.from('users').upsert({
        id: userId,
        email: acc.email,
        role: acc.role,
        first_name: acc.first,
        last_name: acc.last,
      });

      if (acc.role === 'COACH') {
        await admin.from('coach_profiles').upsert(
          { user_id: userId, title: 'Coach' },
          { onConflict: 'user_id' }
        );
      } else if (acc.role === 'STUDENT') {
        await admin.from('student_profiles').upsert(
          { user_id: userId, level: 'INTERMEDIATE' },
          { onConflict: 'user_id' }
        );
      }
    }
  }
}

ensureAuth().catch(console.error);
