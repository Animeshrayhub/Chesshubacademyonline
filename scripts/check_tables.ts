import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://titqwyiiagdxmzkgimpe.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const tables = [
  'classes',
  'live_sessions',
  'live_session_participants',
  'live_session_board_state',
  'classroom_chat',
  'classroom_responses',
  'quiz_answers',
  'classroom_bookmarks',
  'classroom_timeline_events',
  'classroom_idempotency_keys',
  'classroom_audit_logs',
  'homework_puzzles',
  'curriculum_programs'
];

async function check() {
  for (const t of tables) {
    const res = await admin.from(t).select('*').limit(1);
    if (res.error) {
      console.log(`${t}: ❌ MISSING (${res.error.message})`);
    } else {
      const cols = res.data && res.data.length > 0 ? Object.keys(res.data[0]).join(', ') : 'TABLE EMPTY';
      console.log(`${t}: ✅ EXISTS (cols: ${cols})`);
    }
  }
}

check().catch(console.error);
