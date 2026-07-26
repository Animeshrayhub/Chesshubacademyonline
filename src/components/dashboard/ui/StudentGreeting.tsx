'use client';

import React, { useState, useEffect } from 'react';

export default function StudentGreeting({ name }: { name: string }) {
  const [greeting, setGreeting] = useState('Welcome');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good morning');
    } else if (hour < 17) {
      setGreeting('Good afternoon');
    } else {
      setGreeting('Good evening');
    }
  }, []);

  if (!mounted) {
    return (
      <h1 className="text-2xl font-bold text-text-primary font-heading flex items-center gap-2">
        <span>👋 Welcome, {name}! Ready for chess?</span>
      </h1>
    );
  }

  return (
    <h1 className="text-2xl font-bold text-text-primary font-heading animate-pulse-subtle flex items-center gap-2">
      <span className="animate-bounce">👋</span>
      <span>{greeting}, {name}! Ready for chess?</span>
    </h1>
  );
}
