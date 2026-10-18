'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Container from '@/components/ui/Container';
import CashfreeCheckoutButton from '@/components/payment/CashfreeCheckoutButton';
import {
  COACHING_PACKAGES_LIST,
  formatPackagePrice,
  getPackagePriceByCurrency,
  type CurrencyCode,
} from '@/constants/PRICING';

export default function ProgramsPricingSection() {
  const searchParams = useSearchParams();
  const urlCurrency = searchParams.get('currency')?.toUpperCase() as CurrencyCode | undefined;

  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [detectedGeo, setDetectedGeo] = useState<string>('Detecting location...');

  useEffect(() => {
    // 1. Honor explicit URL currency if provided
    if (urlCurrency === 'USD' || urlCurrency === 'INR') {
      setCurrency(urlCurrency);
      setDetectedGeo(urlCurrency === 'USD' ? 'Selected: International (USD)' : 'Selected: India (INR)');
      return;
    }

    // 2. Intelligent Geo-detection based on browser timezone and locale
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      const isIndia =
        tz.includes('Calcutta') ||
        tz.includes('Kolkata') ||
        tz.startsWith('Asia/Colombo') ||
        tz === 'IST';

      if (isIndia) {
        setCurrency('INR');
        setDetectedGeo('Auto-detected: India (INR)');
      } else {
        setCurrency('USD');
        setDetectedGeo(`Auto-detected: International (${tz.split('/')[0] || 'Global'})`);
      }
    } catch {
      setCurrency('INR');
      setDetectedGeo('Default: India (INR)');
    }
  }, [urlCurrency]);

  return (
    <section id="packages" className="py-20 bg-slate-950 text-white relative overflow-hidden" aria-label="Coaching packages">
      <div className="absolute inset-0 chess-bg opacity-40 pointer-events-none" aria-hidden="true" />
      <Container className="relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-block mb-3 text-xs font-bold tracking-widest uppercase text-accent bg-accent/10 px-3 py-1 rounded-full border border-accent/20">
            Coaching Packages
          </span>
          <h2 className="font-heading text-4xl lg:text-5xl font-extrabold text-white mb-4">
            Flexible 1-on-1 Coaching <span className="text-gradient-gold">Packages</span>
          </h2>
          <p className="text-white/70 text-base lg:text-lg mb-8">
            Choose the package that fits your child&apos;s goals. All packages include personalized 1-on-1 Grandmaster-led live Zoom classes, interactive analysis, and progress tracking.
          </p>

          {/* Currency Switcher */}
          <div className="inline-flex flex-col items-center gap-2">
            <div className="inline-flex p-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-inner">
              <button
                type="button"
                onClick={() => setCurrency('INR')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 ${
                  currency === 'INR'
                    ? 'bg-amber-500 text-slate-950 shadow-gold scale-100'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🇮🇳</span>
                <span>INR (₹)</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 ${
                  currency === 'USD'
                    ? 'bg-amber-500 text-slate-950 shadow-gold scale-100'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🇺🇸</span>
                <span>USD ($)</span>
              </button>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              📍 {detectedGeo} • Switch currency anytime
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch pt-4">
          {COACHING_PACKAGES_LIST.map((pkg) => {
            const price = getPackagePriceByCurrency(pkg, currency);
            const formattedPrice = formatPackagePrice(pkg, currency);
            const perSession = (price / pkg.sessions).toFixed(currency === 'USD' ? 1 : 0);
            const perSessionFormatted = currency === 'USD' ? `$${perSession}` : `₹${Number(perSession).toLocaleString('en-IN')}`;

            return (
              <div
                key={pkg.id}
                className={`relative rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 ${
                  pkg.featured
                    ? 'bg-gradient-to-b from-primary-dark/90 to-surface-dark border-2 border-accent shadow-2xl scale-105 z-10'
                    : 'bg-white/5 border border-white/10 hover:border-white/20'
                }`}
              >
                {pkg.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold bg-accent text-surface-dark uppercase tracking-wider shadow-md">
                    {pkg.badge}
                  </div>
                )}

                <div>
                  <h3 className="font-heading text-2xl font-bold text-white mb-2">
                    {pkg.name}
                  </h3>
                  <p className="text-white/60 text-xs mb-6 min-h-[36px]">
                    {pkg.description}
                  </p>

                  <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-extrabold text-white tracking-tight">
                        {formattedPrice}
                      </span>
                      <span className="text-white/50 text-xs font-medium">/ package</span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/20 text-accent font-bold">
                        <span>♟️</span>
                        <span>{pkg.sessions} Live Sessions</span>
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {perSessionFormatted} / session
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {pkg.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-white/80">
                        <svg className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <CashfreeCheckoutButton
                    packageId={pkg.id}
                    packageName={pkg.name}
                    amount={price}
                    sessions={pkg.sessions}
                    currency={currency}
                    className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm text-center transition-all duration-200 ${
                      pkg.featured
                        ? 'bg-accent hover:bg-accent-hover text-surface-dark shadow-gold'
                        : 'bg-primary hover:bg-primary-dark text-white'
                    }`}
                  />
                  <p className="text-[10px] text-white/40 text-center mt-3">
                    Instant entitlement activation • 100% Secure Checkout
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
