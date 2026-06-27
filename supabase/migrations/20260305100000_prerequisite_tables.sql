-- Prerequisite tables that the code references but were not in tracked migrations
-- These tables: customers, bookings, payments, referrals, customer_rewards

-- ============================================
-- CUSTOMERS
-- ============================================

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  email TEXT,
  full_name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  referral_code TEXT,
  group_id UUID NOT NULL REFERENCES public.organization_groups(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group customers" ON public.customers
  FOR SELECT USING (group_id = public.get_user_group_id());
CREATE POLICY "Members can manage group customers" ON public.customers
  FOR ALL USING (public.is_approved() AND group_id = public.get_user_group_id());

CREATE INDEX IF NOT EXISTS idx_customers_group ON public.customers(group_id);

-- ============================================
-- BOOKINGS
-- ============================================

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id),
  name TEXT NOT NULL,
  contact TEXT,
  service_type TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  notes TEXT,
  google_event_id TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no-show')),
  group_id UUID NOT NULL REFERENCES public.organization_groups(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group bookings" ON public.bookings
  FOR SELECT USING (group_id = public.get_user_group_id());
CREATE POLICY "Members can manage group bookings" ON public.bookings
  FOR ALL USING (public.is_approved() AND group_id = public.get_user_group_id());

CREATE INDEX IF NOT EXISTS idx_bookings_group ON public.bookings(group_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings(customer_id);

-- ============================================
-- PAYMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id),
  customer_id UUID REFERENCES public.customers(id),
  amount NUMERIC(10,2) NOT NULL,
  method TEXT NOT NULL DEFAULT 'cash' CHECK (method IN ('square', 'cash', 'check')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'refunded')),
  notes TEXT,
  group_id UUID NOT NULL REFERENCES public.organization_groups(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group payments" ON public.payments
  FOR SELECT USING (group_id = public.get_user_group_id());
CREATE POLICY "Members can manage group payments" ON public.payments
  FOR ALL USING (public.is_approved() AND group_id = public.get_user_group_id());

CREATE INDEX IF NOT EXISTS idx_payments_group ON public.payments(group_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON public.payments(customer_id);

-- ============================================
-- REFERRALS
-- ============================================

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES public.customers(id),
  referred_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'converted')),
  group_id UUID NOT NULL REFERENCES public.organization_groups(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group referrals" ON public.referrals
  FOR SELECT USING (group_id = public.get_user_group_id());
CREATE POLICY "Members can manage group referrals" ON public.referrals
  FOR ALL USING (public.is_approved() AND group_id = public.get_user_group_id());

CREATE INDEX IF NOT EXISTS idx_referrals_group ON public.referrals(group_id);

-- ============================================
-- CUSTOMER REWARDS
-- ============================================

CREATE TABLE IF NOT EXISTS public.customer_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0,
  lifetime_earned INTEGER DEFAULT 0,
  group_id UUID REFERENCES public.organization_groups(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id)
);

ALTER TABLE public.customer_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group customer rewards" ON public.customer_rewards
  FOR SELECT USING (true);
CREATE POLICY "Members can manage group customer rewards" ON public.customer_rewards
  FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_customer_rewards_customer ON public.customer_rewards(customer_id);
