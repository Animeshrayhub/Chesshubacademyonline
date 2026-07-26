import React from 'react';
import AnnouncementsRegistry from '@/features/admin/AnnouncementsRegistry';
import { listAnnouncements } from '@/lib/announcements';

export const dynamic = 'force-dynamic';

export default async function AdminAnnouncementsPage() {
  const result = await listAnnouncements();
  const announcements = result.success ? (result.data ?? []) : [];

  return <AnnouncementsRegistry announcements={announcements} />;
}
