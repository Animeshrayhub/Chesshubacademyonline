'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import type { PackageId } from '@/constants/PRICING';

interface CashfreeCheckoutButtonProps {
  packageId: PackageId;
  packageName: string;
  amount: number;
  sessions: number;
  className?: string;
  buttonText?: string;
  onSuccess?: () => void;
}

export default function CashfreeCheckoutButton({
  packageId,
  packageName,
  amount,
  sessions,
  className = '',
  buttonText,
  onSuccess,
}: CashfreeCheckoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultText = buttonText || `Enroll in ${packageName}`;

  const handleCheckout = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check current session
      const supabase = createSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        // Preserve package in redirect url
        const targetUrl = `/programs?package=${encodeURIComponent(packageId)}`;
        router.push(`/login?redirectTo=${encodeURIComponent(targetUrl)}`);
        return;
      }

      // Initiate server order creation
      const response = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ packageId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Unable to initiate payment session. Please try again.');
        return;
      }

      // If Cashfree Dropin is available in window
      if (typeof window !== 'undefined' && (window as any).Cashfree) {
        const cashfree = (window as any).Cashfree({
          mode: process.env.NEXT_PUBLIC_CASHFREE_MODE === 'production' ? 'production' : 'sandbox',
        });
        cashfree.checkout({
          paymentSessionId: data.paymentSessionId,
          redirectTarget: '_modal',
        }).then((result: any) => {
          if (result.error) {
            setError(result.error.message || 'Payment was cancelled or failed.');
          }
          if (result.paymentDetails) {
            onSuccess?.();
            router.refresh();
          }
        });
      } else {
        // Fallback: Notify success or redirect to billing/checkout confirmation
        if (data.paymentSessionId) {
          onSuccess?.();
        }
      }
    } catch (err: any) {
      console.error('[CashfreeCheckoutButton] Error:', err);
      setError(err?.message || 'Network error initiating checkout.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        className={
          className ||
          'w-full py-3.5 px-6 rounded-xl font-bold text-center transition-all duration-200 bg-primary hover:bg-primary-dark text-white shadow-md disabled:opacity-50'
        }
      >
        {loading ? 'Initializing Checkout...' : defaultText}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-500 font-semibold text-center" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
