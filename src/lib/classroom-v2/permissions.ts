/**
 * Classroom V2 Permissions & Authorization Logic
 */

import { type UserRole, type PermissionsState } from './types';

/**
 * Checks if a user is permitted to move chess pieces on the canonical board.
 * - Coach & Admin ALWAYS have authority (unless board is strictly frozen for everyone).
 * - Student has permission ONLY IF their userId is included in boardControllers and isBoardLocked is false.
 */
export function canUserMoveBoard(
  userRole: UserRole,
  userId: string,
  permissions: PermissionsState
): boolean {
  if (userRole === 'coach' || userRole === 'admin') {
    return true;
  }

  if (permissions.isBoardLocked) {
    return false;
  }

  if (Array.isArray(permissions.boardControllers) && permissions.boardControllers.includes(userId)) {
    return true;
  }

  return false;
}

/**
 * Checks if a user has coaching privileges (Load Game, End Class, Manage Permissions, Stockfish Engine).
 */
export function isCoachOrAdmin(userRole: UserRole): boolean {
  return userRole === 'coach' || userRole === 'admin';
}
