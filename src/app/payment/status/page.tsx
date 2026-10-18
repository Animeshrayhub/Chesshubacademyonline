'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Container from '@/components/ui/Container';

interface VerificationResult {
  success: boolean;
  orderId: string;
  orderStatus: string;
  sessionsGranted?: number;
  packageName?: string;
  amount?: number;
  currency?: string;
  error?: string;
}

function PaymentStatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('order_id') || searchParams.get('orderId');

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function verify() {
      try {
        const response = await fetch('/api/payment/verify-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });

        const data = await response.json();
        if (isMounted) {
          setResult(data);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setResult({
            success: false,
            orderId: orderId || 'unknown',
            orderStatus: 'FAILED',
            error: err?.message || 'Failed to verify transaction with payment server.',
          });
          setLoading(false);
        }
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  if (!orderId) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-20 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 border border-amber-200 flex items-center justify-center mx-auto text-2xl font-bold">
            ⚠️
          </div>
          <h2 className="text-xl font-heading font-extrabold text-text-primary">No Order Reference Provided</h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            We could not find an active transaction ID. If you completed a payment, please check your student dashboard or contact academy support.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              href="/dashboard/student"
              className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-md hover:bg-primary-dark transition-all"
            >
              Go to Student Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-20 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-10 border border-slate-200 shadow-xl text-center space-y-6">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <div className="absolute inset-2 rounded-full bg-primary/10 flex items-center justify-center text-xl">
              ♟️
            </div>
          </div>
          <div>
            <h2 className="text-xl font-heading font-extrabold text-text-primary">Verifying Payment</h2>
            <p className="text-xs text-text-secondary mt-1">
              Securing official confirmation from Cashfree Payment Gateway...
            </p>
          </div>
          <p className="font-mono text-[11px] text-slate-400 bg-slate-50 py-1.5 px-3 rounded-lg border border-slate-100 truncate">
            Order Ref: {orderId}
          </p>
        </div>
      </div>
    );
  }

  const isSuccess = result?.success || result?.orderStatus === 'PAID';

  return (
    <div className="min-h-[80vh] py-16 px-4 bg-slate-50 flex items-center justify-center">
      <Container className="max-w-xl">
        <div className="bg-white rounded-3xl border border-border shadow-2xl overflow-hidden">
          {/* Header Banner */}
          <div
            className={`p-8 text-center text-white ${
              isSuccess
                ? 'bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900'
                : 'bg-gradient-to-br from-amber-600 via-rose-700 to-slate-900'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto text-3xl shadow-inner mb-4">
              {isSuccess ? '🏆' : '⏳'}
            </div>
            <h1 className="text-2xl font-heading font-extrabold text-white">
              {isSuccess ? 'Payment Successful!' : 'Payment Pending or Incomplete'}
            </h1>
            <p className="text-xs text-white/80 mt-1 max-w-sm mx-auto">
              {isSuccess
                ? 'Welcome to ChessHub Academy. Your coaching sessions have been credited to your account.'
                : 'Your payment status is being processed by Cashfree or has not yet completed.'}
            </p>
          </div>

          {/* Receipt Body */}
          <div className="p-8 space-y-6">
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-3.5 text-xs">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <span className="text-text-secondary font-medium">Order Status</span>
                <span
                  className={`px-3 py-1 rounded-full font-extrabold uppercase text-[10px] tracking-wider ${
                    isSuccess
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {result?.orderStatus || 'PENDING'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Order Reference</span>
                <span className="font-mono font-bold text-text-primary text-[11px]">{orderId}</span>
              </div>

              {result?.sessionsGranted && (
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Sessions Credited</span>
                  <span className="font-extrabold text-emerald-600 text-sm">
                    +{result.sessionsGranted} Live Coaching Sessions
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Official Receipt</span>
                <span className="text-text-primary font-bold">Dispatched via In-App Feed & Email</span>
              </div>
            </div>

            {isSuccess ? (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-start gap-3">
                <span className="text-lg">✨</span>
                <div className="space-y-1">
                  <p className="font-bold">What happens next?</p>
                  <p className="text-emerald-800/90 leading-relaxed text-[11px]">
                    Your head coach will review your personalized learning plan. You can view your session balance and schedule upcoming classes directly from your student portal.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-2">
                <p className="font-bold">Need help with your payment?</p>
                <p className="leading-relaxed text-[11px]">
                  If your account was debited, your sessions will be automatically synced as soon as Cashfree confirms the webhook. Reach our 24/7 academy support on WhatsApp at <strong>+91 70086 65245</strong>.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              {isSuccess ? (
                <>
                  <Link
                    href="/dashboard/student"
                    className="block w-full py-3.5 px-6 rounded-xl bg-primary hover:bg-primary-dark text-white font-extrabold text-xs text-center shadow-md transition-all"
                  >
                    Go to Student Dashboard →
                  </Link>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 text-text-primary font-bold text-xs text-center transition-colors"
                    >
                      🖨️ Print Receipt
                    </button>
                    <Link
                      href="/programs"
                      className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 text-text-secondary hover:text-text-primary font-semibold text-xs text-center transition-colors"
                    >
                      Back to Programs
                    </Link>
                  </div>
                </>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => router.refresh()}
                    className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-bold text-xs text-center shadow transition-all"
                  >
                    🔄 Re-check Status
                  </button>
                  <a
                    href="https://wa.me/917008665245"
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs text-center transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>💬 WhatsApp Support</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

export default function PaymentStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center py-20 px-4">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto" />
            <p className="text-xs text-text-secondary font-medium">Loading payment verification...</p>
          </div>
        </div>
      }
    >
      <PaymentStatusContent />
    </Suspense>
  );
}
