import React from 'react';
import AdminRegistry from '@/features/admin/AdminRegistry';
import { listUsers } from '@/lib/users';

export const dynamic = 'force-dynamic';

export default async function AdminManagementPage() {
  const result = await listUsers({ role: 'ADMIN' });
  const admins = result.success ? (result.data ?? []) : [];

  return <AdminRegistry admins={admins} />;
}
