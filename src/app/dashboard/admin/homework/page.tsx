import React from 'react';
import HomeworkRegistry from '@/features/admin/HomeworkRegistry';
import { listHomework } from '@/lib/homework';

export const dynamic = 'force-dynamic';

export default async function AdminHomeworkPage() {
  const result = await listHomework();
  const workbooks = result.success ? (result.data ?? []) : [];

  return <HomeworkRegistry workbooks={workbooks} />;
}
