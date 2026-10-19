-- ============================================================================
-- CHESSHUB ACADEMY: COUPON SYSTEM, LEGACY PRICING & ORDER DISCOUNT COLUMNS
-- Migration: 20261019120000_coupon_system_and_discounts.sql
-- Status: PROPOSED FOR REVIEW (DO NOT EXECUTE WITHOUT EXPLICIT APPROVAL)
-- Target Database: titqwyiiagdxmzkgimpe (Production Supabase)
-- ============================================================================

-- 1. Create Coupon Codes Table
CREATE TABLE IF NOT EXISTS public.coupon_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('FIXED_PRICE', 'FIXED_DISCOUNT', 'PERCENTAGE')),
  discount_value INTEGER NOT NULL CHECK (discount_value > 0),
  eligible_packages TEXT[] NOT NULL DEFAULT '{}'::text[],
  max_redemptions INTEGER CHECK (max_redemptions IS NULL OR max_redemptions > 0),
  times_redeemed INTEGER NOT NULL DEFAULT 0 CHECK (times_redeemed >= 0),
  max_per_customer INTEGER DEFAULT 1 CHECK (max_per_customer IS NULL OR max_per_customer > 0),
  start_date TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Case-insensitive index on coupon code for rapid lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupon_codes_code_upper ON public.coupon_codes (UPPER(code));
CREATE INDEX IF NOT EXISTS idx_coupon_codes_active ON public.coupon_codes (is_active, expires_at);

-- 2. Add Dedicated Discount Columns to payment_orders
ALTER TABLE public.payment_orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE public.payment_orders ADD COLUMN IF NOT EXISTS discount_amount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.payment_orders ADD COLUMN IF NOT EXISTS original_amount INTEGER;

-- 3. Row Level Security for coupon_codes
ALTER TABLE public.coupon_codes ENABLE ROW LEVEL SECURITY;

-- Admins: Full management access
DROP POLICY IF EXISTS "Admins full management of coupons" ON public.coupon_codes;
CREATE POLICY "Admins full management of coupons" ON public.coupon_codes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND UPPER(role) = 'ADMIN'
        AND is_active = true
    )
  );

-- Public & Authenticated: Read active coupons for server validation
DROP POLICY IF EXISTS "Public and students can validate active coupons" ON public.coupon_codes;
CREATE POLICY "Public and students can validate active coupons" ON public.coupon_codes
  FOR SELECT TO public
  USING (
    is_active = true AND (expires_at IS NULL OR expires_at > now())
  );

-- 4. Initial Seed for Admin-Issued Legacy Student Pricing Coupons
-- Allows eligible older students to purchase standard packages at grandfathered rates
INSERT INTO public.coupon_codes (code, discount_type, discount_value, eligible_packages, description, is_active)
VALUES 
  ('LEGACY6600', 'FIXED_PRICE', 6600, ARRAY['starter'], 'Legacy Student Rate: Starter 12 Live Sessions at ₹6,600', true),
  ('LEGACY12000', 'FIXED_PRICE', 12000, ARRAY['standard'], 'Legacy Student Rate: Standard 24 Live Sessions at ₹12,000', true),
  ('LEGACY21600', 'FIXED_PRICE', 21600, ARRAY['premium'], 'Legacy Student Rate: Premium 48 Live Sessions at ₹21,600', true)
ON CONFLICT (code) DO NOTHING;
