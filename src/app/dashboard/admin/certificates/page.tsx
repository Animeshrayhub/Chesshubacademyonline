import React from 'react';
import CertificatesRegistry from '@/features/admin/CertificatesRegistry';
import { listCertificates } from '@/lib/certificates';
import { listStudents } from '@/lib/students';

export const dynamic = 'force-dynamic';

export default async function AdminCertificatesPage() {
  const [certsRes, studentsRes] = await Promise.all([
    listCertificates(),
    listStudents(),
  ]);

  const certificates = certsRes.success ? (certsRes.data ?? []) : [];
  const students = studentsRes.success ? (studentsRes.data ?? []) : [];

  return <CertificatesRegistry certificates={certificates} students={students} />;
}
