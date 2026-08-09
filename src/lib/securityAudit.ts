import { createSupabaseAdmin } from '@/lib/supabase/admin';

export type SecurityEventType = 
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'SINGLE_SESSION_TERMINATED'
  | 'UNAUTHORIZED_DASHBOARD_ATTEMPT'
  | 'PASSWORD_CHANGED'
  | 'ROLE_SWITCH_ATTEMPT';

export interface SecurityAuditEntry {
  userId?: string;
  userEmail?: string;
  eventType: SecurityEventType;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

export async function recordSecurityAuditEvent(entry: SecurityAuditEntry): Promise<boolean> {
  try {
    const admin = createSupabaseAdmin();
    const { error } = await admin.from('security_audit_logs').insert([{
      user_id: entry.userId || null,
      user_email: entry.userEmail || null,
      event_type: entry.eventType,
      ip_address: entry.ipAddress || 'unknown',
      user_agent: entry.userAgent || 'unknown',
      details: entry.details || {},
      created_at: new Date().toISOString(),
    }]);

    if (error) {
      console.warn('Security audit log record warning (table might be initializing):', error.message);
    }
    return !error;
  } catch (err) {
    console.warn('Failed to record security audit log entry:', err);
    return false;
  }
}
