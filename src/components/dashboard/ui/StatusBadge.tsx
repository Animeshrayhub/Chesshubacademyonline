import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const normStatus = status.toLowerCase();
  let styles = 'bg-gray-50 text-gray-700 border-gray-100';

  if (normStatus === 'active' || normStatus === 'completed' || normStatus === 'enabled') {
    styles = 'bg-green-50 text-green-700 border-green-100';
  } else if (normStatus === 'disabled' || normStatus === 'cancelled' || normStatus === 'rejected') {
    styles = 'bg-red-50 text-red-700 border-red-100';
  } else if (normStatus === 'pending') {
    styles = 'bg-amber-50 text-amber-700 border-amber-100 border-dashed';
  } else if (normStatus === 'assigned') {
    styles = 'bg-blue-50 text-blue-700 border-blue-100';
  } else if (normStatus === 'archived') {
    styles = 'bg-gray-100 text-gray-600 border-gray-200';
  }

  // Capitalize display
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-xl text-xs font-semibold border ${styles} ${className}`}
    >
      {label}
    </span>
  );
}
