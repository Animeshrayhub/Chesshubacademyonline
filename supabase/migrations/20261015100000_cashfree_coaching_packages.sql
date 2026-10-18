-- ============================================================================
-- CHESSHUB ACADEMY: CASHFREE PAYMENT GATEWAY & PREPAID SESSION ENTITLEMENTS
-- Migration: 20261015100000_cashfree_coaching_packages.sql
-- Status: PREPARED FOR REVIEW (DO NOT AUTO-EXECUTE WITHOUT ADMIN APPROVAL)
-- ============================================================================

-- Ensure uuid extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. PAYMENT ORDERS TABLE
-- Tracks payment intent, server-authoritative pricing, and gateway order lifecycle
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  student_profile_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE RESTRICT,
  package_id TEXT NOT NULL CHECK (package_id IN ('starter', 'standard', 'premium')),
  package_name TEXT NOT NULL,
  session_count INTEGER NOT NULL CHECK (session_count IN (12, 24, 48)),
  order_amount INTEGER NOT NULL CHECK (order_amount > 0), -- Stored in integer INR (7200, 13800, 26400)
  order_currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  payment_session_id TEXT,
  order_status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
    CHECK (order_status IN ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED', 'FLAGGED')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user ON public.payment_orders (user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_student ON public.payment_orders (student_profile_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON public.payment_orders (order_status);

-- ============================================================================
-- 2. PAYMENT TRANSACTIONS TABLE
-- Immutable gateway ledger for webhook/API verified payment events
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES public.payment_orders(order_id) ON DELETE RESTRICT,
  cf_payment_id TEXT NOT NULL UNIQUE,
  payment_status VARCHAR(30) NOT NULL,
  payment_amount NUMERIC(10, 2) NOT NULL,
  payment_currency VARCHAR(3) NOT NULL,
  payment_method JSONB,
  bank_reference TEXT,
  payment_time TIMESTAMPTZ,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_order ON public.payment_transactions (order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_cf_payment ON public.payment_transactions (cf_payment_id);

-- ============================================================================
-- 3. STUDENT SESSION ENTITLEMENTS TABLE
-- Prepaid session ledger; order_id is UNIQUE to guarantee EXACTLY-ONCE credit grant
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.student_session_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE RESTRICT,
  order_id TEXT NOT NULL UNIQUE REFERENCES public.payment_orders(order_id) ON DELETE RESTRICT,
  package_id TEXT NOT NULL,
  package_name TEXT NOT NULL,
  sessions_purchased INTEGER NOT NULL CHECK (sessions_purchased > 0),
  sessions_remaining INTEGER NOT NULL CHECK (sessions_remaining >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'DEPLETED', 'EXPIRED', 'CANCELLED')),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_student_entitlements_student ON public.student_session_entitlements (student_id);
CREATE INDEX IF NOT EXISTS idx_student_entitlements_status ON public.student_session_entitlements (status);

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_session_entitlements ENABLE ROW LEVEL SECURITY;

-- Helper to safely check if user is admin regardless of role casing
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND UPPER(role) = 'ADMIN'
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- payment_orders policies
DROP POLICY IF EXISTS "Students read own orders" ON public.payment_orders;
CREATE POLICY "Students read own orders" ON public.payment_orders
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id OR public.is_admin_user()
  );

-- payment_transactions policies
DROP POLICY IF EXISTS "Students read own transactions" ON public.payment_transactions;
CREATE POLICY "Students read own transactions" ON public.payment_transactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.payment_orders
      WHERE order_id = public.payment_transactions.order_id
        AND user_id = auth.uid()
    ) OR public.is_admin_user()
  );

-- student_session_entitlements policies
DROP POLICY IF EXISTS "Students read own entitlements" ON public.student_session_entitlements;
CREATE POLICY "Students read own entitlements" ON public.student_session_entitlements
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_profiles
      WHERE id = public.student_session_entitlements.student_id
        AND user_id = auth.uid()
    ) OR public.is_admin_user()
  );

-- Notice: INSERT/UPDATE/DELETE policies are NOT granted to authenticated users.
-- All state transitions and writes are performed exclusively by trusted server-side code (Service Role).

