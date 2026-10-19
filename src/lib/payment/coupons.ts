import { createSupabaseAdmin } from '@/lib/supabase/admin';
import type { PackageId } from '@/constants/PRICING';

export type CouponDiscountType = 'FIXED_PRICE' | 'FIXED_DISCOUNT' | 'PERCENTAGE';

export interface CouponCodeRecord {
  id: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  eligiblePackages: PackageId[];
  maxRedemptions: number | null;
  timesRedeemed: number;
  maxPerCustomer: number | null;
  startDate: string | null;
  expiresAt: string | null;
  isActive: boolean;
  description?: string;
  createdAt?: string;
}

/**
 * Built-in default coupons — including Part D official legacy pricing coupons.
 * Ensures the system operates reliably even before the new database migration is executed.
 */
export const DEFAULT_LEGACY_COUPONS: CouponCodeRecord[] = [
  {
    id: 'legacy-starter-6600',
    code: 'LEGACY6600',
    discountType: 'FIXED_PRICE',
    discountValue: 6600,
    eligiblePackages: ['starter'],
    maxRedemptions: null,
    timesRedeemed: 0,
    maxPerCustomer: null,
    startDate: null,
    expiresAt: null,
    isActive: true,
    description: 'Legacy Student Rate: Starter 12 Live Sessions at ₹6,600 (Save ₹600)',
  },
  {
    id: 'legacy-standard-12000',
    code: 'LEGACY12000',
    discountType: 'FIXED_PRICE',
    discountValue: 12000,
    eligiblePackages: ['standard'],
    maxRedemptions: null,
    timesRedeemed: 0,
    maxPerCustomer: null,
    startDate: null,
    expiresAt: null,
    isActive: true,
    description: 'Legacy Student Rate: Standard 24 Live Sessions at ₹12,000 (Save ₹1,800)',
  },
  {
    id: 'legacy-premium-21600',
    code: 'LEGACY21600',
    discountType: 'FIXED_PRICE',
    discountValue: 21600,
    eligiblePackages: ['premium'],
    maxRedemptions: null,
    timesRedeemed: 0,
    maxPerCustomer: null,
    startDate: null,
    expiresAt: null,
    isActive: true,
    description: 'Legacy Student Rate: Premium 48 Live Sessions at ₹21,600 (Save ₹4,800)',
  },
  {
    id: 'chess-welcome-10',
    code: 'CHESS10',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    eligiblePackages: ['starter', 'standard', 'premium'],
    maxRedemptions: 500,
    timesRedeemed: 14,
    maxPerCustomer: 1,
    startDate: null,
    expiresAt: null,
    isActive: true,
    description: 'Welcome promotion: 10% discount on all coaching packages',
  },
];

// In-memory runtime cache for admin additions when table is not yet migrated
const memoryCouponStore = new Map<string, CouponCodeRecord>();
DEFAULT_LEGACY_COUPONS.forEach((c) => memoryCouponStore.set(c.code.toUpperCase(), { ...c }));

/**
 * Fetch all coupons from Supabase table or resilient fallback store.
 */
export async function getAllCoupons(): Promise<CouponCodeRecord[]> {
  try {
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from('coupon_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        code: d.code,
        discountType: d.discount_type,
        discountValue: Number(d.discount_value),
        eligiblePackages: (d.eligible_packages || []) as PackageId[],
        maxRedemptions: d.max_redemptions ? Number(d.max_redemptions) : null,
        timesRedeemed: Number(d.times_redeemed) || 0,
        maxPerCustomer: d.max_per_customer ? Number(d.max_per_customer) : null,
        startDate: d.start_date,
        expiresAt: d.expires_at,
        isActive: Boolean(d.is_active),
        description: d.description,
        createdAt: d.created_at,
      }));
    }
  } catch (err) {
    // Table not created yet; fallback gracefully
  }

  return Array.from(memoryCouponStore.values());
}

/**
 * Find coupon by code (case-insensitive).
 */
export async function getCouponByCode(code: string): Promise<CouponCodeRecord | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;

  try {
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from('coupon_codes')
      .select('*')
      .ilike('code', normalized)
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        code: data.code,
        discountType: data.discount_type,
        discountValue: Number(data.discount_value),
        eligiblePackages: (data.eligible_packages || []) as PackageId[],
        maxRedemptions: data.max_redemptions ? Number(data.max_redemptions) : null,
        timesRedeemed: Number(data.times_redeemed) || 0,
        maxPerCustomer: data.max_per_customer ? Number(data.max_per_customer) : null,
        startDate: data.start_date,
        expiresAt: data.expires_at,
        isActive: Boolean(data.is_active),
        description: data.description,
        createdAt: data.created_at,
      };
    }
  } catch (e) {
    // Ignore and fallback
  }

  return memoryCouponStore.get(normalized) || null;
}

export interface CouponValidationResult {
  valid: boolean;
  coupon?: CouponCodeRecord;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  error?: string;
}

/**
 * Strict server-side coupon validation and amount calculation.
 * Never trust prices or discounts supplied by the browser.
 */
