'use client';

import { useState } from 'react';
import DashboardIcon from './DashboardIcon';

interface TableSearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function TableSearchBar({
  placeholder = 'Search…',
  onSearch,
  className = '',
  value: controlledValue,
  onChange: controlledOnChange,
}: TableSearchBarProps) {
  const [internalValue, setInternalValue] = useState('');
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) setInternalValue(e.target.value);
    onSearch?.(e.target.value);
    controlledOnChange?.(e);
  };

  return (
    <div className={`relative ${className}`}>
      <DashboardIcon
        iconKey="search"
        className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
      />
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label={placeholder}
        className="
          w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-border rounded-xl
          text-text-primary placeholder:text-text-secondary/50
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
          transition-colors duration-150
        "
      />
    </div>
  );
}
