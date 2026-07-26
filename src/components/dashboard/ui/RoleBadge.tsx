import React from 'react';
import type { UserRole } from '@/types/dashboard';

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
}

export default function RoleBadge({ role, className = '' }: RoleBadgeProps) {
  let styles = 'bg-blue-50 text-blue-700 border-blue-100';
  if (role === 'COACH') {
    styles = 'bg-purple-50 text-purple-700 border-purple-100';
  } else if (role === 'STUDENT') {
    styles = 'bg-green-50 text-green-700 border-green-100';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${styles} ${className}`}
    >
      {role}
    </span>
  );
}
