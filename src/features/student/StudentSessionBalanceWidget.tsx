'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { COACHING_PACKAGES_LIST } from '@/constants/PRICING';
import CashfreeCheckoutButton from '@/components/payment/CashfreeCheckoutButton';

interface BalanceData {
  totalRemaining: number;
  totalPurchased: number;
  activePackagesCount: number;
}

export default function StudentSessionBalanceWidget() {
  const [balance, setBalance] = useState<BalanceData>({
    totalRemaining: 0,
    totalPurchased: 0,
    activePackagesCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showPackages, setShowPackages] = useState(false);

  useEffect(() => {
    async function loadBalance() {
      try {
        const res = await fetch('/api/payment/balance');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setBalance({
              totalRemaining: data.totalRemaining ?? 0,
              totalPurchased: data.totalPurchased ?? 0,
              activePackagesCount: data.activePackagesCount ?? 0,
            });
          }
        }
      } catch (err) {
        console.error('[StudentSessionBalanceWidget] Error fetching balance:', err);
      } finally {
        setLoading(false);
      }
    }

    loadBalance();
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 relative overflow-hidden transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/70 flex items-center justify-center text-xl shrink-0">
            🪙
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
                Session Wallet
              </span>
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">• Live Coaching Credits</span>
            </div>
            <h3 className="font-heading text-base font-bold text-slate-900 mt-0.5">
              Available Coaching Sessions
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/dashboard/student/settings/billing"
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
          >
            Billing &amp; History →
          </Link>
          <button
            type="button"
            onClick={() => setShowPackages(!showPackages)}
            className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-xs"
          >
            {showPackages ? 'Hide Packages' : '⚡ Top Up Sessions'}
          </button>
        </div>
      </div>

      {/* Balance metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-3.5">
          <span className="text-[11px] font-semibold text-emerald-800 block mb-0.5">Available Balance</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-700">
              {loading ? '...' : balance.totalRemaining}
            </span>
            <span className="text-xs text-emerald-600 font-medium">live sessions</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5">
          <span className="text-[11px] font-semibold text-slate-600 block mb-0.5">Total Purchased</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900">
              {loading ? '...' : balance.totalPurchased}
            </span>
            <span className="text-xs text-slate-500 font-medium">total sessions</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-slate-600 block mb-0.5">Active Packages</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900">
              {loading ? '...' : balance.activePackagesCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              active pack{balance.activePackagesCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      {/* Expandable Package Cards */}
      {showPackages && (
        <div className="mt-5 pt-5 border-t border-slate-100 animate-fadeIn">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
            Choose a Coaching Package:
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {COACHING_PACKAGES_LIST.map((pkg) => (
              <div
                key={pkg.id}
                className={`rounded-xl p-4 flex flex-col justify-between border transition-all ${
                  pkg.featured
                    ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-300/50'
                    : 'bg-slate-50/80 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <h5 className="font-bold text-sm text-slate-900">{pkg.name}</h5>
                    {pkg.badge && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                        {pkg.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-lg font-extrabold text-slate-900 mb-0.5">
                    ₹{pkg.amount.toLocaleString('en-IN')}
                  </div>
                  <p className="text-xs text-primary font-bold mb-3">
                    ♟️ {pkg.sessions} Live Sessions
                  </p>
                </div>

                <CashfreeCheckoutButton
                  packageId={pkg.id}
                  packageName={pkg.name}
                  amount={pkg.amount}
                  sessions={pkg.sessions}
                  className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
