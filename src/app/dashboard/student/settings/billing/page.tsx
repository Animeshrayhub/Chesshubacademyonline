import React from 'react';
import type { Metadata } from 'next';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import { COACHING_PACKAGES_LIST } from '@/constants/PRICING';
import CashfreeCheckoutButton from '@/components/payment/CashfreeCheckoutButton';
import StudentSessionBalanceWidget from '@/features/student/StudentSessionBalanceWidget';

export const metadata: Metadata = {
  title: 'Billing & Session Packages | Student Portal',
  description: 'Manage coaching packages, session balances, and invoices.',
};

export default function StudentBillingPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Billing & Live Coaching Packages"
        subtitle="Review remaining live session balance, add class entitlements, and view payment records."
      />

      {/* Session Wallet Overview */}
      <section aria-label="Your session balance">
        <StudentSessionBalanceWidget />
      </section>

      {/* Available Coaching Packages */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-heading font-bold text-text-primary">
            Available Coaching Packages
          </h2>
          <p className="text-xs text-text-secondary">
            Instantly purchase additional 1-on-1 Grandmaster coaching sessions. Credits never expire during active enrollment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COACHING_PACKAGES_LIST.map((pkg) => (
            <div
              key={pkg.id}
              className={`rounded-3xl p-6 bg-white border flex flex-col justify-between transition-all duration-200 ${
                pkg.featured
                  ? 'border-accent shadow-xl ring-2 ring-accent/20'
                  : 'border-border shadow-card hover:shadow-lg'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-heading font-bold text-lg text-text-primary">
                    {pkg.name}
                  </h3>
                  {pkg.badge && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-accent/20 text-accent-hover uppercase tracking-wider">
                      {pkg.badge}
                    </span>
                  )}
                </div>

                <p className="text-xs text-text-secondary mb-4 leading-relaxed min-h-[36px]">
                  {pkg.description}
                </p>

                <div className="p-4 rounded-2xl bg-surface-light border border-border/60 mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-primary-dark">
                      ₹{pkg.amount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-text-secondary">/ package</span>
                  </div>
                  <div className="mt-2 text-xs font-bold text-primary flex items-center gap-1">
                    <span>♟️</span>
                    <span>{pkg.sessions} Live Sessions</span>
                  </div>
                </div>

                <ul className="space-y-2.5 mb-6 text-xs text-text-secondary">
                  {pkg.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-accent font-bold">✓</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2">
                <CashfreeCheckoutButton
                  packageId={pkg.id}
                  packageName={pkg.name}
                  amount={pkg.amount}
                  sessions={pkg.sessions}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs text-center transition-all ${
                    pkg.featured
                      ? 'bg-accent hover:bg-accent-hover text-surface-dark shadow-gold'
                      : 'bg-primary hover:bg-primary-dark text-white'
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Policy & Terms Note */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-text-secondary">
        <h4 className="font-bold text-text-primary mb-1">Payment & Policy Information</h4>
        <p className="leading-relaxed">
          ChessHub Academy sessions are strictly non-refundable once scheduled with an instructor. All transactions are securely processed via Cashfree Payment Gateway with 256-bit SSL encryption.
        </p>
      </div>
    </div>
  );
}
