import { createSupabaseAdmin } from '../supabase/admin';
import { assertAdmin } from '../permissions';
import {
  CreateCoachSchema,
  CreateStudentSchema,
  CreateAdminSchema,
  UpdateUserProfileSchema,
  RoleSchema,
  PasswordSchema,
  type CreateCoachInput,
  type CreateStudentInput,
  type CreateAdminInput,
  type UpdateUserProfileInput,
} from '../validators';
import {
  BaseError,
  ValidationError,
  DatabaseError,
  NotFoundError,
  InternalServerError,
  type Result,
} from '../errors';

/**
 * Creates a Coach user account and profile.
 * Only callable by active Admins.
 */
export async function createCoach(data: CreateCoachInput): Promise<Result<any>> {
  try {
    await assertAdmin();

    // Validate inputs
    const validation = CreateCoachSchema.safeParse(data);
    if (!validation.success) {
      const formatted = validation.error.format();
      const errorMap: Record<string, string[]> = {};
      for (const [key, value] of Object.entries(formatted)) {
        if (key !== '_errors' && value && '_errors' in value) {
          errorMap[key] = value._errors;
        }
      }
      return {
        success: false,
        error: new ValidationError('Invalid inputs for coach creation', errorMap),
      };
    }

    const validated = validation.data;
    const cleanEmail = validated.email.toLowerCase().trim();
    const adminClient = createSupabaseAdmin();

    // 1. Pre-check for duplicate email in public.users
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id, role')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingUser) {
      return {
        success: false,
        error: new ValidationError('An account with this login ID already exists.'),
      };
    }

    // 2. Create Auth user
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password: validated.password,
      email_confirm: true,
      app_metadata: { role: 'COACH' },
      user_metadata: {
        role: 'COACH',
        username: validated.username || cleanEmail,
        first_name: validated.firstName,
        last_name: validated.lastName,
        title: validated.title,
        photo_url: validated.photoUrl || null,
        whatsapp: validated.whatsapp,
        languages: validated.languages,
        experience_years: validated.experienceYears,
        bio: validated.bio,
        country: validated.country || null,
        timezone: validated.timezone || 'Asia/Kolkata',
        specializations: validated.specializations || null,
      },
    });

    if (authError || !authUser.user) {
      const isDuplicate = authError?.message?.toLowerCase().includes('already registered') ||
        authError?.message?.toLowerCase().includes('already exists');
      return {
        success: false,
        error: new DatabaseError(
          isDuplicate ? 'An account with this login ID already exists.' : (authError?.message || 'Authentication user creation failed'),
          authError
        ),
      };
    }

    const newUserId = authUser.user.id;

    // 3. Ensure public.users and coach_profiles database records are created atomically
    try {
      const { error: userErr } = await adminClient.from('users').upsert({
        id: newUserId,
        username: validated.username || cleanEmail,
        email: cleanEmail,
        first_name: validated.firstName,
        last_name: validated.lastName,
        role: 'COACH',
        is_active: true,
        password: '__auth_managed__',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      if (userErr) throw userErr;

      const { error: profileErr } = await adminClient.from('coach_profiles').upsert({
        id: newUserId,
        user_id: newUserId,
        title: validated.title || 'Coach',
        whatsapp: validated.whatsapp || '',
        languages: validated.languages || ['English'],
        experience_years: validated.experienceYears || 1,
        bio: validated.bio || '',
        created_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      if (profileErr) throw profileErr;
    } catch (dbSyncErr: any) {
      console.error('Profile sync error during coach creation. Rolling back auth user:', dbSyncErr);
      try {
        await adminClient.auth.admin.deleteUser(newUserId);
      } catch (rbErr) {
        console.error('Failed to rollback auth user:', rbErr);
      }
      return {
        success: false,
        error: new DatabaseError(`Account creation failed: ${dbSyncErr?.message || 'Database synchronization error'}`),
      };
    }

    return { success: true, data: authUser.user };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Creates a Student user account and profile.
 * Only callable by active Admins.
 */
export async function createStudent(data: CreateStudentInput): Promise<Result<any>> {
  try {
    await assertAdmin();

    // Validate inputs
    const validation = CreateStudentSchema.safeParse(data);
    if (!validation.success) {
      const formatted = validation.error.format();
      const errorMap: Record<string, string[]> = {};
      for (const [key, value] of Object.entries(formatted)) {
        if (key !== '_errors' && value && '_errors' in value) {
          errorMap[key] = value._errors;
        }
      }
      return {
        success: false,
        error: new ValidationError('Invalid inputs for student creation', errorMap),
      };
    }

    const validated = validation.data;
    const cleanEmail = validated.email.toLowerCase().trim();
    const adminClient = createSupabaseAdmin();

    // 1. Pre-check for duplicate email in public.users
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id, role')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingUser) {
      return {
        success: false,
        error: new ValidationError('An account with this login ID already exists.'),
      };
    }

    // 2. Create Auth user
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password: validated.password,
      email_confirm: true,
      app_metadata: { role: 'STUDENT' },
      user_metadata: {
        role: 'STUDENT',
        username: validated.username || cleanEmail,
        first_name: validated.firstName,
        last_name: validated.lastName,
        age: validated.age,
        level: validated.level,
        parent_name: validated.parentName,
        parent_whatsapp: validated.parentWhatsapp,
        notes: validated.notes || null,
        phone: validated.phone || null,
        country: validated.country || null,
        timezone: validated.timezone || 'Asia/Kolkata',
        lichess_username: validated.lichessUsername || null,
      },
    });

    if (authError || !authUser.user) {
      const isDuplicate = authError?.message?.toLowerCase().includes('already registered') ||
        authError?.message?.toLowerCase().includes('already exists');
      return {
        success: false,
        error: new DatabaseError(
          isDuplicate ? 'An account with this login ID already exists.' : (authError?.message || 'Authentication user creation failed'),
          authError
        ),
      };
    }

    const newUserId = authUser.user.id;

    // 3. Ensure public.users and student_profiles database records are created atomically
    try {
      const { error: userErr } = await adminClient.from('users').upsert({
        id: newUserId,
        username: validated.username || cleanEmail,
        email: cleanEmail,
        first_name: validated.firstName,
        last_name: validated.lastName,
        role: 'STUDENT',
        is_active: true,
        password: '__auth_managed__',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      if (userErr) throw userErr;

      const { error: profileErr } = await adminClient.from('student_profiles').upsert({
        id: newUserId,
        user_id: newUserId,
        age: validated.age || 10,
        level: validated.level || 'BEGINNER',
        parent_name: validated.parentName || '',
        parent_whatsapp: validated.parentWhatsapp || '',
        notes: validated.notes || null,
        created_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      if (profileErr) throw profileErr;
    } catch (dbSyncErr: any) {
      console.error('Profile sync error during student creation. Rolling back auth user:', dbSyncErr);
      try {
        await adminClient.auth.admin.deleteUser(newUserId);
      } catch (rbErr) {
        console.error('Failed to rollback auth user:', rbErr);
      }
      return {
        success: false,
        error: new DatabaseError(`Account creation failed: ${dbSyncErr?.message || 'Database synchronization error'}`),
      };
    }

    // 2. Perform coach-student assignment if coach is assigned
    if (validated.assignedCoachId) {
      try {
        let coachProfId = validated.assignedCoachId;

        const { data: cProf } = await adminClient
          .from('coach_profiles')
          .select('id')
          .or(`user_id.eq.${validated.assignedCoachId},id.eq.${validated.assignedCoachId}`)
          .maybeSingle();

        if (cProf?.id) {
          coachProfId = cProf.id;
        }

        let studentProfId = authUser.user.id;
        const { data: sProf } = await adminClient
          .from('student_profiles')
          .select('id')
          .or(`user_id.eq.${authUser.user.id},id.eq.${authUser.user.id}`)
          .maybeSingle();

        if (sProf?.id) {
          studentProfId = sProf.id;
        }

        await adminClient
          .from('coach_student_assignments')
          .insert({
            coach_id: coachProfId,
            student_id: studentProfId,
          });
      } catch (assignErr) {
        console.warn('Coach assignment warning during onboarding:', assignErr);
      }
    }

    return { success: true, data: authUser.user };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Enables or disables a user account.
 * Only callable by active Admins.
 */
export async function disableUser(
  userId: string,
  disabled: boolean
): Promise<Result<{ id: string; isActive: boolean }>> {
  try {
    await assertAdmin();
    const adminClient = createSupabaseAdmin();
    const isActive = !disabled;

    if (disabled) {
      // Check if user being disabled is an ADMIN
      const { data: targetUser } = await adminClient
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (targetUser?.role === 'ADMIN') {
        const { count } = await adminClient
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'ADMIN')
          .eq('is_active', true);

        if ((count ?? 0) <= 1) {
          return {
            success: false,
            error: new ValidationError('At least one active administrator must remain.'),
          };
        }
      }
    }

    // 1. Update public.users table
    const { data, error: dbError } = await adminClient
      .from('users')
      .update({ is_active: isActive })
      .eq('id', userId)
      .select('id, is_active')
      .single();

    if (dbError || !data) {
      return {
        success: false,
        error: new DatabaseError('Failed to update user active status in database', dbError),
      };
    }

    // 2. Update Auth User (ban duration & metadata)
    try {
      await adminClient.auth.admin.updateUserById(userId, {
        ban_duration: disabled ? '876000h' : 'none',
        user_metadata: { is_active: isActive },
      });
    } catch (authErr) {
      console.warn('Non-blocking auth update warning in disableUser:', authErr);
    }

    return { success: true, data: { id: data.id, isActive: data.is_active } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Archives a user account (soft delete).
 * Only callable by active Admins.
 */
export async function archiveUser(
  userId: string
): Promise<Result<{ id: string; archivedAt: string }>> {
  try {
    await assertAdmin();
    const adminClient = createSupabaseAdmin();

    // Check user and role
    const { data: user, error: fetchError } = await adminClient
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      return { success: false, error: new NotFoundError('User not found') };
    }

    const archivedAt = new Date().toISOString();

    // Update public.users
    const { error: dbError } = await adminClient
      .from('users')
      .update({ archived_at: archivedAt, is_active: false })
      .eq('id', userId);

    if (dbError) {
      return {
        success: false,
        error: new DatabaseError('Failed to archive user in database', dbError),
      };
    }

    // Update profile
    if (user.role === 'COACH') {
      const { error: profileError } = await adminClient
        .from('coach_profiles')
        .update({ archived_at: archivedAt })
        .eq('user_id', userId);
      if (profileError) {
        return { success: false, error: new DatabaseError('Failed to archive coach profile', profileError) };
      }
    } else if (user.role === 'STUDENT') {
      const { error: profileError } = await adminClient
        .from('student_profiles')
        .update({ archived_at: archivedAt })
        .eq('user_id', userId);
      if (profileError) {
        return { success: false, error: new DatabaseError('Failed to archive student profile', profileError) };
      }
    }

    // Update Auth user
    await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: { is_active: false, archived_at: archivedAt },
    });

    return { success: true, data: { id: userId, archivedAt } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Resets a user's password.
 * Only callable by active Admins.
 */
export async function resetPassword(
  userId: string,
  newPassword: string
): Promise<Result<{ id: string }>> {
  try {
    await assertAdmin();

    const passwordValidation = PasswordSchema.safeParse(newPassword);
    if (!passwordValidation.success) {
      const formatted = passwordValidation.error.format();
      return {
        success: false,
        error: new ValidationError('Invalid password format', {
          password: formatted._errors || [],
        }),
      };
    }

    const adminClient = createSupabaseAdmin();
    const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (authError) {
      return {
        success: false,
        error: new DatabaseError('Failed to update auth password', authError),
      };
    }

    return { success: true, data: { id: userId } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Changes a user's role.
 * Only callable by active Admins.
 */
export async function changeRole(
  userId: string,
  newRole: string
): Promise<Result<{ id: string; role: string }>> {
  try {
    await assertAdmin();

    const roleValidation = RoleSchema.safeParse(newRole);
    if (!roleValidation.success) {
      return {
        success: false,
        error: new ValidationError('Invalid role', {
          role: ['Role must be ADMIN, COACH, or STUDENT'],
        }),
      };
    }

    const dbRole = newRole.toUpperCase();
    const adminClient = createSupabaseAdmin();

    // Check user and role
    const { data: user, error: fetchError } = await adminClient
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      return { success: false, error: new NotFoundError('User not found') };
    }

    if (user.role === dbRole) {
      return { success: true, data: { id: userId, role: dbRole } };
    }

    // Update public.users
    const { error: dbError } = await adminClient
      .from('users')
      .update({ role: dbRole })
      .eq('id', userId);

    if (dbError) {
      return {
        success: false,
        error: new DatabaseError('Failed to update role in database', dbError),
      };
    }

    // Update Auth
    const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
      app_metadata: { role: dbRole },
      user_metadata: { role: dbRole },
    });

    if (authError) {
      return { success: false, error: new DatabaseError('Failed to update role in auth', authError) };
    }

    // Handle profiles transition if they don't exist
    if (dbRole === 'COACH') {
      const { data: coachProf } = await adminClient
        .from('coach_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!coachProf) {
        await adminClient.from('coach_profiles').insert({
          id: userId,
          user_id: userId,
          title: 'Coach',
          photo_url: '',
          whatsapp: '',
          languages: [],
          experience_years: 0,
          bio: '',
        });
      }
    } else if (dbRole === 'STUDENT') {
      const { data: studProf } = await adminClient
        .from('student_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!studProf) {
        await adminClient.from('student_profiles').insert({
          id: userId,
          user_id: userId,
          age: 10,
          level: 'BEGINNER',
          parent_name: 'Parent',
          parent_whatsapp: '',
        });
      }
    }

    return { success: true, data: { id: userId, role: dbRole } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Lists active users.
 * Only callable by active Admins.
 */
export async function listUsers(filters?: {
  role?: string;
  isActive?: boolean;
}): Promise<Result<any[]>> {
  try {
    await assertAdmin();
    const adminClient = createSupabaseAdmin();

    let query = adminClient
      .from('users')
      .select('id, username, email, first_name, last_name, role, is_active, created_at, archived_at');

    if (filters?.role) {
      query = query.eq('role', filters.role.toUpperCase());
    }

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    // Exclude archived by default
    query = query.is('archived_at', null);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: new DatabaseError('Failed to list users', error) };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Retrieves full details of a specific user.
 * Only callable by active Admins.
 */
export async function getUserDetails(userId: string): Promise<Result<any>> {
  try {
    await assertAdmin();
    const adminClient = createSupabaseAdmin();

    const { data: user, error: userError } = await adminClient
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return { success: false, error: new NotFoundError('User not found') };
    }

    if (user.role === 'COACH') {
      const { data: profile } = await adminClient
        .from('coach_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      return { success: true, data: { ...user, profile } };
    }

    return { success: true, data: user };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Creates an Admin user account.
 * Only callable by active Admins.
 */
export async function createAdmin(data: CreateAdminInput): Promise<Result<any>> {
  try {
    await assertAdmin();

    const validation = CreateAdminSchema.safeParse(data);
    if (!validation.success) {
      const formatted = validation.error.format();
      const errorMap: Record<string, string[]> = {};
      for (const [key, value] of Object.entries(formatted)) {
        if (key !== '_errors' && value && '_errors' in value) {
          errorMap[key] = value._errors;
        }
      }
      return {
        success: false,
        error: new ValidationError('Invalid inputs for admin creation', errorMap),
      };
    }

    const validated = validation.data;
    const cleanEmail = validated.email.toLowerCase().trim();
    const adminClient = createSupabaseAdmin();

    // 1. Pre-check for duplicate email in public.users
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id, role')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingUser) {
      return {
        success: false,
        error: new ValidationError('An account with this login ID already exists.'),
      };
    }

    // 2. Create Auth user
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password: validated.password,
      email_confirm: true,
      app_metadata: { role: 'ADMIN' },
      user_metadata: {
        role: 'ADMIN',
        username: validated.username || cleanEmail,
        first_name: validated.firstName,
        last_name: validated.lastName,
        display_name: `${validated.firstName} ${validated.lastName}`,
      },
    });

    if (authError || !authUser.user) {
      const isDuplicate = authError?.message?.toLowerCase().includes('already registered') ||
        authError?.message?.toLowerCase().includes('already exists');
      return {
        success: false,
        error: new DatabaseError(
          isDuplicate ? 'An account with this login ID already exists.' : (authError?.message || 'Authentication user creation failed'),
          authError
        ),
      };
    }

    const newUserId = authUser.user.id;

    // 3. Upsert into public.users table atomically
    try {
      const { error: userErr } = await adminClient.from('users').upsert({
        id: newUserId,
        username: validated.username || cleanEmail,
        email: cleanEmail,
        first_name: validated.firstName,
        last_name: validated.lastName,
        role: 'ADMIN',
        is_active: true,
        password: '__auth_managed__',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      if (userErr) throw userErr;
    } catch (dbSyncErr: any) {
      console.error('Database sync error during admin creation. Rolling back auth user:', dbSyncErr);
      try {
        await adminClient.auth.admin.deleteUser(newUserId);
      } catch (rbErr) {}
      return {
        success: false,
        error: new DatabaseError(`Account creation failed: ${dbSyncErr?.message || 'Database synchronization error'}`),
      };
    }

    return { success: true, data: authUser.user };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Updates a user account (Name, Phone, Language, Timezone, Role, Status, Avatar).
 * Supports updating related profile details dynamically.
 * Only callable by active Admins.
 */
export async function updateUser(
  userId: string,
  data: UpdateUserProfileInput & {
    photoUrl?: string | null;
    whatsapp?: string;
    languages?: string[];
    experienceYears?: number;
    bio?: string;
    title?: string;
    age?: number;
    level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    parentName?: string;
    parentWhatsapp?: string;
    notes?: string | null;
  }
): Promise<Result<any>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    // 1. Fetch user to check current role
    const { data: user, error: fetchError } = await admin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      return { success: false, error: new NotFoundError('User not found') };
    }

    // 2. Perform updates on public.users
    const userUpdates: any = {
      updated_at: new Date().toISOString(),
    };
    if (data.firstName !== undefined) userUpdates.first_name = data.firstName;
    if (data.lastName !== undefined) userUpdates.last_name = data.lastName;
    if (data.username !== undefined) userUpdates.username = data.username;
    if (data.isActive !== undefined) userUpdates.is_active = data.isActive;

    const { error: dbError } = await admin
      .from('users')
      .update(userUpdates)
      .eq('id', userId);

    if (dbError) {
      return { success: false, error: new DatabaseError('Failed to update user record', dbError) };
    }

    // 3. Update related profile if role is COACH or STUDENT (using original immutable role)
    const activeRole = user.role;

    if (activeRole === 'COACH') {
      const coachUpdates: any = {
        updated_at: new Date().toISOString(),
      };
      if (data.title !== undefined) coachUpdates.title = data.title;
      if (data.avatarUrl !== undefined) coachUpdates.photo_url = data.avatarUrl;
      if (data.photoUrl !== undefined) coachUpdates.photo_url = data.photoUrl;
      if (data.phone !== undefined) coachUpdates.whatsapp = data.phone;
      if (data.whatsapp !== undefined) coachUpdates.whatsapp = data.whatsapp;
      if (data.languages !== undefined) coachUpdates.languages = data.languages;
      if (data.experienceYears !== undefined) coachUpdates.experience_years = data.experienceYears;
      if (data.bio !== undefined) coachUpdates.bio = data.bio;

      // Upsert coach profile
      const { error: profileErr } = await admin
        .from('coach_profiles')
        .upsert({ user_id: userId, ...coachUpdates }, { onConflict: 'user_id' });

      if (profileErr) {
        return { success: false, error: new DatabaseError('Failed to update coach profile', profileErr) };
      }
    } else if (activeRole === 'STUDENT') {
      const studentUpdates: any = {
        updated_at: new Date().toISOString(),
      };
      if (data.age !== undefined) studentUpdates.age = data.age;
      if (data.level !== undefined) studentUpdates.level = data.level;
      if (data.parentName !== undefined) studentUpdates.parent_name = data.parentName;
      if (data.phone !== undefined) studentUpdates.parent_whatsapp = data.phone;
      if (data.parentWhatsapp !== undefined) studentUpdates.parent_whatsapp = data.parentWhatsapp;
      if (data.notes !== undefined) studentUpdates.notes = data.notes;

      // Upsert student profile
      const { error: profileErr } = await admin
        .from('student_profiles')
        .upsert({ user_id: userId, ...studentUpdates }, { onConflict: 'user_id' });

      if (profileErr) {
        return { success: false, error: new DatabaseError('Failed to update student profile', profileErr) };
      }
    }

    // 4. Update Auth metadata (omit role updates)
    const authUpdates: any = {
      user_metadata: {},
    };
    if (data.firstName !== undefined) authUpdates.user_metadata.first_name = data.firstName;
    if (data.lastName !== undefined) authUpdates.user_metadata.last_name = data.lastName;
    if (data.isActive !== undefined) authUpdates.user_metadata.is_active = data.isActive;
    if (data.avatarUrl !== undefined) authUpdates.user_metadata.avatar_url = data.avatarUrl;
    if (data.timezone !== undefined) authUpdates.user_metadata.timezone = data.timezone;

    const { error: authError } = await admin.auth.admin.updateUserById(userId, authUpdates);
    if (authError) {
      return { success: false, error: new DatabaseError('Failed to sync auth metadata', authError) };
    }

    return { success: true, data: { id: userId } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Permanently deletes a user account (Auth and database).
 * Only callable by active Admins.
 */
export async function deleteUser(userId: string): Promise<Result<{ id: string }>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    // 1. Delete profile records
    await admin.from('student_profiles').delete().eq('user_id', userId);
    await admin.from('coach_profiles').delete().eq('user_id', userId);

    // 2. Delete public.users record
    const { error: dbError } = await admin.from('users').delete().eq('id', userId);
    if (dbError) {
      return { success: false, error: new DatabaseError('Failed to delete user database record', dbError) };
    }

    // 3. Delete Supabase Auth user
    try {
      await admin.auth.admin.deleteUser(userId);
    } catch (e) {
      // Ignore if auth user was already removed
    }

    return { success: true, data: { id: userId } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

