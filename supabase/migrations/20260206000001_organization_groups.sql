-- Organization Groups: Multi-tenant support
-- Run this migration in Supabase SQL Editor

-- ============================================
-- NEW TABLES
-- ============================================

-- Organization groups table
CREATE TABLE public.organization_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  group_code TEXT NOT NULL UNIQUE,
  owner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Group stock parts (replaces hardcoded PARTS_DATABASE per group)
CREATE TABLE public.group_stock_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.organization_groups(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, item)
);

-- ============================================
-- CREATE DEFAULT GROUP & BACKFILL
-- ============================================

-- Create the default organization group for existing data
INSERT INTO public.organization_groups (id, name, group_code, owner_id)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Division 106',
  'DIV106',
  NULL
);

-- ============================================
-- ADD group_id TO EXISTING TABLES
-- ============================================

-- Profiles
ALTER TABLE public.profiles ADD COLUMN group_id UUID REFERENCES public.organization_groups(id);
UPDATE public.profiles SET group_id = '00000000-0000-0000-0000-000000000001' WHERE group_id IS NULL;

-- Vans
ALTER TABLE public.vans ADD COLUMN group_id UUID REFERENCES public.organization_groups(id);
UPDATE public.vans SET group_id = '00000000-0000-0000-0000-000000000001' WHERE group_id IS NULL;
ALTER TABLE public.vans ALTER COLUMN group_id SET NOT NULL;

-- Inventory items
ALTER TABLE public.inventory_items ADD COLUMN group_id UUID REFERENCES public.organization_groups(id);
UPDATE public.inventory_items SET group_id = '00000000-0000-0000-0000-000000000001' WHERE group_id IS NULL;
ALTER TABLE public.inventory_items ALTER COLUMN group_id SET NOT NULL;

-- Orders
ALTER TABLE public.orders ADD COLUMN group_id UUID REFERENCES public.organization_groups(id);
UPDATE public.orders SET group_id = '00000000-0000-0000-0000-000000000001' WHERE group_id IS NULL;
ALTER TABLE public.orders ALTER COLUMN group_id SET NOT NULL;

-- Custom parts
ALTER TABLE public.custom_parts ADD COLUMN group_id UUID REFERENCES public.organization_groups(id);
UPDATE public.custom_parts SET group_id = '00000000-0000-0000-0000-000000000001' WHERE group_id IS NULL;
ALTER TABLE public.custom_parts ALTER COLUMN group_id SET NOT NULL;

-- Document groups (already has group_id column used for a different purpose - rename it)
-- Drop any existing index on group_id before renaming
DROP INDEX IF EXISTS idx_document_groups_group_id;
ALTER TABLE public.document_groups RENAME COLUMN group_id TO doc_group_code;
ALTER TABLE public.document_groups ADD COLUMN group_id UUID REFERENCES public.organization_groups(id);
UPDATE public.document_groups SET group_id = '00000000-0000-0000-0000-000000000001' WHERE group_id IS NULL;
ALTER TABLE public.document_groups ALTER COLUMN group_id SET NOT NULL;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_org_groups_code ON public.organization_groups(group_code);
CREATE INDEX IF NOT EXISTS idx_group_stock_parts_group_id ON public.group_stock_parts(group_id);
CREATE INDEX IF NOT EXISTS idx_profiles_group_id ON public.profiles(group_id);
CREATE INDEX IF NOT EXISTS idx_vans_group_id ON public.vans(group_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_group_id ON public.inventory_items(group_id);
CREATE INDEX IF NOT EXISTS idx_orders_group_id ON public.orders(group_id);
CREATE INDEX IF NOT EXISTS idx_custom_parts_group_id ON public.custom_parts(group_id);
CREATE INDEX IF NOT EXISTS idx_document_groups_org_group_id ON public.document_groups(group_id);

-- ============================================
-- HELPER FUNCTIONS (SECURITY DEFINER)
-- ============================================

-- Get the current user's group_id from their profile
CREATE OR REPLACE FUNCTION public.get_user_group_id()
RETURNS UUID AS $$
  SELECT group_id FROM public.profiles
  WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- ENABLE RLS ON NEW TABLES
-- ============================================

ALTER TABLE public.organization_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_stock_parts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ORGANIZATION_GROUPS POLICIES
-- ============================================

-- Members can read their own group
CREATE POLICY "Members can view own group"
  ON public.organization_groups
  FOR SELECT
  USING (id = public.get_user_group_id());

-- Anyone authenticated can look up a group by code (for onboarding)
CREATE POLICY "Authenticated users can look up groups by code"
  ON public.organization_groups
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Authenticated users can create groups
CREATE POLICY "Authenticated users can create groups"
  ON public.organization_groups
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Owners can update their group
CREATE POLICY "Owners can update own group"
  ON public.organization_groups
  FOR UPDATE
  USING (owner_id = auth.uid());

-- ============================================
-- GROUP_STOCK_PARTS POLICIES
-- ============================================

-- Members can view their group's stock parts
CREATE POLICY "Members can view group stock parts"
  ON public.group_stock_parts
  FOR SELECT
  USING (group_id = public.get_user_group_id());

-- Admins can manage their group's stock parts
CREATE POLICY "Admins can manage group stock parts"
  ON public.group_stock_parts
  FOR ALL
  USING (group_id = public.get_user_group_id() AND public.is_admin());

-- ============================================
-- UPDATE EXISTING TABLE POLICIES
-- Add group_id scoping to all existing policies
-- ============================================

-- PROFILES: Update admin policies to scope by group
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view group profiles"
  ON public.profiles
  FOR SELECT
  USING (
    public.is_admin() AND group_id = public.get_user_group_id()
  );

-- Users with no group can still see their own profile (needed for onboarding)
-- The existing "Users can view own profile" policy handles this

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update group profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    public.is_admin() AND group_id = public.get_user_group_id()
  );