-- ============================================================================
-- 5. ATOMIC VERIFICATION & ENTITLEMENT GRANT STORED PROCEDURE
-- Handles concurrency, duplicate webhooks, and prevents duplicate session credits
-- ============================================================================
CREATE OR REPLACE FUNCTION public.record_verified_payment_and_grant_entitlement(
  p_order_id TEXT,
  p_cf_payment_id TEXT,
  p_payment_status TEXT,
  p_payment_amount NUMERIC,
  p_payment_currency TEXT,
  p_payment_method JSONB,
  p_bank_reference TEXT,
  p_payment_time TIMESTAMPTZ,
  p_raw_payload JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_entitlement_id UUID;
BEGIN
  -- 1. Pessimistic row lock on the target order
  SELECT * INTO v_order
  FROM public.payment_orders
  WHERE order_id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'ORDER_NOT_FOUND', 'message', 'Order not found');
  END IF;

  -- 2. Validate amount and currency match
  IF p_payment_status = 'SUCCESS' THEN
    IF ROUND(p_payment_amount) <> v_order.order_amount OR UPPER(p_payment_currency) <> UPPER(v_order.order_currency) THEN
      UPDATE public.payment_orders
      SET order_status = 'FLAGGED',
          updated_at = timezone('utc'::text, now()),
          metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{flag_reason}', to_jsonb('Amount/Currency mismatch'::text))
      WHERE order_id = p_order_id;

      RETURN jsonb_build_object(
        'success', false,
        'code', 'AMOUNT_MISMATCH',
        'message', 'Payment amount or currency mismatch with order'
      );
    END IF;

    -- 3. Update order to PAID if not already marked
    UPDATE public.payment_orders
    SET order_status = 'PAID',
        updated_at = timezone('utc'::text, now())
    WHERE order_id = p_order_id;

    -- 4. Record transaction log (idempotent ON CONFLICT)
    INSERT INTO public.payment_transactions (
      order_id,
      cf_payment_id,
      payment_status,
      payment_amount,
      payment_currency,
      payment_method,
      bank_reference,
      payment_time,
      raw_payload
    ) VALUES (
      p_order_id,
      p_cf_payment_id,
      p_payment_status,
      p_payment_amount,
      p_payment_currency,
      p_payment_method,
      p_bank_reference,
      COALESCE(p_payment_time, timezone('utc'::text, now())),
      p_raw_payload
    )
    ON CONFLICT (cf_payment_id) DO UPDATE
    SET payment_status = EXCLUDED.payment_status;

    -- 5. Grant session entitlement exactly once (ON CONFLICT DO NOTHING guarantees single grant)
    INSERT INTO public.student_session_entitlements (
      student_id,
      order_id,
      package_id,
      package_name,
      sessions_purchased,
      sessions_remaining,
      status,
      granted_at,
      updated_at
    ) VALUES (
      v_order.student_profile_id,
      p_order_id,
      v_order.package_id,
      v_order.package_name,
      v_order.session_count,
      v_order.session_count,
      'ACTIVE',
      timezone('utc'::text, now()),
      timezone('utc'::text, now())
    )
    ON CONFLICT (order_id) DO NOTHING
    RETURNING id INTO v_entitlement_id;

    RETURN jsonb_build_object(
      'success', true,
      'code', 'PAYMENT_PROCESSED',
      'order_id', p_order_id,
      'sessions_granted', v_order.session_count,
      'already_granted', (v_entitlement_id IS NULL)
    );

  ELSE
    -- Payment was not successful (e.g. FAILED, USER_DROPPED)
    IF v_order.order_status = 'PENDING' THEN
      UPDATE public.payment_orders
      SET order_status = p_payment_status,
          updated_at = timezone('utc'::text, now())
      WHERE order_id = p_order_id;
    END IF;

    -- Still log the transaction failure attempt
    INSERT INTO public.payment_transactions (
      order_id,
      cf_payment_id,
      payment_status,
      payment_amount,
      payment_currency,
      payment_method,
      bank_reference,
      payment_time,
      raw_payload
    ) VALUES (
      p_order_id,
      p_cf_payment_id,
      p_payment_status,
      p_payment_amount,
      p_payment_currency,
      p_payment_method,
      p_bank_reference,
      COALESCE(p_payment_time, timezone('utc'::text, now())),
      p_raw_payload
    )
    ON CONFLICT (cf_payment_id) DO UPDATE
    SET payment_status = EXCLUDED.payment_status;

    RETURN jsonb_build_object(
      'success', false,
      'code', 'PAYMENT_NOT_SUCCESSFUL',
      'order_id', p_order_id,
      'payment_status', p_payment_status
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
