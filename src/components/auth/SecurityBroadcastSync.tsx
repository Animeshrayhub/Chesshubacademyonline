'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';

export default function SecurityBroadcastSync() {
  const router = useRouter();

  useEffect(() => {
    // 1. Listen for Supabase Auth state changes across tabs
    const { data: authListener } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'SIGNED_OUT') {
        localStorage.setItem('security_logout_event', Date.now().toString());
        router.push('/login');
      }
    });

    // 2. Listen for Storage events (cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'security_logout_event') {
        router.push('/login');
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [router]);

  return null;
}
