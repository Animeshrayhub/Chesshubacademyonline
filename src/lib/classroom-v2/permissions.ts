import {
  type UserRole,
  type PermissionsState,
  type StudentBoardColorPermission,
} from './types';

/**
 * Parses raw board_controller_id text from the database or cache.
 * Supports legacy "userId", "userId1,userId2", "LOCKED:userId",
 * as well as color-specific "userId:white", "userId:black", "userId:both".
 */
export function parseBoardControllers(rawController: string): {
  isBoardLocked: boolean;
  boardControllers: string[];
  studentPermissions: Record<string, StudentBoardColorPermission>;
} {
  let isBoardLocked = false;
  let remaining = (rawController || '').trim();

  if (remaining.startsWith('LOCKED')) {
    isBoardLocked = true;
    remaining = remaining.replace(/^LOCKED:?/, '').trim();
  }

  const items = remaining ? remaining.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const boardControllers: string[] = [];
  const studentPermissions: Record<string, StudentBoardColorPermission> = {};

  for (const item of items) {
    if (item.includes(':')) {
      const [uid, perm] = item.split(':');
      const trimmedUid = uid.trim();
      const trimmedPerm = perm.trim().toLowerCase();
      if (trimmedUid) {
        if (trimmedPerm === 'white' || trimmedPerm === 'w') {
          boardControllers.push(trimmedUid);
          studentPermissions[trimmedUid] = 'white';
        } else if (trimmedPerm === 'black' || trimmedPerm === 'b') {
          boardControllers.push(trimmedUid);
          studentPermissions[trimmedUid] = 'black';
        } else if (trimmedPerm === 'both') {
          boardControllers.push(trimmedUid);
          studentPermissions[trimmedUid] = 'both';
        } else if (trimmedPerm === 'none') {
          studentPermissions[trimmedUid] = 'none';
        } else {
          boardControllers.push(trimmedUid);
          studentPermissions[trimmedUid] = 'both';
        }
      }
    } else if (item) {
      boardControllers.push(item);
      studentPermissions[item] = 'both';
    }
  }

  return {
    isBoardLocked,
    boardControllers: Array.from(new Set(boardControllers)),
    studentPermissions,
  };
}

/**
 * Serializes lock state and student color permissions into standard board_controller_id format.
 */
export function serializeBoardControllers(
  isLocked: boolean,
  studentPermissions: Record<string, StudentBoardColorPermission>
): string {
  const entries: string[] = [];
  for (const [uid, perm] of Object.entries(studentPermissions)) {
    if (perm && perm !== 'none') {
      entries.push(`${uid}:${perm}`);
    }
  }
  const joined = entries.join(',');
  return isLocked ? (joined ? `LOCKED:${joined}` : 'LOCKED') : joined;
}

/**
 * Resolves the allowed piece color for a given user.
 * Returns 'both' for Coach/Admin, 'none' if locked or unauthorized,
 * or 'white' / 'black' / 'both' for authorized students.
 */
export function getUserAllowedColor(
  userRole: UserRole,
  userId: string,
  permissions: PermissionsState
): StudentBoardColorPermission {
  if (userRole === 'coach' || userRole === 'admin') {
    return 'both';
  }

  if (permissions.isBoardLocked) {
    return 'none';
  }

  if (!Array.isArray(permissions.boardControllers) || !permissions.boardControllers.includes(userId)) {
    return 'none';
  }

  const assignedColor = permissions.studentPermissions?.[userId];
  if (assignedColor) {
    return assignedColor;
  }

  return 'both';
}

/**
 * Checks if a user is permitted to move chess pieces on the canonical board.
 * - Coach & Admin ALWAYS have authority (unless board is strictly frozen for everyone).
 * - Student has permission ONLY IF their userId is included in boardControllers and isBoardLocked is false.
 * - If pieceColor is specified, verifies student is allowed to play that color.
 */
export function canUserMoveBoard(
  userRole: UserRole,
  userId: string,
  permissions: PermissionsState,
  pieceColor?: 'w' | 'b' | 'white' | 'black'
): boolean {
  if (userRole === 'coach' || userRole === 'admin') {
    return true;
  }

  if (permissions.isBoardLocked) {
    return false;
  }

  if (!Array.isArray(permissions.boardControllers) || !permissions.boardControllers.includes(userId)) {
    return false;
  }

  if (pieceColor) {
    const allowed = getUserAllowedColor(userRole, userId, permissions);
    if (allowed === 'none') return false;
    const isWhitePiece = pieceColor === 'w' || pieceColor === 'white';
    const isBlackPiece = pieceColor === 'b' || pieceColor === 'black';

    if (allowed === 'white' && !isWhitePiece) {
      return false;
    }
    if (allowed === 'black' && !isBlackPiece) {
      return false;
    }
  }

  return true;
}

/**
 * Checks if a user has coaching privileges (Load Game, End Class, Manage Permissions, Stockfish Engine).
 */
export function isCoachOrAdmin(userRole: UserRole): boolean {
  return userRole === 'coach' || userRole === 'admin';
}

