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
    <div className="bg-gradient-to-br from-slate-900 via-primary-dark to-slate-900 rounded-3xl p-6 text-white border border-primary/20 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-accent/20 border border-accent/30 flex items-center justify-center text-2xl">
              🪙
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-accent">
                Coaching Balance
              </span>
              <h3 className="font-heading text-xl font-bold text-white">Your Session Wallet</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/student/settings/billing"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              Billing Settings →
            </Link>
            <button
              type="button"
              onClick={() => setShowPackages(!showPackages)}
              className="text-xs font-bold px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-surface-dark transition-all shadow-gold"
            >
              {showPackages ? 'Hide Packages' : 'Top Up / Buy Sessions'}
            </button>
          </div>
        </div>

        {/* Balance metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <span className="text-xs text-white/60 block mb-1">Available Live Sessions</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-accent">
                {loading ? '...' : balance.totalRemaining}
              </span>
              <span className="text-xs text-white/50">sessions</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <span className="text-xs text-white/60 block mb-1">Total Purchased</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-white">
                {loading ? '...' : balance.totalPurchased}
              </span>
              <span className="text-xs text-white/50">sessions</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 col-span-2 sm:col-span-1">
            <span className="text-xs text-white/60 block mb-1">Active Entitlements</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-white">
                {loading ? '...' : balance.activePackagesCount}
              </span>
              <span className="text-xs text-white/50">package{balance.activePackagesCount === 1 ? '' : 's'}</span>
            </div>
          </div>
        </div>

        {/* Expandable Package Cards */}
        {showPackages && (
          <div className="mt-6 pt-6 border-t border-white/10 animate-fadeIn">
            <h4 className="text-sm font-bold text-white mb-4">Select a Coaching Package to Add Sessions:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {COACHING_PACKAGES_LIST.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`rounded-2xl p-5 flex flex-col justify-between ${
                    pkg.featured
                      ? 'bg-gradient-to-b from-primary/40 to-slate-900 border-2 border-accent'
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-bold text-base text-white">{pkg.name}</h5>
                      {pkg.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent text-surface-dark">
                          {pkg.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-2xl font-extrabold text-white mb-1">
                      ₹{pkg.amount.toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-accent font-semibold mb-4">
                      {pkg.sessions} Live Sessions
                    </p>
                  </div>

                  <CashfreeCheckoutButton
                    packageId={pkg.id}
                    packageName={pkg.name}
                    amount={pkg.amount}
                    sessions={pkg.sessions}
                    className="w-full py-2.5 px-4 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-md transition-all"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
