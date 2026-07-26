import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { getSignedUrl } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    const bucket = searchParams.get('bucket') || 'submissions';

    if (!path) {
      return new NextResponse('Missing path parameter', { status: 400 });
    }

    if (bucket !== 'workbooks' && bucket !== 'submissions' && bucket !== 'certificates') {
      return new NextResponse('Invalid bucket parameter', { status: 400 });
    }

    // Generate temporary signed URL (expires in 1 hour)
    const result = await getSignedUrl(bucket, path, 3600);
    if (!result.success || !result.data) {
      return new NextResponse(result.error?.message || 'Failed to generate link', { status: 500 });
    }

    return NextResponse.redirect(result.data, 307);
  } catch (error: any) {
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
  }
}
