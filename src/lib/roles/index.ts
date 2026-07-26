import type { UserRole } from '@/types/auth';

export const DB_ROLES = {
  ADMIN: 'ADMIN',
  COACH: 'COACH',
  STUDENT: 'STUDENT',
} as const;

export type DbRole = typeof DB_ROLES[keyof typeof DB_ROLES];

/**
  * Maps DB role to client role
  */
export function mapDbRoleToClientRole(dbRole: string): UserRole {
  const normalized = dbRole.toUpperCase();
  if (normalized === DB_ROLES.ADMIN) return 'admin';
  if (normalized === DB_ROLES.COACH) return 'coach';
  return 'student';
}

/**
  * Maps client role to DB role
  */
export function mapClientRoleToDbRole(clientRole: UserRole): DbRole {
  if (clientRole === 'admin') return DB_ROLES.ADMIN;
  if (clientRole === 'coach') return DB_ROLES.COACH;
  return DB_ROLES.STUDENT;
}

export function isAdmin(role: string): boolean {
  return role.toUpperCase() === DB_ROLES.ADMIN;
}

export function isCoach(role: string): boolean {
  return role.toUpperCase() === DB_ROLES.COACH;
}

export function isStudent(role: string): boolean {
  return role.toUpperCase() === DB_ROLES.STUDENT;
}
