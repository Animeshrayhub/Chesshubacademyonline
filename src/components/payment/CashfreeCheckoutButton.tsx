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
  currency?: 'INR' | 'USD';
  className?: string;
  buttonText?: string;
  onSuccess?: () => void;
}

export default function CashfreeCheckoutButton({
  packageId,
  packageName,
  amount,
  sessions,
  currency = 'INR',
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
        const targetUrl = `/programs?package=${encodeURIComponent(packageId)}&currency=${currency}`;
        router.push(`/login?redirectTo=${encodeURIComponent(targetUrl)}`);
        return;
      }

      // Initiate server order creation
      const response = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ packageId, currency }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Unable to initiate payment session. Please try again.');
        return;
      }

      // Seamless redirect to Cashfree Hosted Checkout page
      if (data.hostedCheckoutUrl) {
        window.location.href = data.hostedCheckoutUrl;
        return;
      }

      // Fallback to JS SDK modal if URL not returned
      if (typeof window !== 'undefined' && (window as any).Cashfree && data.paymentSessionId) {
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
            router.push(`/payment/status?order_id=${data.orderId}`);
          }
        });
      } else {
        router.push(`/payment/status?order_id=${data.orderId}`);
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
