'use client';

import React, { useState, useEffect } from 'react';
import type { PackageId } from '@/constants/PRICING';
import { getPackageById } from '@/constants/PRICING';

interface PublicCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageId: PackageId;
  currency?: 'INR' | 'USD';
  initialCoupon?: string;
}

interface CouponValidationState {
  code: string;
  valid: boolean;
  discountAmount: number;
  finalAmount: number;
  description?: string;
  error?: string;
}

export default function PublicCheckoutModal({
  isOpen,
  onClose,
  packageId,
  currency = 'INR',
  initialCoupon = '',
}: PublicCheckoutModalProps) {
  const pkg = getPackageById(packageId);

  // Form Fields
  const [payerName, setPayerName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [parentName, setParentName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [policyAccepted, setPolicyAccepted] = useState(true);

  // Coupon state
  const [couponCodeInput, setCouponCodeInput] = useState(initialCoupon);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationState | null>(null);

  // Auth / Checkout state
  const [authenticatedUser, setAuthenticatedUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Check server-side auth state silently via /api/auth/me (never redirect, never loop)
  useEffect(() => {
    let mounted = true;
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (mounted && data.authenticated && data.user) {
            setAuthenticatedUser(data.user);
            // Autofill known identity
            const fullName = `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim();
            if (fullName) {
              setStudentName((prev) => prev || fullName);
              setPayerName((prev) => prev || fullName);
            }
            if (data.user.email) {
              setEmail((prev) => prev || data.user.email);
            }
          }
        }
      } catch (err) {
        // Guest mode fallback
      } finally {
        if (mounted) setLoadingAuth(false);
      }
    }
    checkAuth();
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Validate coupon with server
  const handleApplyCoupon = async (codeToValidate?: string) => {
    const code = (codeToValidate || couponCodeInput).trim().toUpperCase();
    if (!code) {
      setAppliedCoupon(null);
      return;
    }

    setValidatingCoupon(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/payment/coupon/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode: code,
          packageId,
          currency,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.valid) {
        setAppliedCoupon({
          code,
          valid: false,
          discountAmount: 0,
          finalAmount: pkg?.amount || 0,
          error: data.error || 'Invalid or ineligible coupon code',
        });
      } else {
        setAppliedCoupon({
          code: data.coupon.code,
          valid: true,
          discountAmount: data.discountAmount,
          finalAmount: data.finalAmount,
          description: data.coupon.description,
        });
      }
    } catch (e: any) {
      setAppliedCoupon({
        code,
        valid: false,
        discountAmount: 0,
        finalAmount: pkg?.amount || 0,
        error: 'Unable to validate coupon code at this time',
      });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
  };

  // 3. Submit checkout to create Cashfree order
  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!pkg) {
      setErrorMessage('Selected coaching package is invalid.');
      return;
    }

    if (!policyAccepted) {
      setErrorMessage('Please acknowledge the terms and non-refundable coaching policy.');
      return;
    }

    // Phone cleanup: remove non-digits
    const cleanDigits = phone.replace(/\D/g, '');
    if (!authenticatedUser && cleanDigits.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number for order verification.');
      return;
    }

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address for receipt delivery.');
      return;
    }

    if (!studentName.trim()) {
      setErrorMessage("Please enter the student's full name.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        packageId,
        payerName: payerName.trim() || studentName.trim(),
        studentName: studentName.trim(),
        parentName: parentName.trim() || payerName.trim(),
        phone: cleanDigits.length >= 10 ? cleanDigits.slice(-10) : '9876543210',
        email: email.trim().toLowerCase(),
        notes: notes.trim(),
        couponCode: appliedCoupon?.valid ? appliedCoupon.code : undefined,
        policyAccepted: true,
      };

      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Failed to create payment order. Please try again.');
        setSubmitting(false);
        return;
      }

      // Redirect immediately to Cashfree Hosted Checkout
      if (data.hostedCheckoutUrl) {
        window.location.href = data.hostedCheckoutUrl;
        return;
      }

      // Fallback redirection to status page
      window.location.href = `/payment/status?order_id=${data.orderId}`;
    } catch (err: any) {
      console.error('[PublicCheckoutModal] Order error:', err);
      setErrorMessage(err?.message || 'Network error initiating Cashfree payment.');
      setSubmitting(false);
    }
  };

  if (!isOpen || !pkg) return null;

  const originalPrice = pkg.amount;
  const currentFinalPrice = appliedCoupon?.valid ? appliedCoupon.finalAmount : originalPrice;
  const currentDiscount = appliedCoupon?.valid ? appliedCoupon.discountAmount : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8 text-white">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-amber-600/20 via-slate-800/60 to-amber-600/20 border-b border-slate-800 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">♟️</span>
            <div>
              <h2 id="checkout-modal-title" className="text-lg font-extrabold text-white">
                Complete Your Enrollment
              </h2>
              <p className="text-xs text-amber-400 font-medium">
                {pkg.name} — {pkg.sessions} 1-on-1 Live Sessions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close checkout"
          >
            ✕
          </button>
        </div>

        {/* Auth Notice (Friendly and non-blocking) */}
        <div className="px-6 py-3 bg-slate-800/40 border-b border-slate-800/60 text-xs flex items-center justify-between">
          {authenticatedUser ? (
            <div className="flex items-center gap-2 text-emerald-400 font-medium">
              <span>✓ Signed in as <strong>{authenticatedUser.email}</strong></span>
              <span className="text-slate-400 text-[11px]">• Sessions will be credited directly</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-amber-400">⚡</span>
              <span>
                <strong>Guest Checkout:</strong> No sign-in required. Our academy links your order securely after payment.
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleInitiatePayment} className="p-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-start gap-2">
              <span className="text-sm">⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Contact Details Grid */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Student & Contact Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Student&apos;s Full Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav Sharma"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Parent / Guardian Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Sharma"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address (for receipt) <span className="text-amber-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="parent@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  WhatsApp / Phone Number <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-semibold">+91</span>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    disabled={submitting}
                    className="w-full pl-12 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Special Requests or Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Preferred batch timings, current FIDE rating, or child's chess background..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Coupon Code Section */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span>🎟️</span> Have a Coupon Code?
              </span>
              <span className="text-[11px] text-slate-500">e.g. LEGACY6600, CHESS10</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter promo or legacy code"
                value={couponCodeInput}
                onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                disabled={validatingCoupon || submitting || !!appliedCoupon?.valid}
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-white uppercase placeholder-slate-500 focus:outline-none focus:border-amber-500 disabled:opacity-60"
              />
              {appliedCoupon?.valid ? (
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-bold transition-colors"
                >
                  Remove
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleApplyCoupon()}
                  disabled={validatingCoupon || submitting || !couponCodeInput.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition-all shadow-md disabled:opacity-50"
                >
                  {validatingCoupon ? 'Verifying...' : 'Apply'}
                </button>
              )}
            </div>

            {appliedCoupon?.valid && (
              <div className="text-xs text-emerald-400 font-semibold flex items-center justify-between">
                <span>✓ Coupon <strong>{appliedCoupon.code}</strong> applied successfully!</span>
                {appliedCoupon.description && (
                  <span className="text-[11px] text-slate-400 italic">({appliedCoupon.description})</span>
                )}
              </div>
            )}

            {appliedCoupon && !appliedCoupon.valid && appliedCoupon.error && (
              <div className="text-xs text-red-400 font-medium">
                ✕ {appliedCoupon.error}
              </div>
            )}
          </div>

          {/* Pricing Breakdown Card */}
          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2.5">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Coaching Package:</span>
              <span className="font-semibold text-white">{pkg.name} ({pkg.sessions} Live Sessions)</span>
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Package List Price:</span>
              <span className="font-medium text-white">₹{originalPrice.toLocaleString('en-IN')}</span>
            </div>

            {currentDiscount > 0 && (
              <div className="flex justify-between text-xs text-emerald-400 font-bold">
                <span>Coupon Discount ({appliedCoupon?.code}):</span>
                <span>-₹{currentDiscount.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
              <span className="text-sm font-extrabold text-white">Final Amount Payable:</span>
              <div className="text-right">
                <span className="text-2xl font-black text-amber-400">
                  ₹{currentFinalPrice.toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-slate-400 ml-1">INR (all inclusive)</span>
              </div>
            </div>
          </div>

          {/* Policy Acceptance Checkbox */}
          <label className="flex items-start gap-3 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              required
              checked={policyAccepted}
              onChange={(e) => setPolicyAccepted(e.target.checked)}
              className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
            />
            <span>
              I accept the{' '}
              <a href="/terms" target="_blank" className="text-amber-400 hover:underline">
                Terms of Service
              </a>{' '}
              and acknowledge that coaching sessions are non-refundable once scheduled.
            </span>
          </label>

          {/* Submit Action */}
          <div className="space-y-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-base transition-all duration-200 shadow-xl shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="inline-block animate-spin">♟</span>
                  <span>Connecting to Cashfree Secure Gateway...</span>
                </>
              ) : (
                <>
                  <span>Proceed to Pay ₹{currentFinalPrice.toLocaleString('en-IN')}</span>
                  <span className="text-lg">→</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-2">
              <span>🔒 256-bit Encrypted Cashfree Checkout</span>
              <span>•</span>
              <span>UPI, Cards, NetBanking, Wallets</span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