-- VANS: Scope to group
DROP POLICY IF EXISTS "Authenticated users can view vans" ON public.vans;
CREATE POLICY "Members can view group vans"
  ON public.vans
  FOR SELECT
  USING (group_id = public.get_user_group_id());

DROP POLICY IF EXISTS "Admins can create vans" ON public.vans;
CREATE POLICY "Admins can create group vans"
  ON public.vans
  FOR INSERT
  WITH CHECK (public.is_admin() AND group_id = public.get_user_group_id());

DROP POLICY IF EXISTS "Admins can update vans" ON public.vans;
CREATE POLICY "Admins can update group vans"
  ON public.vans
  FOR UPDATE
  USING (public.is_admin() AND group_id = public.get_user_group_id());

DROP POLICY IF EXISTS "Admins can delete vans" ON public.vans;
CREATE POLICY "Admins can delete group vans"
  ON public.vans
  FOR DELETE
  USING (public.is_admin() AND group_id = public.get_user_group_id());

-- INVENTORY ITEMS: Scope to group
DROP POLICY IF EXISTS "Approved users can view inventory" ON public.inventory_items;
CREATE POLICY "Members can view group inventory"
  ON public.inventory_items
  FOR SELECT
  USING (public.is_approved() AND group_id = public.get_user_group_id());

DROP POLICY IF EXISTS "Techs can manage own van inventory" ON public.inventory_items;
CREATE POLICY "Techs can manage own van inventory"
  ON public.inventory_items
  FOR ALL
  USING (
    public.is_approved()
    AND group_id = public.get_user_group_id()
    AND van_id = public.get_user_van_id()
  );

DROP POLICY IF EXISTS "Admins can manage all inventory" ON public.inventory_items;
CREATE POLICY "Admins can manage group inventory"
  ON public.inventory_items
  FOR ALL
  USING (public.is_admin() AND group_id = public.get_user_group_id());

-- ORDERS: Scope to group
DROP POLICY IF EXISTS "Approved users can view orders" ON public.orders;
CREATE POLICY "Members can view group orders"
  ON public.orders
  FOR SELECT
  USING (public.is_approved() AND group_id = public.get_user_group_id());

DROP POLICY IF EXISTS "Approved users can create orders" ON public.orders;
CREATE POLICY "Members can create group orders"
  ON public.orders
  FOR INSERT
  WITH CHECK (public.is_approved() AND group_id = public.get_user_group_id());

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update group orders"
  ON public.orders
  FOR UPDATE
  USING (public.is_admin() AND group_id = public.get_user_group_id());

-- CUSTOM PARTS: Add group scoping (if policies exist, drop them first)
DO $$
BEGIN
  -- Try to drop existing policies, ignore if they don't exist
  DROP POLICY IF EXISTS "Approved users can view custom parts" ON public.custom_parts;
  DROP POLICY IF EXISTS "Admins can manage custom parts" ON public.custom_parts;
  DROP POLICY IF EXISTS "Approved users can manage custom parts" ON public.custom_parts;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Members can view group custom parts"
  ON public.custom_parts
  FOR SELECT
  USING (public.is_approved() AND group_id = public.get_user_group_id());

CREATE POLICY "Admins can manage group custom parts"
  ON public.custom_parts
  FOR ALL
  USING (public.is_admin() AND group_id = public.get_user_group_id());

-- DOCUMENT GROUPS: Add group scoping
DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can view document groups" ON public.document_groups;
  DROP POLICY IF EXISTS "Admins can manage document groups" ON public.document_groups;
  DROP POLICY IF EXISTS "Approved users can view document groups" ON public.document_groups;
  DROP POLICY IF EXISTS "Approved users can manage document groups" ON public.document_groups;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Members can view group document groups"
  ON public.document_groups
  FOR SELECT
  USING (public.is_approved() AND group_id = public.get_user_group_id());

CREATE POLICY "Members can manage group document groups"
  ON public.document_groups
  FOR ALL
  USING (public.is_approved() AND group_id = public.get_user_group_id());
