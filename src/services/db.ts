import { createSupabaseServer } from '@/lib/supabase/server';

export interface DBUser {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'ADMIN' | 'COACH' | 'STUDENT';
  is_active: boolean;
  created_at: string;
}

export interface DBStudentProfile {
  id: string;
  user_id: string;
  age: number;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  parent_name: string;
  parent_whatsapp: string;
  joined_date: string;
  notes?: string;
  users?: DBUser;
}

export interface DBCoachProfile {
  id: string;
  user_id: string;
  title: string;
  photo_url?: string;
  whatsapp: string;
  languages: string[];
  experience_years: number;
  bio: string;
  users?: DBUser;
}

export interface DBClass {
  id: string;
  scheduled_start: string;
  duration_minutes: number;
  class_type: 'PRIVATE' | 'BUDDY' | 'GROUP';
  coach_id: string;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'RECORDING_AVAILABLE' | 'CANCELLED';
  zoom_meeting_id?: string;
  zoom_start_url?: string;
  zoom_join_url?: string;
  coach_profiles?: {
    id: string;
    title: string;
    users?: {
      first_name: string;
      last_name: string;
    };
  };
  class_students?: {
    student_profiles?: {
      id: string;
      users?: {
        first_name: string;
        last_name: string;
      };
    };
  }[];
}

/**
 * Fetch profile data for the current user
 */
export async function fetchUserProfile(userId: string): Promise<DBUser | null> {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from('users')
    .select('id, username, email, first_name, last_name, role, is_active, created_at')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data as DBUser;
}

/**
 * Fetch student profile data by user ID
 */
export async function fetchStudentProfileByUserId(userId: string): Promise<DBStudentProfile | null> {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from('student_profiles')
    .select(`
      id, user_id, age, level, parent_name, parent_whatsapp, joined_date, notes,
      users ( id, username, email, first_name, last_name, role, is_active, created_at )
    `)
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return data as any as DBStudentProfile;
}

/**
 * Fetch coach profile data by user ID
 */
export async function fetchCoachProfileByUserId(userId: string): Promise<DBCoachProfile | null> {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from('coach_profiles')
    .select(`
      id, user_id, title, photo_url, whatsapp, languages, experience_years, bio,
      users ( id, username, email, first_name, last_name, role, is_active, created_at )
    `)
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return data as any as DBCoachProfile;
}

/**
 * Fetch classes list for the logged-in user based on their role
 */
export async function fetchClasses(role: 'ADMIN' | 'COACH' | 'STUDENT', profileId: string): Promise<DBClass[]> {
  const supabase = createSupabaseServer();

  let query = (supabase as any).from('classes').select(`
    id, scheduled_start, duration_minutes, class_type, coach_id, status, zoom_meeting_id, zoom_join_url,
    coach_profiles (
      id, title,
      users ( first_name, last_name )
    ),
    class_students (
      student_profiles (
        id,
        users ( first_name, last_name )
      )
    )
  `).eq('archived_at', null);

  if (role === 'COACH') {
    query = query.eq('coach_id', profileId);
  } else if (role === 'STUDENT') {
    // RLS will enforce that the student only sees their own enrolled classes
    // We can also query explicitly
    query = query.filter('class_students.student_profiles.id', 'eq', profileId);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as any as DBClass[];
}

/**
 * Fetch class reports by class ID
 */
export async function fetchClassReport(classId: string) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from('class_reports')
    .select(`
      id, class_id, coach_id, notes, submitted_at, locked_at,
      class_attendance ( id, student_id, status, feedback )
    `)
    .eq('class_id', classId)
    .single();

  if (error) return null;
  return data;
}

/**
 * Fetch in-app notifications
 */
export async function fetchUserNotifications(userId: string) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, title, message, is_read, created_at')
    .eq('user_id', userId)
    .is('archived_at' as any, null)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data;
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Soft delete utility function
 */
export async function softDeleteRecord(tableName: string, recordId: string) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from(tableName)
    .update({ archived_at: new Date().toISOString() })
    .eq('id', recordId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
