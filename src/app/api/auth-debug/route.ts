import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const testEmail = url.searchParams.get('email') || 'royduguu786@gmail.com';
  const testPassword = url.searchParams.get('password') || 'Animesh@1';

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const diag: any = {
    supabaseUrlDomain: supabaseUrl.replace(/^https?:\/\//, '').split('/')[0],
    anonKeyLength: anonKey ? anonKey.length : 0,
    anonKeyPrefix: anonKey ? anonKey.substring(0, 12) + '...' : 'none',
    serviceKeyLength: serviceKey ? serviceKey.length : 0,
    serviceKeyPrefix: serviceKey ? serviceKey.substring(0, 12) + '...' : 'none',
    mockAuth: env.NEXT_PUBLIC_MOCK_AUTH,
  };

  // Test standard client with persistSession: false
  try {
    const client = createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const res = await client.auth.signInWithPassword({
      email: testEmail.toLowerCase().trim(),
      password: testPassword,
    });

    diag.clientAuth = {
      hasUser: !!res.data?.user,
      userId: res.data?.user?.id || null,
      userEmail: res.data?.user?.email || null,
      error: res.error
        ? {
            message: res.error.message,
            status: res.error.status,
            name: res.error.name,
          }
        : null,
    };
  } catch (err: any) {
    diag.clientAuth = {
      exception: err.message,
      stack: err.stack,
    };
  }

  // Test service role client if available
  if (serviceKey) {
    try {
      const adminClient = createClient(supabaseUrl, serviceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      const res = await adminClient.auth.signInWithPassword({
        email: testEmail.toLowerCase().trim(),
        password: testPassword,
      });

      diag.serviceRoleAuth = {
        hasUser: !!res.data?.user,
        userId: res.data?.user?.id || null,
        error: res.error
          ? {
              message: res.error.message,
              status: res.error.status,
            }
          : null,
      };
    } catch (err: any) {
      diag.serviceRoleAuth = { exception: err.message };
    }
  }

  return NextResponse.json(diag);
}
