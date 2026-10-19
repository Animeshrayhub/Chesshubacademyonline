import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import { getCurrentUser } from '@/lib/supabase/auth';
import { getAdminPaymentRows } from '@/lib/reports';
import { listStudents } from '@/lib/students';
import PaymentOrdersTable from '@/features/admin/PaymentOrdersTable';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Payment Management | Admin Dashboard',
  description: 'View and manage student payments, guest orders, and session entitlements.',
  robots: { index: false, follow: false },
};

export default async function AdminPaymentsPage() {
  // Server-side role guard
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    redirect('/unauthorized');
  }

  const [orders, studentsRes] = await Promise.all([
    getAdminPaymentRows(200),
    listStudents(),
  ]);

  const activeStudents = studentsRes.success ? (studentsRes.data ?? []) : [];

  // Aggregate totals
  const totalRevenue = orders
    .filter((o) => o.orderStatus === 'PAID')
    .reduce((sum, o) => sum + o.amount, 0);
  const paidCount = orders.filter((o) => o.orderStatus === 'PAID').length;
  const pendingCount = orders.filter((o) => o.orderStatus === 'PENDING').length;
  const unassignedGuestCount = orders.filter((o) => o.isGuest && o.orderStatus === 'PAID').length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Payment & Order Management"
        subtitle="Live payment transactions from Cashfree gateway. Securely manage entitlements and link guest checkouts."
      />

      {/* KPI summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-border shadow-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">Total Revenue (Paid)</p>
          <p className="text-2xl font-extrabold text-emerald-600">₹{totalRevenue.toLocaleString('en-IN')}</p>
        </div>
        <div className="rounded-2xl bg-white border border-border shadow-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">Paid Orders</p>
          <p className="text-2xl font-extrabold text-primary-dark">{paidCount}</p>
        </div>
        <div className="rounded-2xl bg-white border border-border shadow-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">Unassigned Guests</p>
          <p className="text-2xl font-extrabold text-amber-600">{unassignedGuestCount}</p>
        </div>
        <div className="rounded-2xl bg-white border border-border shadow-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">Pending Orders</p>
          <p className="text-2xl font-extrabold text-slate-600">{pendingCount}</p>
        </div>
      </div>

      {/* NO REFUNDS notice */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-semibold flex items-center justify-between">
        <div>
          ⚠️ <strong>Strict No-Refund Policy:</strong> Coaching sessions are non-refundable once scheduled.
          Guest orders remain held as unassigned until linked to a student account below.
        </div>
        <a
          href="/dashboard/admin/coupons"
          className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-sm transition-colors whitespace-nowrap"
        >
          Manage Coupons →
        </a>
      </div>

      {/* Interactive Orders Management Table */}
      <PaymentOrdersTable initialOrders={orders} activeStudents={activeStudents} />
    </div>
  );
}
