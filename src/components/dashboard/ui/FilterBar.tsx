'use client';

import React from 'react';
import TableSearchBar from './TableSearchBar';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterGroup {
  key: string;
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (val: string) => void;
}

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchPlaceholder?: string;
  filters?: FilterGroup[];
  className?: string;
}

export default function FilterBar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  className = '',
}: FilterBarProps) {
  return (
    <div className={`flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between ${className}`}>
      <div className="flex-1 max-w-md">
        <TableSearchBar
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          {filters.map((group) => (
            <div key={group.key} className="flex items-center gap-1.5">
              <label htmlFor={`filter-${group.key}`} className="text-xs font-bold text-text-secondary whitespace-nowrap">
                {group.label}:
              </label>
              <select
                id={`filter-${group.key}`}
                value={group.value}
                onChange={(e) => group.onChange(e.target.value)}
                className="block text-xs font-semibold text-text-primary bg-white border border-border rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer transition-shadow"
              >
                {group.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
