import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import { getCurrentUser } from '@/lib/supabase/auth';
import { getAllCoupons } from '@/lib/payment/coupons';
import CouponManagement from '@/features/admin/CouponManagement';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Coupon & Discount Codes | Admin Dashboard',
  description: 'Create and manage promotional discount codes and legacy student pricing tiers.',
  robots: { index: false, follow: false },
};

export default async function AdminCouponsPage() {
  // Strict admin role gate
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    redirect('/unauthorized');
  }

  const coupons = await getAllCoupons();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Coupon & Pricing Management"
        subtitle="Manage promotional discount codes and legacy student pricing. Codes are validated securely on the server."
      />

      {/* Legacy Pricing Information Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 text-xs text-amber-900 space-y-2">
        <p className="font-extrabold text-sm flex items-center gap-2">
          <span>🎓</span> Legacy Student Pricing Tiers (Part D)
        </p>
        <p className="text-amber-800 leading-relaxed">
          Standard package prices remain unchanged (Starter ₹7,200, Standard ₹13,800, Premium ₹26,400).
          Admin-issued legacy codes configure fixed final prices for continuing students:
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <span className="px-3 py-1 rounded-xl bg-white border border-amber-200 font-mono text-[11px] font-bold">
            LEGACY6600 → Starter at ₹6,600
          </span>
          <span className="px-3 py-1 rounded-xl bg-white border border-amber-200 font-mono text-[11px] font-bold">
            LEGACY12000 → Standard at ₹12,000
          </span>
          <span className="px-3 py-1 rounded-xl bg-white border border-amber-200 font-mono text-[11px] font-bold">
            LEGACY21600 → Premium at ₹21,600
          </span>
        </div>
      </div>

      <CouponManagement initialCoupons={coupons} />
    </div>
  );
}
