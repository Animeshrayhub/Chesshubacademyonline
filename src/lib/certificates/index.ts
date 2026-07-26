import { createSupabaseAdmin } from '../supabase/admin';
import { assertAdmin } from '../permissions';
import {
  BaseError,
  DatabaseError,
  NotFoundError,
  InternalServerError,
  type Result,
} from '../errors';
import type { AdminCertificateRow, DbCertificate } from '@/types/dashboard';

/**
 * Lists all certificates issued to students.
 */
export async function listCertificates(): Promise<Result<AdminCertificateRow[]>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    const { data: certs, error: certsErr } = await admin
      .from('certificates')
      .select('*')
      .order('created_at', { ascending: false });

    if (certsErr) {
      return { success: false, error: new DatabaseError('Failed to list certificates', certsErr) };
    }

    const certificateList = certs ?? [];
    if (certificateList.length === 0) return { success: true, data: [] };

    const studentIds = [...new Set(certificateList.map((c: any) => c.student_id))];

    const { data: users, error: usersErr } = await admin
      .from('users')
      .select('id, first_name, last_name, email')
      .in('id', studentIds);

    if (usersErr) {
      return { success: false, error: new DatabaseError('Failed to load student details for certificates', usersErr) };
    }

    const userMap = new Map((users ?? []).map((u: any) => [u.id, u]));

    const rows: AdminCertificateRow[] = certificateList.map((c: any) => ({
      ...c,
      student: userMap.get(c.student_id) ?? null,
    }));

    return { success: true, data: rows };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Issues a new certificate to a student.
 */
export async function issueCertificate(data: {
  student_id: string;
  title: string;
  file_url?: string;
  issued_at?: string;
}): Promise<Result<DbCertificate>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    // Verify student exists
    const { data: student } = await admin
      .from('users')
      .select('id')
      .eq('id', data.student_id)
      .eq('role', 'STUDENT')
      .single();

    if (!student) {
      return { success: false, error: new NotFoundError('Student not found') };
    }

    const newCert = {
      student_id: data.student_id,
      title: data.title,
      file_url: data.file_url || null,
      issued_at: data.issued_at || new Date().toISOString().split('T')[0],
    };

    const { data: inserted, error } = await admin
      .from('certificates')
      .insert(newCert)
      .select()
      .single();

    if (error || !inserted) {
      return { success: false, error: new DatabaseError('Failed to issue certificate', error) };
    }

    return { success: true, data: inserted };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Deletes a certificate.
 */
export async function deleteCertificate(id: string): Promise<Result<{ id: string }>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    const { error } = await admin.from('certificates').delete().eq('id', id);

    if (error) {
      return { success: false, error: new DatabaseError('Failed to delete certificate', error) };
    }

    return { success: true, data: { id } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}
