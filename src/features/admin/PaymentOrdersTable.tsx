'use client';

import React, { useState } from 'react';
import type { AdminPaymentOrderRow } from '@/lib/reports';
import type { AdminStudentRow } from '@/types/dashboard';

interface PaymentOrdersTableProps {
  initialOrders: AdminPaymentOrderRow[];
  activeStudents: AdminStudentRow[];
}

const STATUS_STYLES: Record<string, string> = {
  PAID:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  PENDING:   'bg-amber-50  text-amber-700  border-amber-200',
  FAILED:    'bg-red-50    text-red-700    border-red-200',
  EXPIRED:   'bg-slate-50  text-slate-600  border-slate-200',
  CANCELLED: 'bg-slate-50  text-slate-600  border-slate-200',
  FLAGGED:   'bg-orange-50 text-orange-700 border-orange-200',
};

export default function PaymentOrdersTable({ initialOrders, activeStudents }: PaymentOrdersTableProps) {
  const [orders, setOrders] = useState<AdminPaymentOrderRow[]>(initialOrders);
  const [filterType, setFilterType] = useState<'ALL' | 'UNASSIGNED_GUEST' | 'PAID' | 'PENDING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State for Guest Assignment
  const [selectedOrder, setSelectedOrder] = useState<AdminPaymentOrderRow | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

  const handleOpenAssignModal = (order: AdminPaymentOrderRow) => {
    setSelectedOrder(order);
    setSelectedStudentId('');
    setAssignmentNotes(`Guest enrollment for ${order.studentName} (${order.studentEmail})`);
    setAssignError(null);
    setAssignSuccess(null);
  };

  const handleAssignOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !selectedStudentId) {
      setAssignError('Please select a student to link this payment to.');
      return;
    }

    setAssigning(true);
    setAssignError(null);
    setAssignSuccess(null);

    try {
      const res = await fetch('/api/admin/payments/assign-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.orderId,
          targetUserId: selectedStudentId,
          notes: assignmentNotes,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setAssignError(data.error || 'Failed to assign order.');
        setAssigning(false);
        return;
      }

      setAssignSuccess(data.message || 'Payment successfully linked and sessions granted!');

      // Update local state
      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === selectedOrder.orderId
            ? { ...o, isGuest: false, userId: selectedStudentId }
            : o
        )
      );

      setTimeout(() => {
        setSelectedOrder(null);
      }, 1500);
    } catch (err: any) {
      setAssignError(err?.message || 'Network error while assigning order.');
    } finally {
      setAssigning(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    // Type filter
    if (filterType === 'UNASSIGNED_GUEST') {
      if (!(o.isGuest && o.orderStatus === 'PAID')) return false;
    } else if (filterType === 'PAID') {
      if (o.orderStatus !== 'PAID') return false;
    } else if (filterType === 'PENDING') {
      if (o.orderStatus !== 'PENDING') return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = o.studentName.toLowerCase().includes(q);
      const matchEmail = o.studentEmail.toLowerCase().includes(q);
      const matchOrder = o.orderId.toLowerCase().includes(q);
      const matchPhone = (o.customerPhone || '').toLowerCase().includes(q);
      return matchName || matchEmail || matchOrder || matchPhone;
    }

    return true;
  });

  const unassignedPaidCount = orders.filter((o) => o.isGuest && o.orderStatus === 'PAID').length;

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filterType === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            All Orders ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('UNASSIGNED_GUEST')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              filterType === 'UNASSIGNED_GUEST'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <span>⚡ Unassigned Guests</span>
            {unassignedPaidCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[10px]">
                {unassignedPaidCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setFilterType('PAID')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filterType === 'PAID'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Paid ({orders.filter((o) => o.orderStatus === 'PAID').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('PENDING')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filterType === 'PENDING'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Pending
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search by name, email, phone, order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-72 px-3.5 py-2 pl-9 rounded-xl border border-border text-xs focus:outline-none focus:border-amber-500 bg-white"
          />
          <span className="absolute left-3 top-2.5 text-xs text-text-secondary">🔍</span>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-border text-text-secondary uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">Student / Payer</th>
                <th className="py-3 px-4">Order ID & Date</th>
                <th className="py-3 px-4">Package</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status & Type</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-text-secondary">
                    <p className="font-semibold">No payment orders match this filter.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <p className="font-bold text-text-primary text-xs">{o.studentName}</p>
                        <p className="text-[11px] text-text-secondary">{o.studentEmail}</p>
                        {o.customerPhone && (
                          <p className="text-[10px] text-slate-400 font-mono">📱 {o.customerPhone}</p>
                        )}
                        {o.parentName && o.parentName !== o.studentName && (
                          <p className="text-[10px] text-slate-500">Parent: {o.parentName}</p>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <p className="font-mono text-[11px] text-slate-700">{o.orderId}</p>
                        <p className="text-[10px] text-text-secondary">
                          {o.createdAt
                            ? new Date(o.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </p>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-text-primary text-xs">{o.packageName}</p>
                        <p className="text-[10px] text-amber-700 font-medium">♟️ {o.sessionCount} Live Sessions</p>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-extrabold text-xs text-text-primary">
                        {o.currency === 'USD' ? '$' : '₹'}
                        {o.amount.toLocaleString('en-IN')}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                            STATUS_STYLES[o.orderStatus] ?? STATUS_STYLES.PENDING
                          }`}
                        >
                          {o.orderStatus}
                        </span>

                        {o.isGuest ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-bold">
                            <span>⚡ Guest</span>
                            {o.orderStatus === 'PAID' && <span className="text-red-600 font-black">• Unassigned</span>}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-semibold">
                            ✓ Linked Student
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {o.isGuest && o.orderStatus === 'PAID' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenAssignModal(o)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px] shadow-sm transition-all"
                        >
                          Link to Student →
                        </button>
                      ) : o.orderStatus === 'PAID' ? (
                        <span className="text-[10px] text-emerald-600 font-bold">Active Entitlement</span>
                      ) : (
                        <span className="text-[10px] text-text-secondary">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guest Order Assignment Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl border border-border shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in duration-200">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div>
                <h3 className="font-extrabold text-base text-text-primary">
                  Link Guest Payment to Student Account
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Order ID: <strong className="font-mono">{selectedOrder.orderId}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                disabled={assigning}
                className="text-text-secondary hover:text-text-primary p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {assignError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold">
                ⚠️ {assignError}
              </div>
            )}

            {assignSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold">
                ✓ {assignSuccess}
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1 text-xs">
              <p className="font-bold text-amber-900">
                Package: {selectedOrder.packageName} ({selectedOrder.sessionCount} Sessions)
              </p>
              <p className="text-amber-800">
                Amount Paid: <strong>₹{selectedOrder.amount.toLocaleString('en-IN')}</strong>
              </p>
              <p className="text-slate-600">
                Customer: {selectedOrder.studentName} ({selectedOrder.studentEmail})
                {selectedOrder.customerPhone ? ` • ${selectedOrder.customerPhone}` : ''}
              </p>
            </div>

            <form onSubmit={handleAssignOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-primary mb-1.5">
                  Select Registered Student <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  disabled={assigning}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs focus:outline-none focus:border-amber-500 bg-white font-medium"
                >
                  <option value="">-- Choose active student --</option>
                  {activeStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.first_name || ''} {s.last_name || ''} ({s.email})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-text-secondary mt-1">
                  Linking this payment will automatically grant {selectedOrder.sessionCount} sessions to the chosen student account.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1.5">
                  Internal Assignment Notes
                </label>
                <textarea
                  rows={2}
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  disabled={assigning}
                  className="w-full px-3.5 py-2 rounded-xl border border-border text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  disabled={assigning}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning || !selectedStudentId}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-sm transition-all disabled:opacity-50"
                >
                  {assigning ? 'Granting Sessions...' : 'Confirm & Grant Sessions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
