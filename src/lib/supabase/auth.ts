import { createSupabaseServer } from './server';
import { createSupabaseAdmin } from './admin';

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
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const adminSupabase = createSupabaseAdmin();
  const { data: profile } = await adminSupabase
    .from('users')
    .select('id, username, email, first_name, last_name, role, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) return null;

  return {
    id: profile.id,
    email: profile.email,
    username: profile.username,
    firstName: profile.first_name,
    lastName: profile.last_name,
    role: profile.role as UserRole,
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
