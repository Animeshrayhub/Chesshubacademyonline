import fs from 'fs';
import path from 'path';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

const CONFIG_FILE = path.join(process.cwd(), 'system_config.json');

const DEFAULT_CONFIG: Record<string, string> = {
  AI_PROVIDER: 'gemini',
  AI_GEMINI_KEY: '',
  AI_OPENAI_KEY: '',
  AI_GROQ_KEY: '',
  AI_API_KEY: '',
  LOCAL_AI_URL: 'http://localhost:11434',
  LOCAL_AI_MODEL: 'llava',
  PREFERRED_SCANNER_PROVIDER: 'gemini',
  MAINTENANCE_MODE: 'false',
};

export async function getSystemConfig(): Promise<Record<string, string>> {
  const configMap = { ...DEFAULT_CONFIG };

  // 1. Load from local file first
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      Object.assign(configMap, data);
    } catch (e) {
      console.error('Error reading system_config.json:', e);
    }
  }

  // 2. Try to read from Supabase
  try {
    const admin = createSupabaseAdmin();
    const { data: configs, error } = await admin
      .from('system_config')
      .select('key, value')
      .in('key', ['AI_PROVIDER', 'AI_GEMINI_KEY', 'AI_OPENAI_KEY', 'AI_GROQ_KEY', 'AI_API_KEY', 'LOCAL_AI_URL', 'LOCAL_AI_MODEL', 'PREFERRED_SCANNER_PROVIDER', 'MAINTENANCE_MODE']);

    if (!error && configs && configs.length > 0) {
      configs.forEach((item: any) => {
        configMap[item.key] = item.value;
      });
    }
  } catch (err) {
    // Ignore DB schema mismatch issues
  }

  // Fallback to environment variables
  if (!configMap.AI_GEMINI_KEY && process.env.GEMINI_API_KEY) {
    configMap.AI_GEMINI_KEY = process.env.GEMINI_API_KEY;
  }
  if (!configMap.AI_API_KEY && configMap.AI_GEMINI_KEY) {
    configMap.AI_API_KEY = configMap.AI_GEMINI_KEY;
  }

  return configMap;
}

export async function saveSystemConfig(newConfig: Record<string, string>): Promise<{ success: boolean; error?: string }> {
  // 1. Save to local JSON file
  try {
    const current = fs.existsSync(CONFIG_FILE)
      ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
      : {};
    const updated = { ...current, ...newConfig };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf8');
  } catch (e: any) {
    console.error('Error writing system_config.json:', e);
  }

  // 2. Save to Supabase
  try {
    const admin = createSupabaseAdmin();
    const itemsToUpsert = Object.entries(newConfig).map(([key, value]) => ({
      key,
      value,
      updated_at: new Date().toISOString(),
    }));

    await admin
      .from('system_config')
      .upsert(itemsToUpsert, { onConflict: 'key' });
  } catch (err: any) {
    console.warn('Supabase query failed, saved exclusively to system_config.json:', err.message);
  }

  return { success: true };
}
