import { createSupabaseServer } from './server';
import { createSupabaseAdmin } from './admin';
import { cookies } from 'next/headers';
import { env } from '../env';

export type UserRole = 'ADMIN' | 'COACH' | 'STUDENT';

export interface UserSessionProfile {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
}

/**
 * Sign in with email and password.
 */
export async function signIn(email: string, password: string) {
  const supabase = createSupabaseServer();

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    return { success: false, error: authError.message };
  }

  if (authData?.session) {
    try {
      const projectRef = env.NEXT_PUBLIC_SUPABASE_URL.split('.')[0].split('//')[1];
      const cookieName = `sb-${projectRef}-auth-token`;
      const tokenValue = JSON.stringify([authData.session.access_token, authData.session.refresh_token]);
      cookies().set(cookieName, tokenValue, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      });
    } catch (e) {}
  }

  // Fetch associated profile details
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
    ).toUpperCase() as UserRole;

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
      profile = newProfile as any;
    }
  }

  if (!profile) {
    return {
      success: false,
      error: 'Profile records not found. Contact administrator.',
    };
  }

  if (!profile.is_active) {
    return {
      success: false,
      error: 'This account has been disabled.',
    };
  }

  return {
    success: true,
    user: {
      id: profile.id,
      email: profile.email,
      username: profile.username,
      firstName: profile.first_name,
      lastName: profile.last_name,
      role: profile.role as UserRole,
      isActive: profile.is_active,
    },
  };
}

/**
 * Sign out current session.
 */
export async function signOut() {
  const supabase = createSupabaseServer();
  try {
    const projectRef = env.NEXT_PUBLIC_SUPABASE_URL.split('.')[0].split('//')[1];
    const cookieName = `sb-${projectRef}-auth-token`;
    cookies().delete(cookieName);
  } catch (e) {}
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Get current user profile from active cookies session.
 */
export async function getCurrentUser(): Promise<UserSessionProfile | null> {
  const supabase = createSupabaseServer();
  let targetUserId = '';

  try {
    const cookieStore = cookies();
    const projectRef = env.NEXT_PUBLIC_SUPABASE_URL.split('.')[0].split('//')[1];
    const cookieName = `sb-${projectRef}-auth-token`;
    const tokenVal = cookieStore.get(cookieName)?.value || cookieStore.get('supabase-auth-token')?.value;

    if (tokenVal) {
      let tokenStr = '';
      try {
        const parsed = JSON.parse(tokenVal);
        tokenStr = Array.isArray(parsed) ? parsed[0] : parsed?.access_token || '';
      } catch {
        tokenStr = tokenVal;
      }

      if (tokenStr) {
        const { data: userData } = await supabase.auth.getUser(tokenStr);
        if (userData?.user?.id) {
          targetUserId = userData.user.id;
        } else if (tokenStr.includes('.')) {
          const parts = tokenStr.split('.');
          if (parts[1]) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
            targetUserId = payload.sub || payload.user_id;
          }
        }
      }
    }
  } catch (e) {}

  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    targetUserId = user?.id || '';
  }

  if (!targetUserId) return null;

  const adminSupabase = createSupabaseAdmin();
  const { data: profile } = await adminSupabase
    .from('users')
    .select('id, username, email, first_name, last_name, role, is_active')
    .eq('id', targetUserId)
    .maybeSingle();

  if (!profile || !profile.is_active) return null;

  const effectiveRole = (profile.role || 'STUDENT').toString().toUpperCase() as UserRole;

  return {
    id: profile.id,
    email: profile.email,
    username: profile.username,
    firstName: profile.first_name,
    lastName: profile.last_name,
    role: effectiveRole,
    isActive: profile.is_active,
  };
}

/**
 * Admin only: provision new Student/Coach user accounts.
 */
export async function provisionUserAccount(
  email: string,
  passwordHash: string,
  role: UserRole,
  username: string,
  firstName: string,
  lastName: string,
  extraMetadata: Record<string, any> = {}
) {
  const adminClient = createSupabaseAdmin();

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: passwordHash,
    email_confirm: true,
    app_metadata: { role },
    user_metadata: {
      username,
      first_name: firstName,
      last_name: lastName,
      ...extraMetadata,
    },
  });

  if (error) {
    throw new Error(`Auth account provisioning failed: ${error.message}`);
  }

  return data.user;
}
