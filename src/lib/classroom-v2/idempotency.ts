/**
 * Classroom V2 Distributed DB-Backed Idempotency & Concurrency Guard
 * Deduplicates mutations across distributed Vercel serverless nodes and local memory.
 * Gracefully falls back to local memory if database table is missing.
 */

import { createSupabaseAdmin } from '../supabase/admin';

const inMemoryMutationCache = new Map<string, { timestamp: number; result: any }>();
const MUTATION_TTL_MS = 60000; // 1 minute local in-memory cache

/**
 * Checks if a mutation ID was already processed.
 * 1. Checks fast in-memory map.
 * 2. Checks PostgreSQL `classroom_idempotency_keys` table for multi-node serverless execution.
 */
export async function checkProcessedMutation(mutationId?: string): Promise<any | null> {
  if (!mutationId || typeof mutationId !== 'string') return null;

  // 1. Fast local cache check
  const local = inMemoryMutationCache.get(mutationId);
  if (local && Date.now() - local.timestamp < MUTATION_TTL_MS) {
    return local.result;
  }

  // 2. Distributed Database check
  try {
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from('classroom_idempotency_keys')
      .select('result, expires_at')
      .eq('key', mutationId)
      .maybeSingle();

    if (!error && data && new Date(data.expires_at).getTime() > Date.now()) {
      // Warm local cache
      inMemoryMutationCache.set(mutationId, { timestamp: Date.now(), result: data.result });
      return data.result;
    }
  } catch (err) {
    // Graceful fallback to local cache
  }

  return null;
}

/**
 * Records a completed mutation result in both local memory and PostgreSQL.
 */
export async function recordProcessedMutation(
  mutationId: string,
  result: any,
  sessionId?: string,
  actionName = 'classroom_mutation'
): Promise<void> {
  if (!mutationId || typeof mutationId !== 'string') return;

  // 1. Store in local cache
  inMemoryMutationCache.set(mutationId, { timestamp: Date.now(), result });

  // Cleanup old local entries if large
  if (inMemoryMutationCache.size > 2000) {
    const now = Date.now();
    for (const [k, v] of inMemoryMutationCache.entries()) {
      if (now - v.timestamp > MUTATION_TTL_MS) {
        inMemoryMutationCache.delete(k);
      }
    }
  }

  // 2. Persist to PostgreSQL idempotency table (TTL = 5 mins)
  try {
    const admin = createSupabaseAdmin();
    await admin.from('classroom_idempotency_keys').upsert(
      {
        key: mutationId,
        session_id: sessionId || null,
        action_name: actionName,
        result: result ?? {},
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      },
      { onConflict: 'key' }
    );
  } catch (err) {
    // Table missing fallback
  }
}
