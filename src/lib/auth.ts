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
    const supabase = createSupabaseAdmin();
    const cleanEmail = email.toLowerCase().trim();

    // Authenticate with Supabase Auth
    let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    // Fallback for local development ONLY IF NEXT_PUBLIC_MOCK_AUTH is explicitly set to 'true'
    if ((authError || !authData?.user) && env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
      const { getMockSupabaseClient } = await import('./supabase/mockClient');
      const mockClient = getMockSupabaseClient();
      const mockRes = await mockClient.auth.signInWithPassword({ email: cleanEmail, password });

      if (mockRes.data?.user && !mockRes.error) {
        authData = mockRes.data as any;
        authError = null;

        // Set Auth Cookie Session
        try {
          const cookieStore = cookies();
          const urlHost = env.NEXT_PUBLIC_SUPABASE_URL.includes('//')
            ? env.NEXT_PUBLIC_SUPABASE_URL.split('//')[1]
            : env.NEXT_PUBLIC_SUPABASE_URL;
          const projectRef = urlHost ? urlHost.split('.')[0] || 'placeholder' : 'placeholder';
          const cookieName = `sb-${projectRef}-auth-token`;
          const userRole = (mockRes.data.user.role || mockRes.data.user.user_metadata?.role || mockRes.data.user.app_metadata?.role || 'STUDENT').toString().toUpperCase();
          const tokenValue = JSON.stringify([`${cleanEmail}:${userRole}`, 'mock-refresh-token']);
          cookieStore.set(cookieName, tokenValue, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
          });
        } catch (e) {}
      }
    }

    if (authError || !authData?.user) {
      return {
        success: false,
        error: 'Invalid email or password. Please try again.',
      };
    }

    // Fetch user profile to retrieve role using admin client
    let profile: any = null;
    try {
      const adminSupabase = createSupabaseAdmin();
      let { data: dbProfile } = await adminSupabase
        .from('users')
        .select('id, username, email, first_name, last_name, role, is_active')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (!dbProfile) {
        // Fallback: search by normalized email
        const { data: dbProfileByEmail } = await adminSupabase
          .from('users')
          .select('id, username, email, first_name, last_name, role, is_active')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (dbProfileByEmail) {
          dbProfile = dbProfileByEmail;
          if (dbProfileByEmail.id !== authData.user.id) {
            await adminSupabase
              .from('users')
              .update({ id: authData.user.id, updated_at: new Date().toISOString() })
              .eq('email', cleanEmail);
            dbProfile.id = authData.user.id;
          }
        }
      }

      if (dbProfile) {
        profile = dbProfile;
      } else {
        // Auto-create missing user record for newly registered Auth user using trusted auth metadata
        const fallbackRole = (authData.user.app_metadata?.role || authData.user.user_metadata?.role || 'STUDENT').toString().toUpperCase();
        const firstName = authData.user.user_metadata?.first_name || cleanEmail.split('@')[0];
        const lastName = authData.user.user_metadata?.last_name || 'User';
        const username = authData.user.user_metadata?.username || cleanEmail.split('@')[0];

        const { data: newProfile } = await adminSupabase
          .from('users')
          .insert({
            id: authData.user.id,
            username,
            email: authData.user.email || cleanEmail,
            password: '__auth_managed__',
            first_name: firstName,
            last_name: lastName,
            role: fallbackRole,
            is_active: true,
          })
          .select('id, username, email, first_name, last_name, role, is_active')
          .single();

        if (newProfile) {
          profile = newProfile;
        }
      }
    } catch (e) {
      // Database offline or mock mode
    }

    // Fallback profile if database query fails or offline mock mode
    if (!profile) {
      const metaRole = (authData.user.app_metadata?.role || authData.user.user_metadata?.role || 'STUDENT').toString().toUpperCase();
      profile = {
        id: authData.user.id,
        username: authData.user.user_metadata?.username || cleanEmail.split('@')[0],
        email: authData.user.email || cleanEmail,
        first_name: authData.user.user_metadata?.first_name || cleanEmail.split('@')[0],
        last_name: authData.user.user_metadata?.last_name || 'User',
        role: metaRole,
        is_active: true,
      };
    }

    if (!profile.is_active) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'This account has been disabled by the administrator.',
      };
    }

    // Map database roles (case-insensitive) to frontend types
    const dbRoleUpper = (profile.role || '').toString().toUpperCase();
    const roleMapping: Record<string, UserRole> = {
      ADMIN: 'admin',
      COACH: 'coach',
      STUDENT: 'student',
    };

    const mappedRole = roleMapping[dbRoleUpper];
    if (!mappedRole) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Your account role could not be verified. Please contact the administrator.',
      };
    }

    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.username;

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
      const urlHost = env.NEXT_PUBLIC_SUPABASE_URL.includes('//')
        ? env.NEXT_PUBLIC_SUPABASE_URL.split('//')[1]
        : env.NEXT_PUBLIC_SUPABASE_URL;
      const projectRef = urlHost ? urlHost.split('.')[0] || 'placeholder' : 'placeholder';
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
    const urlHost = env.NEXT_PUBLIC_SUPABASE_URL.includes('//')
      ? env.NEXT_PUBLIC_SUPABASE_URL.split('//')[1]
      : env.NEXT_PUBLIC_SUPABASE_URL;
    const projectRef = urlHost ? urlHost.split('.')[0] || 'placeholder' : 'placeholder';
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
