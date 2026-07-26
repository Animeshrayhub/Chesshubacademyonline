import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/class-status/[classId]
 * Returns the current status of a class.
 * Used by the student classroom view to poll for class completion and auto-redirect.
 */
export async function GET(
  _req: Request,
  { params }: { params: { classId: string } }
) {
  try {
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from('classes')
      .select('status')
      .eq('id', params.classId)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ status: 'UNKNOWN' }, { status: 404 });
    }

    return NextResponse.json({ status: data.status });
  } catch {
    return NextResponse.json({ status: 'ERROR' }, { status: 500 });
  }
}
