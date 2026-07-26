import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const adminClient = createSupabaseAdmin();

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
        password: 'Student1!',
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

    const results = [];

    // Delete existing users if any to prevent collision
    for (const acc of accounts) {
      try {
        const { data: usersList } = await adminClient.auth.admin.listUsers();
        const existingUser = usersList?.users.find((u: any) => u.email === acc.email);
        if (existingUser) {
          await adminClient.auth.admin.deleteUser(existingUser.id);
        }
      } catch (e) {}

      // Create new Auth User (which triggers will copy to public.users & profiles)
      const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true,
        app_metadata: { role: acc.role },
        user_metadata: {
          username: acc.username,
          first_name: acc.firstName,
          last_name: acc.lastName,
          display_name: `${acc.firstName} ${acc.lastName}`,
          role: acc.role.toLowerCase(),
          ...acc.meta,
        },
      });

      if (authError) {
        results.push({ email: acc.email, success: false, error: authError.message });
      } else {
        results.push({ email: acc.email, success: true, user: authUser.user.id });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
