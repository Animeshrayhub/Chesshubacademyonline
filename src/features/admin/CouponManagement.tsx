'use client';

import React, { useState } from 'react';
import type { CouponCodeRecord, CouponDiscountType } from '@/lib/payment/coupons';
import type { PackageId } from '@/constants/PRICING';

interface CouponManagementProps {
  initialCoupons: CouponCodeRecord[];
}

export default function CouponManagement({ initialCoupons }: CouponManagementProps) {
  const [coupons, setCoupons] = useState<CouponCodeRecord[]>(initialCoupons);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // New Coupon Form State
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<CouponDiscountType>('FIXED_PRICE');
  const [discountValue, setDiscountValue] = useState<number>(6600);
  const [selectedPackages, setSelectedPackages] = useState<PackageId[]>(['starter']);
  const [maxRedemptions, setMaxRedemptions] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Toggle active status
  const handleToggleActive = async (couponCode: string, currentStatus: boolean) => {
    try {
      const nextStatus = !currentStatus;
      const res = await fetch('/api/admin/coupons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, isActive: nextStatus }),
      });

      if (res.ok) {
        setCoupons((prev) =>
          prev.map((c) => (c.code === couponCode ? { ...c, isActive: nextStatus } : c))
        );
      }
    } catch (e) {
      console.error('Failed to toggle coupon', e);
    }
  };

  // Create new coupon
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 3) {
      setFormError('Coupon code must be at least 3 characters.');
      return;
    }

    if (discountValue <= 0) {
      setFormError('Discount value must be greater than zero.');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: cleanCode,
          discountType,
          discountValue: Number(discountValue),
          eligiblePackages: selectedPackages,
          maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
          startDate: startDate || null,
          expiresAt: expiresAt || null,
          description: description.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || 'Failed to create coupon.');
        setCreating(false);
        return;
      }

      setCoupons((prev) => [data.coupon, ...prev.filter((c) => c.code !== cleanCode)]);
      setIsCreateOpen(false);
      // Reset form
      setCode('');
      setDescription('');
      setMaxRedemptions('');
    } catch (err: any) {
      setFormError(err?.message || 'Network error creating coupon.');
    } finally {
      setCreating(false);
    }
  };

  const filtered = coupons.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.code.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);
  });

  const togglePackage = (pkg: PackageId) => {
    if (selectedPackages.includes(pkg)) {
      setSelectedPackages(selectedPackages.filter((p) => p !== pkg));
    } else {
      setSelectedPackages([...selectedPackages, pkg]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header action bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search coupon codes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-border text-xs focus:outline-none focus:border-amber-500 bg-white"
          />
          <span className="absolute left-3 top-3 text-xs text-text-secondary">🔍</span>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-2"
        >
          <span>＋</span>
          <span>Create Coupon Code</span>
        </button>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-border text-text-secondary uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">Coupon Code</th>
                <th className="py-3 px-4">Discount Type & Value</th>
                <th className="py-3 px-4">Eligible Packages</th>
                <th className="py-3 px-4">Redemptions</th>
                <th className="py-3 px-4">Validity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-text-secondary">
                    No coupon codes found.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date();
                  return (
                    <tr key={c.id || c.code} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-xs bg-slate-100 text-slate-900 px-2 py-0.5 rounded border border-slate-200">
                            {c.code}
                          </span>
                          {c.description && (
                            <p className="text-[10px] text-text-secondary truncate max-w-xs">{c.description}</p>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-text-primary">
                        {c.discountType === 'FIXED_PRICE' && (
                          <span className="text-emerald-700 font-extrabold">
                            Fixed Price: ₹{c.discountValue.toLocaleString('en-IN')}
                          </span>
                        )}
                        {c.discountType === 'FIXED_DISCOUNT' && (
                          <span className="text-blue-700 font-extrabold">
                            ₹{c.discountValue.toLocaleString('en-IN')} OFF
                          </span>
                        )}
                        {c.discountType === 'PERCENTAGE' && (
                          <span className="text-purple-700 font-extrabold">{c.discountValue}% OFF</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {c.eligiblePackages && c.eligiblePackages.length > 0 ? (
                            c.eligiblePackages.map((p) => (
                              <span
                                key={p}
                                className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold uppercase"
                              >
                                {p}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-[10px]">All Packages</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <span className="font-bold text-slate-800">{c.timesRedeemed}</span>
                        <span className="text-slate-400">
                          {c.maxRedemptions !== null ? ` / ${c.maxRedemptions}` : ' (unlimited)'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[11px] text-text-secondary">
                        {c.expiresAt ? (
                          <span className={isExpired ? 'text-red-500 font-semibold' : ''}>
                            {new Date(c.expiresAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                            {isExpired && ' (Expired)'}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium">No Expiry</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            !c.isActive || isExpired
                              ? 'bg-slate-100 text-slate-500'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {!c.isActive ? 'Disabled' : isExpired ? 'Expired' : 'Active'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(c.code, c.isActive)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                            c.isActive
                              ? 'bg-slate-100 text-slate-700 hover:bg-red-50 hover:text-red-600'
                              : 'bg-emerald-500 text-white hover:bg-emerald-600'
                          }`}
                        >
                          {c.isActive ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Coupon Modal */}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl border border-border shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in duration-200">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div>
                <h3 className="font-extrabold text-base text-text-primary">Create New Coupon Code</h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Configure promotional or legacy student pricing codes
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                disabled={creating}
                className="text-text-secondary hover:text-text-primary p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Coupon Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LEGACY6600, SUMMER25"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  disabled={creating}
                  className="w-full px-3.5 py-2 rounded-xl border border-border text-xs uppercase font-mono font-bold focus:outline-none focus:border-amber-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => {
                      const dt = e.target.value as CouponDiscountType;
                      setDiscountType(dt);
                      if (dt === 'PERCENTAGE') setDiscountValue(10);
                      else if (dt === 'FIXED_PRICE') setDiscountValue(6600);
                      else setDiscountValue(500);
                    }}
                    disabled={creating}
                    className="w-full px-3.5 py-2 rounded-xl border border-border text-xs focus:outline-none focus:border-amber-500 bg-white"
                  >
                    <option value="FIXED_PRICE">Fixed Package Price (Legacy)</option>
                    <option value="FIXED_DISCOUNT">Fixed Rupee Discount (₹)</option>
                    <option value="PERCENTAGE">Percentage Discount (%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    {discountType === 'FIXED_PRICE'
                      ? 'Final Amount (₹)'
                      : discountType === 'FIXED_DISCOUNT'
                      ? 'Rupees Off (₹)'
                      : 'Percent Off (%)'}{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    disabled={creating}
                    className="w-full px-3.5 py-2 rounded-xl border border-border text-xs font-mono font-bold focus:outline-none focus:border-amber-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">Eligible Packages</label>
                <div className="flex gap-2">
                  {(['starter', 'standard', 'premium'] as PackageId[]).map((pkg) => (
                    <button
                      type="button"
                      key={pkg}
                      onClick={() => togglePackage(pkg)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${
                        selectedPackages.includes(pkg)
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {pkg}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-text-secondary mt-1">
                  Leave empty or select specific packages. (e.g. Starter ₹6,600 only applies to &apos;starter&apos;)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">Max Total Redemptions</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="Leave empty for unlimited"
                    value={maxRedemptions}
                    onChange={(e) => setMaxRedemptions(e.target.value)}
                    disabled={creating}
                    className="w-full px-3.5 py-2 rounded-xl border border-border text-xs focus:outline-none focus:border-amber-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    disabled={creating}
                    className="w-full px-3.5 py-2 rounded-xl border border-border text-xs focus:outline-none focus:border-amber-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">Description / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Grandfathered rate for continuing 2025 cohort students"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={creating}
                  className="w-full px-3.5 py-2 rounded-xl border border-border text-xs focus:outline-none focus:border-amber-500 bg-white"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={creating}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-sm transition-all disabled:opacity-50"
                >
                  {creating ? 'Saving Coupon...' : 'Save Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
