'use client';

import React, { useState, useEffect } from 'react';

export default function LichessSyncTime({ dateString }: { dateString: string }) {
  const [formatted, setFormatted] = useState('Synced recently');

  useEffect(() => {
    function format() {
      try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) {
          setFormatted('Synced just now');
        } else if (diffMins < 60) {
          setFormatted(`Synced ${diffMins}m ago`);
        } else if (diffHours < 24) {
          setFormatted(`Synced ${diffHours}h ago`);
        } else {
          setFormatted(`Synced ${diffDays}d ago`);
        }
      } catch {
        setFormatted('Synced recently');
      }
    }
    format();
    const interval = setInterval(format, 60000);
    return () => clearInterval(interval);
  }, [dateString]);

  return <span className="text-[10px] text-text-secondary">{formatted}</span>;
}