export async function validateCoupon(
  code: string,
  packageId: PackageId,
  originalAmount: number
): Promise<CouponValidationResult> {
  const normalized = code.trim().toUpperCase();

  if (!normalized) {
    return {
      valid: false,
      originalAmount,
      discountAmount: 0,
      finalAmount: originalAmount,
      error: 'Please enter a coupon code',
    };
  }

  const coupon = await getCouponByCode(normalized);

  if (!coupon) {
    return {
      valid: false,
      originalAmount,
      discountAmount: 0,
      finalAmount: originalAmount,
      error: `Coupon "${normalized}" is invalid or does not exist`,
    };
  }

  // 1. Active check
  if (!coupon.isActive) {
    return {
      valid: false,
      originalAmount,
      discountAmount: 0,
      finalAmount: originalAmount,
      error: 'This coupon is no longer active',
    };
  }

  // 2. Date checks
  const now = new Date();
  if (coupon.startDate && new Date(coupon.startDate) > now) {
    return {
      valid: false,
      originalAmount,
      discountAmount: 0,
      finalAmount: originalAmount,
      error: 'This coupon has not started yet',
    };
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
    return {
      valid: false,
      originalAmount,
      discountAmount: 0,
      finalAmount: originalAmount,
      error: 'This coupon has expired',
    };
  }

  // 3. Max redemptions check
  if (coupon.maxRedemptions !== null && coupon.timesRedeemed >= coupon.maxRedemptions) {
    return {
      valid: false,
      originalAmount,
      discountAmount: 0,
      finalAmount: originalAmount,
      error: 'This coupon has reached its maximum usage limit',
    };
  }

  // 4. Eligible package check
  if (coupon.eligiblePackages.length > 0 && !coupon.eligiblePackages.includes(packageId)) {
    return {
      valid: false,
      originalAmount,
      discountAmount: 0,
      finalAmount: originalAmount,
      error: `This coupon is not valid for the selected package (eligible: ${coupon.eligiblePackages.join(', ')})`,
    };
  }

  // 5. Calculate discount and final amount strictly
  let discountAmount = 0;
  let finalAmount = originalAmount;

  if (coupon.discountType === 'FIXED_PRICE') {
    // Sets exact final package price (e.g. Starter at ₹6,600, Standard at ₹12,000, Premium at ₹21,600)
    finalAmount = Math.max(1, Math.round(coupon.discountValue));
    discountAmount = Math.max(0, originalAmount - finalAmount);
  } else if (coupon.discountType === 'FIXED_DISCOUNT') {
    discountAmount = Math.min(originalAmount, Math.round(coupon.discountValue));
    finalAmount = Math.max(0, originalAmount - discountAmount);
  } else if (coupon.discountType === 'PERCENTAGE') {
    const pct = Math.min(100, Math.max(0, coupon.discountValue));
    discountAmount = Math.round((originalAmount * pct) / 100);
    finalAmount = Math.max(0, originalAmount - discountAmount);
  }

  return {
    valid: true,
    coupon,
    originalAmount,
    discountAmount,
    finalAmount,
  };
}

/**
 * Admin action: create a new coupon code.
 */
export async function createAdminCoupon(params: {
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  eligiblePackages: PackageId[];
  maxRedemptions?: number | null;
  startDate?: string | null;
  expiresAt?: string | null;
  description?: string;
  createdBy?: string;
}): Promise<{ success: boolean; coupon?: CouponCodeRecord; error?: string }> {
  const code = params.code.trim().toUpperCase();
  if (!code || code.length < 3) {
    return { success: false, error: 'Coupon code must be at least 3 characters' };
  }

  if (params.discountValue <= 0) {
    return { success: false, error: 'Discount value must be greater than zero' };
  }

  const newCoupon: CouponCodeRecord = {
    id: `coupon_${Date.now()}`,
    code,
    discountType: params.discountType,
    discountValue: Math.round(params.discountValue),
    eligiblePackages: params.eligiblePackages || [],
    maxRedemptions: params.maxRedemptions ?? null,
    timesRedeemed: 0,
    maxPerCustomer: 1,
    startDate: params.startDate || null,
    expiresAt: params.expiresAt || null,
    isActive: true,
    description: params.description || '',
    createdAt: new Date().toISOString(),
  };

  // Try DB persistence
  try {
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from('coupon_codes')
      .insert({
        code: newCoupon.code,
        discount_type: newCoupon.discountType,
        discount_value: newCoupon.discountValue,
        eligible_packages: newCoupon.eligiblePackages,
        max_redemptions: newCoupon.maxRedemptions,
        start_date: newCoupon.startDate,
        expires_at: newCoupon.expiresAt,
        is_active: true,
        description: newCoupon.description,
        created_by: params.createdBy || null,
      })
      .select()
      .single();

    if (!error && data) {
      newCoupon.id = data.id;
    }
  } catch (e) {
    // Continue to store in memory
  }

  memoryCouponStore.set(code, newCoupon);
  return { success: true, coupon: newCoupon };
}

/**
 * Admin action: toggle coupon active status.
 */
export async function toggleCouponActive(code: string, isActive: boolean): Promise<boolean> {
  const normalized = code.trim().toUpperCase();
  const existing = memoryCouponStore.get(normalized);
  if (existing) {
    existing.isActive = isActive;
  }

  try {
    const admin = createSupabaseAdmin();
    await admin
      .from('coupon_codes')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .ilike('code', normalized);
    return true;
  } catch {
    return !!existing;
  }
}

/**
 * Record coupon usage upon verified order completion.
 */
export async function recordCouponRedemption(code: string): Promise<void> {
  const normalized = code.trim().toUpperCase();
  const existing = memoryCouponStore.get(normalized);
  if (existing) {
    existing.timesRedeemed += 1;
  }

  try {
    const admin = createSupabaseAdmin();
    const { data } = await admin
      .from('coupon_codes')
      .select('times_redeemed')
      .ilike('code', normalized)
      .maybeSingle();

    if (data) {
      await admin
        .from('coupon_codes')
        .update({
          times_redeemed: (data.times_redeemed || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .ilike('code', normalized);
    }
  } catch {
    // Graceful fallback
  }
}
