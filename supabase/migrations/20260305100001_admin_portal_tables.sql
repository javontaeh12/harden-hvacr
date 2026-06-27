-- Admin Portal Enhancement: CRM, Work Orders, Quotes, Contracts, Reports, Rewards
-- Run this migration in Supabase SQL Editor

-- ============================================
-- PHASE 1: CRM ENHANCEMENT TABLES
-- ============================================

CREATE TABLE public.customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  group_id UUID NOT NULL REFERENCES public.organization_groups(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.customer_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  group_id UUID NOT NULL REFERENCES public.organization_groups(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id, tag)
);

CREATE TABLE public.customer_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  equipment_type TEXT NOT NULL,
  make TEXT,
  model TEXT,
  serial_number TEXT,
  install_date DATE,
  last_service DATE,
  notes TEXT,
  group_id UUID NOT NULL REFERENCES public.organization_groups(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.customer_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('call', 'text', 'email', 'in_person')),
  summary TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  group_id UUID NOT NULL REFERENCES public.organization_groups(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  assigned_to UUID REFERENCES auth.users(id),
  group_id UUID NOT NULL REFERENCES public.organization_groups(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PHASE 1B: WORK ORDERS
-- ============================================

CREATE TABLE public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id),
  customer_id UUID REFERENCES public.customers(id),
  assigned_tech_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'en_route', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  description TEXT,
  notes TEXT,
  parts_used JSONB DEFAULT '[]'::jsonb,
  signature_url TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  group_id UUID NOT NULL REFERENCES public.organization_groups(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.work_order_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PHASE 2: QUOTES & CONTRACTS
-- ============================================

CREATE TABLE public.quote_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  default_items JSONB DEFAULT '[]'::jsonb,
  group_id UUID NOT NULL REFERENCES public.organization_groups(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id),
  template_id UUID REFERENCES public.quote_templates(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired')),
  line_items JSONB DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10,2) DEFAULT 0,
  tax NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  valid_until DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  group_id UUID NOT NULL REFERENCES public.organization_groups(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id),
  type TEXT NOT NULL CHECK (type IN ('maintenance', 'membership', 'service_agreement', 'warranty')),
  title TEXT NOT NULL,
  terms JSONB DEFAULT '{}'::jsonb,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  auto_renew BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'active', 'expired', 'cancelled')),
  total_value NUMERIC(10,2) DEFAULT 0,
  signed_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  group_id UUID NOT NULL REFERENCES public.organization_groups(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PHASE 4: SYSTEM REPORTS
-- ============================================

CREATE TABLE public.system_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID REFERENCES public.work_orders(id),
  customer_id UUID REFERENCES public.customers(id),
  equipment_id UUID REFERENCES public.customer_equipment(id),
  ratings JSONB DEFAULT '{}'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  photos JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  group_id UUID NOT NULL REFERENCES public.organization_groups(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PHASE 5: REWARDS & TECH LEADERBOARD
-- ============================================

CREATE TABLE public.reward_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('earned', 'redeemed', 'adjusted', 'referral', 'review')),
  points INTEGER NOT NULL,
  description TEXT,
  group_id UUID NOT NULL REFERENCES public.organization_groups(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  points_used INTEGER NOT NULL,
  reward_type TEXT NOT NULL,
  description TEXT,
  group_id UUID NOT NULL REFERENCES public.organization_groups(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.tech_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tech_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('job_completed', 'five_star', 'upsell', 'bonus', 'adjusted')),
  points INTEGER NOT NULL,
  description TEXT,
  work_order_id UUID REFERENCES public.work_orders(id),
  group_id UUID NOT NULL REFERENCES public.organization_groups(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.tech_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tech_id UUID NOT NULL REFERENCES auth.users(id),
  badge_type TEXT NOT NULL,
  group_id UUID NOT NULL REFERENCES public.organization_groups(id),
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tech_id, badge_type)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_customer_notes_customer ON public.customer_notes(customer_id);
CREATE INDEX idx_customer_notes_group ON public.customer_notes(group_id);
CREATE INDEX idx_customer_tags_customer ON public.customer_tags(customer_id);
CREATE INDEX idx_customer_tags_group ON public.customer_tags(group_id);
CREATE INDEX idx_customer_equipment_customer ON public.customer_equipment(customer_id);
CREATE INDEX idx_customer_equipment_group ON public.customer_equipment(group_id);
CREATE INDEX idx_customer_comms_customer ON public.customer_communications(customer_id);
CREATE INDEX idx_customer_comms_group ON public.customer_communications(group_id);
CREATE INDEX idx_follow_ups_customer ON public.follow_ups(customer_id);
CREATE INDEX idx_follow_ups_group ON public.follow_ups(group_id);
CREATE INDEX idx_follow_ups_due ON public.follow_ups(due_date);
CREATE INDEX idx_work_orders_customer ON public.work_orders(customer_id);
CREATE INDEX idx_work_orders_tech ON public.work_orders(assigned_tech_id);
CREATE INDEX idx_work_orders_status ON public.work_orders(status);
CREATE INDEX idx_work_orders_group ON public.work_orders(group_id);
CREATE INDEX idx_work_order_photos_wo ON public.work_order_photos(work_order_id);
CREATE INDEX idx_quotes_customer ON public.quotes(customer_id);
CREATE INDEX idx_quotes_status ON public.quotes(status);
CREATE INDEX idx_quotes_group ON public.quotes(group_id);
CREATE INDEX idx_quote_templates_group ON public.quote_templates(group_id);
CREATE INDEX idx_contracts_customer ON public.contracts(customer_id);
CREATE INDEX idx_contracts_status ON public.contracts(status);
CREATE INDEX idx_contracts_group ON public.contracts(group_id);
CREATE INDEX idx_system_reports_customer ON public.system_reports(customer_id);
CREATE INDEX idx_system_reports_group ON public.system_reports(group_id);
CREATE INDEX idx_reward_transactions_customer ON public.reward_transactions(customer_id);
CREATE INDEX idx_reward_transactions_group ON public.reward_transactions(group_id);
CREATE INDEX idx_reward_redemptions_customer ON public.reward_redemptions(customer_id);
CREATE INDEX idx_tech_points_tech ON public.tech_points(tech_id);
CREATE INDEX idx_tech_points_group ON public.tech_points(group_id);
CREATE INDEX idx_tech_badges_tech ON public.tech_badges(tech_id);

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_badges ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES (group-scoped)
-- ============================================

-- Generic pattern: members can SELECT within group, admins can ALL within group

-- Customer Notes
CREATE POLICY "Members can view group customer notes" ON public.customer_notes
  FOR SELECT USING (group_id = public.get_user_group_id());
CREATE POLICY "Members can manage group customer notes" ON public.customer_notes
  FOR ALL USING (public.is_approved() AND group_id = public.get_user_group_id());

-- Customer Tags
CREATE POLICY "Members can view group customer tags" ON public.customer_tags
  FOR SELECT USING (group_id = public.get_user_group_id());
CREATE POLICY "Members can manage group customer tags" ON public.customer_tags
  FOR ALL USING (public.is_approved() AND group_id = public.get_user_group_id());

-- Customer Equipment
CREATE POLICY "Members can view group customer equipment" ON public.customer_equipment
  FOR SELECT USING (group_id = public.get_user_group_id());
CREATE POLICY "Members can manage group customer equipment" ON public.customer_equipment
  FOR ALL USING (public.is_approved() AND group_id = public.get_user_group_id());

-- Customer Communications
CREATE POLICY "Members can view group customer comms" ON public.customer_communications
  FOR SELECT USING (group_id = public.get_user_group_id());
CREATE POLICY "Members can manage group customer comms" ON public.customer_communications
  FOR ALL USING (public.is_approved() AND group_id = public.get_user_group_id());

-- Follow Ups
CREATE POLICY "Members can view group follow ups" ON public.follow_ups
  FOR SELECT USING (group_id = public.get_user_group_id());
CREATE POLICY "Members can manage group follow ups" ON public.follow_ups
  FOR ALL USING (public.is_approved() AND group_id = public.get_user_group_id());

-- Work Orders
CREATE POLICY "Members can view group work orders" ON public.work_orders
  FOR SELECT USING (group_id = public.get_user_group_id());
CREATE POLICY "Members can manage group work orders" ON public.work_orders
  FOR ALL USING (public.is_approved() AND group_id = public.get_user_group_id());

-- Work Order Photos
CREATE POLICY "Members can view work order photos" ON public.work_order_photos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.work_orders wo WHERE wo.id = work_order_id AND wo.group_id = public.get_user_group_id())
  );
