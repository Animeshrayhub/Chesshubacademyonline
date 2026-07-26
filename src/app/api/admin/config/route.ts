import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabaseServer';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { getSystemConfig, saveSystemConfig } from '@/utils/systemConfig';

/**
 * GET /api/admin/config
 * Retrieves system settings config. Admin only.
 */
export async function GET() {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createSupabaseAdmin();
    
    // Verify admin role
    const { data: profile } = await admin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const configMap = await getSystemConfig();

    return NextResponse.json({
      provider: configMap['AI_PROVIDER'] || 'gemini',
      geminiKey: configMap['AI_GEMINI_KEY'] || '',
      openaiKey: configMap['AI_OPENAI_KEY'] || '',
      groqKey: configMap['AI_GROQ_KEY'] || '',
      apiKey: configMap['AI_API_KEY'] || configMap['AI_GEMINI_KEY'] || '',
    });
  } catch (error) {
    console.error('[/api/admin/config] GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/config
 * Updates system settings config. Admin only.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createSupabaseAdmin();
    
    // Verify admin role
    const { data: profile } = await admin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { provider, geminiKey, openaiKey, groqKey, apiKey } = body;

    const newConfig = {
      AI_PROVIDER: provider || 'gemini',
      AI_GEMINI_KEY: geminiKey || apiKey || '',
      AI_OPENAI_KEY: openaiKey || '',
      AI_GROQ_KEY: groqKey || '',
      AI_API_KEY: (provider === 'openai' ? openaiKey : provider === 'groq' ? groqKey : provider === 'gemini' ? (geminiKey || apiKey) : '') || '',
    };

    await saveSystemConfig(newConfig);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[/api/admin/config] POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
