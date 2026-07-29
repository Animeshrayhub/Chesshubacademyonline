import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'healthy';
  let dbError: string | null = null;

  try {
    const admin = createSupabaseAdmin();
    const { error } = await admin.from('system_config').select('key').limit(1);
    if (error) {
      dbStatus = 'degraded';
      dbError = error.message;
    }
  } catch (err: any) {
    dbStatus = 'unreachable';
    dbError = err?.message || 'Database connection error';
  }

  const latencyMs = Date.now() - startTime;

  return NextResponse.json({
    status: dbStatus === 'healthy' ? 'ok' : 'degraded',
    service: 'ChessHub Academy API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    latencyMs,
    database: {
      status: dbStatus,
      error: dbError,
    },
  });
}