CREATE POLICY "Members can manage work order photos" ON public.work_order_photos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.work_orders wo WHERE wo.id = work_order_id AND wo.group_id = public.get_user_group_id())
  );

-- Quote Templates
CREATE POLICY "Members can view group quote templates" ON public.quote_templates
  FOR SELECT USING (group_id = public.get_user_group_id());
CREATE POLICY "Admins can manage group quote templates" ON public.quote_templates
  FOR ALL USING (public.is_admin() AND group_id = public.get_user_group_id());

-- Quotes
CREATE POLICY "Members can view group quotes" ON public.quotes
  FOR SELECT USING (group_id = public.get_user_group_id());
CREATE POLICY "Members can manage group quotes" ON public.quotes
  FOR ALL USING (public.is_approved() AND group_id = public.get_user_group_id());

-- Contracts
CREATE POLICY "Members can view group contracts" ON public.contracts
  FOR SELECT USING (group_id = public.get_user_group_id());
CREATE POLICY "Admins can manage group contracts" ON public.contracts
  FOR ALL USING (public.is_admin() AND group_id = public.get_user_group_id());

-- System Reports
CREATE POLICY "Members can view group system reports" ON public.system_reports
  FOR SELECT USING (group_id = public.get_user_group_id());
CREATE POLICY "Members can manage group system reports" ON public.system_reports
  FOR ALL USING (public.is_approved() AND group_id = public.get_user_group_id());

-- Reward Transactions
CREATE POLICY "Members can view group reward transactions" ON public.reward_transactions
  FOR SELECT USING (group_id = public.get_user_group_id());
CREATE POLICY "Admins can manage group reward transactions" ON public.reward_transactions
  FOR ALL USING (public.is_admin() AND group_id = public.get_user_group_id());

-- Reward Redemptions
CREATE POLICY "Members can view group reward redemptions" ON public.reward_redemptions
  FOR SELECT USING (group_id = public.get_user_group_id());
CREATE POLICY "Admins can manage group reward redemptions" ON public.reward_redemptions
  FOR ALL USING (public.is_admin() AND group_id = public.get_user_group_id());

-- Tech Points
CREATE POLICY "Members can view group tech points" ON public.tech_points
  FOR SELECT USING (group_id = public.get_user_group_id());
CREATE POLICY "Admins can manage group tech points" ON public.tech_points
  FOR ALL USING (public.is_admin() AND group_id = public.get_user_group_id());

-- Tech Badges
CREATE POLICY "Members can view group tech badges" ON public.tech_badges
  FOR SELECT USING (group_id = public.get_user_group_id());
CREATE POLICY "Admins can manage group tech badges" ON public.tech_badges
  FOR ALL USING (public.is_admin() AND group_id = public.get_user_group_id());
