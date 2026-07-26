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
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

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

    if (!profile) {
      // Auto-create/auto-heal missing user record from Auth metadata
      const userRole = (
        authData.user.app_metadata?.role ||
        authData.user.user_metadata?.role ||
        'STUDENT'
      ).toUpperCase();

      const firstName = authData.user.user_metadata?.first_name || 'Chess';
      const lastName = authData.user.user_metadata?.last_name || 'User';
      const username = authData.user.user_metadata?.username || email.split('@')[0];

      const { data: newProfile } = await adminSupabase
        .from('users')
        .insert({
          id: authData.user.id,
          username,
          email: authData.user.email || email,
          first_name: firstName,
          last_name: lastName,
          role: userRole,
          is_active: true,
        })
        .select('id, username, email, first_name, last_name, role, is_active')
        .single();

      if (newProfile) {
        profile = newProfile;
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
