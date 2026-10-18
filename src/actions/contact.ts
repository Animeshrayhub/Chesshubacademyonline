'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export interface SubmitContactQueryInput {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}

const SUBJECT_MAP: Record<string, string> = {
  general: 'General Inquiry',
  programs: 'Programs & Pricing',
  booking: 'Book a Demo',
  technical: 'Technical Support',
  other: 'Other',
};

export async function submitContactQueryAction(input: SubmitContactQueryInput) {
  try {
    const { name, email, phone, subject, message } = input;

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return { success: false, error: 'Name, email, and message are required.' };
    }

    const subjectTitle = SUBJECT_MAP[subject || 'general'] || subject || 'General Inquiry';
    const admin = createSupabaseAdmin();

    const newQueryRecord = {
      parent_name: name.trim(),
      parent_email: email.trim().toLowerCase(),
      parent_phone: phone?.trim() || 'N/A',
      student_name: `[Inquiry: ${subjectTitle}] ${name.trim()}`,
      student_age: 10,
      preferred_time: `Subject: ${subjectTitle} | Message: ${message.trim()}`,
      status: 'pending',
    };

    const { data, error } = await admin
      .from('bookings')
      .insert(newQueryRecord)
      .select()
      .single();

    if (error) {
      console.error('[submitContactQueryAction] DB error:', error);
      return { success: false, error: 'Failed to record query in database.' };
    }

    // Try logging to audit_logs if table exists
    try {
      await admin.from('audit_logs').insert({
        table_name: 'contact_queries',
        action: 'INSERT',
        user_email: email.trim(),
        details: {
          name: name.trim(),
          subject: subjectTitle,
          booking_id: data?.id,
        },
      });
    } catch {
      // Non-fatal
    }

    revalidatePath('/dashboard/admin');
    revalidatePath('/dashboard/admin/bookings');
    revalidatePath('/dashboard/admin/reports/bookings');

    return { success: true, data };
  } catch (err: any) {
    console.error('[submitContactQueryAction] unexpected error:', err);
    return { success: false, error: err?.message || 'Server error processing contact query.' };
  }
}
