import { createStudent, createCoach } from '@/lib/users';
import { createAdminClient } from '@/utils/supabaseAdmin';
import { createServerClient } from '@/utils/supabaseServer';

export interface StudentCreationData {
  email: string;
  passwordHash: string;
  displayName: string;
  parentName: string;
  parentPhone?: string;
  fideRating?: number;
  lichessUsername?: string;
  currentTrack?: 'Beginner' | 'Intermediate' | 'Advanced';
  assignedCoachId?: string;
}

export interface CoachCreationData {
  email: string;
  passwordHash: string;
  displayName: string;
  fideTitle?: 'GM' | 'WGM' | 'IM' | 'WIM' | 'FM' | 'WFM' | 'CM' | 'WCM';
  fideRating?: number;
  biography?: string;
  specialties?: string[];
  lichessUsername?: string;
}

/**
 * Admin API service layer wrapper. Integrates with the new validation-guarded core users service.
 */
export async function createStudentAccount(student: StudentCreationData) {
  const nameParts = student.displayName.trim().split(/\s+/);
  const firstName = nameParts[0] || 'Chess';
  const lastName = nameParts.slice(1).join(' ') || 'Member';

  const result = await createStudent({
    email: student.email,
    password: student.passwordHash, // Raw password
    firstName,
    lastName,
    age: 10,
    level: (student.currentTrack || 'Beginner').toUpperCase() as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
    parentName: student.parentName,
    parentWhatsapp: student.parentPhone || '0000000000',
    notes: '',
  });

  if (!result.success) {
    throw new Error(result.error.message);
  }

  // Handle coach assignment if requested
  if (student.assignedCoachId) {
    const adminClient = createAdminClient();
    const { error: assignError } = await adminClient
      .from('coach_student_assignments')
      .insert({
        coach_id: student.assignedCoachId,
        student_id: result.data.id,
      });
    if (assignError) {
      console.error(`Failed to assign coach to student: ${assignError.message}`);
    }
  }

  return result.data;
}

export async function createCoachAccount(coach: CoachCreationData) {
  const nameParts = coach.displayName.trim().split(/\s+/);
  const firstName = nameParts[0] || 'Chess';
  const lastName = nameParts.slice(1).join(' ') || 'Member';

  const result = await createCoach({
    email: coach.email,
    password: coach.passwordHash,
    firstName,
    lastName,
    title: coach.fideTitle || 'Coach',
    whatsapp: '0000000000',
    languages: ['English'],
    experienceYears: 5,
    bio: coach.biography || 'Grandmaster & Coach',
  });

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
}

export async function assignDemoBooking(bookingId: string, coachId: string, zoomUrl: string) {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('bookings')
    .update({
      assigned_coach_id: coachId,
      zoom_meeting_url: zoomUrl,
      status: 'assigned',
    })
    .eq('id', bookingId)
    .select()
    .single();

  if (error) {
    throw new Error(`Booking assignment failed: ${error.message}`);
  }

  return data;
}

export async function broadcastAnnouncement(title: string, targetRole: 'coach' | 'student' | 'all', content: string) {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('announcements')
    .insert([
      {
        title,
        target: targetRole,
        content,
        created_at: new Date().toISOString(),
      },
    ])
    .select();

  if (error) {
    throw new Error(`Announcement broadcast failed: ${error.message}`);
  }

  return data;
}
