import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getEventById } from '@/lib/events';
import AdminEventDetailClient from './AdminEventDetailClient';

export const dynamic = 'force-dynamic';

interface Props {
  params: { eventId: string };
}

export default async function AdminEventDetailPage({ params }: Props) {
  const result = await getEventById(params.eventId);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <Link
            href="/dashboard/admin/events"
            className="text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1 mb-1"
          >
            ← Back to Events
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">Manage Event</h1>
        </div>
      </div>

      <AdminEventDetailClient event={result.data} />
    </div>
  );
}
