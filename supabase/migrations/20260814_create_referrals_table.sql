-- Migration: Create referrals table and RLS policies
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  referred_name TEXT NOT NULL,
  referred_email TEXT NOT NULL,
  referred_phone TEXT,
  demo_request_id UUID REFERENCES public.demo_requests(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending_demo' CHECK (status IN ('pending_demo', 'demo_completed', 'enrolled', 'expired')),
  xp_awarded INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  enrolled_at TIMESTAMPTZ
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_student_id ON public.referrals(referrer_student_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referral_code ON public.referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_email ON public.referrals(referred_email);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Students can view their own referral rewards"
  ON public.referrals
  FOR SELECT
  USING (
    referrer_student_id IN (
      SELECT id FROM public.student_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and service roles have full access to referrals"
  ON public.referrals
  FOR ALL
  USING (true);
