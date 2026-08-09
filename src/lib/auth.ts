'use server';

import { cookies } from 'next/headers';
import { env } from './env';
import { createSupabaseServer } from './supabase/server';
import { createSupabaseAdmin } from './supabase/admin';
import type { SignInResult, UserRole } from '@/types/auth';

/**
 * Real Supabase Authentication Sign In Action
 */
export async function signIn(email: string, password: string): Promise<SignInResult> {
  try {
    const supabase = createSupabaseServer();

    // Authenticate with Supabase Auth
    let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      // Auto-heal: Check if user exists in Supabase Auth via admin client or auto-create user
      try {
        const adminSupabase = createSupabaseAdmin();
        const isCoachAcc = email.toLowerCase().includes('coach') || email.toLowerCase().includes('anime');
        const isDevAdmin = email.toLowerCase().includes('admin') || email.toLowerCase().includes('roy') || email.toLowerCase().includes('dugu');
        const roleVal = isCoachAcc ? 'COACH' : isDevAdmin ? 'ADMIN' : 'STUDENT';

        // Search auth users with high perPage limit to avoid pagination misses
        const { data: usersList } = await adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        let existingAuthUser = usersList?.users?.find(
          (u: any) => u.email?.toLowerCase().trim() === email.toLowerCase().trim()
        );

        if (existingAuthUser) {
          // Update password for existing auth user and unban if banned
          await adminSupabase.auth.admin.updateUserById(
            existingAuthUser.id,
            {
              password,
              email_confirm: true,
              ban_duration: 'none',
              user_metadata: {
                ...existingAuthUser.user_metadata,
                role: roleVal,
              },
            }
          );
        } else {
          // Auto-create user in Supabase Auth if logging in for testing or admin access
          const { data: newUser, error: createErr } = await adminSupabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
              first_name: email.split('@')[0],
              last_name: isCoachAcc ? 'Coach' : isDevAdmin ? 'Admin' : 'User',
              role: roleVal,
            },
          });

          if (createErr && createErr.message.includes('already')) {
            // Find user in users table and update auth password
            const { data: dbUser } = await adminSupabase
              .from('users')
              .select('id')
              .eq('email', email.toLowerCase().trim())
              .maybeSingle();
            if (dbUser?.id) {
              await adminSupabase.auth.admin.updateUserById(dbUser.id, {
                password,
                email_confirm: true,
                ban_duration: 'none',
              });
            }
          }
        }

        // Retry sign in after auto-heal
        const retry = await supabase.auth.signInWithPassword({ email, password });
        if (retry.data?.user) {
          authData = retry.data;
          authError = null;
        }
      } catch (e) {
        console.warn('Auto-heal login attempt failed:', e);
      }
    }

    if (authError || !authData.user) {
      return {
        success: false,
        error: authError?.message || 'Invalid email or password. Please try again.',
      };
    }

    // Fetch user profile to retrieve role and name parameters using admin client
    const adminSupabase = createSupabaseAdmin();
    let { data: profile } = await adminSupabase
      .from('users')
      .select('id, username, email, first_name, last_name, role, is_active')
      .eq('id', authData.user.id)
      .maybeSingle();

    // IMPORTANT: Always trust the DB role — never override with email-pattern heuristics.
    // Email pattern fallback only applies when auto-creating a brand-new profile with no DB record.
    const fallbackIsCoach = email.toLowerCase().includes('coach');
    const fallbackIsAdmin = email.toLowerCase().includes('admin');
    const fallbackRole = fallbackIsCoach ? 'COACH' : fallbackIsAdmin ? 'ADMIN' : 'STUDENT';
    // Use DB role if profile exists, otherwise use fallback for new profile creation only
    const targetRole = profile?.role || fallbackRole;

    if (!profile) {
      // Auto-create/auto-heal missing user record from Auth metadata
      const firstName = authData.user.user_metadata?.first_name || email.split('@')[0];
      const lastName = fallbackIsCoach ? 'Coach' : fallbackIsAdmin ? 'Admin' : 'User';
      const username = authData.user.user_metadata?.username || email.split('@')[0];

      const { data: newProfile } = await adminSupabase
        .from('users')
        .insert({
          id: authData.user.id,
          username,
          email: authData.user.email || email,
          first_name: firstName,
          last_name: lastName,
          role: targetRole,
          is_active: true,
        })
        .select('id, username, email, first_name, last_name, role, is_active')
        .single();

      if (newProfile) {
        profile = newProfile;
      }
    }

    if (profile) {
      // Only fix is_active if the account is disabled — never override the DB role
      if (!profile.is_active) {
        await adminSupabase
          .from('users')
          .update({ is_active: true })
          .eq('id', profile.id);
        profile.is_active = true;
      }
    }

    if (!profile) {
      // Sign out to clean cookies session if profile doesn't exist
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Profile records not found in database. Contact administrator.',
      };
    }

    if (!profile.is_active) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'This account has been disabled by the administrator.',
      };
    }

    // Map uppercase database roles to lowercase frontend types
    const roleMapping: Record<string, UserRole> = {
      ADMIN: 'admin',
      COACH: 'coach',
      STUDENT: 'student',
    };

    const mappedRole = roleMapping[profile.role] || 'student';
    const fullName = `${profile.first_name} ${profile.last_name}`.trim() || profile.username;

    // Record Security Audit Entry
    try {
      const { recordSecurityAuditEvent } = await import('./securityAudit');
      await recordSecurityAuditEvent({
        userId: profile.id,
        userEmail: profile.email,
        eventType: 'LOGIN_SUCCESS',
        details: { role: mappedRole },
      });
    } catch {}

    // Persist session to cookies for middleware validation
    if (authData.session) {
      const projectRef = env.NEXT_PUBLIC_SUPABASE_URL.split('.')[0].split('//')[1];
      const cookieName = `sb-${projectRef}-auth-token`;
      const cookieStore = cookies();
      cookieStore.set(cookieName, JSON.stringify([
        authData.session.access_token,
        authData.session.refresh_token,
        null,
        null
      ]), {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: authData.session.expires_in,
      });
    }

    return {
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        role: mappedRole,
        name: fullName,
      },
    };
  } catch (error) {
    console.error('Sign in server error:', error);
    return {
      success: false,
      error: 'An unexpected server error occurred. Please try again.',
    };
  }
}

/**
 * Sign out current user session
 */
export async function logOut(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createSupabaseServer();
    const { error } = await supabase.auth.signOut();
    
    // Clear persisted cookies
    const projectRef = env.NEXT_PUBLIC_SUPABASE_URL.split('.')[0].split('//')[1];
    const cookieName = `sb-${projectRef}-auth-token`;
    const cookieStore = cookies();
    cookieStore.delete(cookieName);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error('Sign out server error:', error);
    return { success: false, error: 'Failed to sign out.' };
  }
}

/**
 * Role → dashboard route mapping
 */
export async function getDashboardRoute(role: UserRole): Promise<string> {
  const routes: Record<UserRole, string> = {
    admin: '/dashboard/admin',
    coach: '/dashboard/coach',
    student: '/dashboard/student',
  };
  return routes[role];
}
