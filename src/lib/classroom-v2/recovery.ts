/**
 * Classroom V2 Reconnection & Recovery Logic
 */

import { type ClassroomSnapshot } from './types';

export interface RecoveryCheckResult {
  needsReconcile: boolean;
  action: 'apply_event' | 'discard_stale' | 'fetch_snapshot';
}

/**
 * Evaluates whether an incoming event can be applied linearly or if a full snapshot reconcile is required.
 */
export function evaluateEventRecovery(
  localVersion: number,
  eventVersion: number
): RecoveryCheckResult {
  if (eventVersion === localVersion + 1) {
    return { needsReconcile: false, action: 'apply_event' };
  }

  if (eventVersion <= localVersion) {
    return { needsReconcile: false, action: 'discard_stale' };
  }

  // Version gap detected (e.g. local is 5, event is 8) -> Must fetch full canonical snapshot
  return { needsReconcile: true, action: 'fetch_snapshot' };
}
