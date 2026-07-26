'use server';

import { revalidatePath } from 'next/cache';
import * as certificatesService from '@/lib/certificates';

export async function issueCertificateAction(data: {
  student_id: string;
  title: string;
  file_url?: string;
  issued_at?: string;
}) {
  const result = await certificatesService.issueCertificate(data);
  if (result.success) {
    revalidatePath('/dashboard/admin/certificates');
  }
  return JSON.parse(JSON.stringify(result));
}

export async function deleteCertificateAction(id: string) {
  const result = await certificatesService.deleteCertificate(id);
  if (result.success) {
    revalidatePath('/dashboard/admin/certificates');
  }
  return JSON.parse(JSON.stringify(result));
}
