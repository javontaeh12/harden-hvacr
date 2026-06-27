-- Fix RLS recursion: Create SECURITY DEFINER helper functions that bypass RLS
-- This prevents infinite recursion when RLS policies reference the profiles table

CREATE OR REPLACE FUNCTION public.is_approved()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND status = 'approved'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_van_id()
RETURNS uuid AS $$
  SELECT van_id FROM public.profiles
  WHERE id = auth.uid() AND status = 'approved'
$$ LANGUAGE sql SECURITY DEFINER;

-- Fix VANS policies
DROP POLICY IF EXISTS "Admins can update vans" ON public.vans;
DROP POLICY IF EXISTS "Admins can delete vans" ON public.vans;
DROP POLICY IF EXISTS "Admins can create vans" ON public.vans;
CREATE POLICY "Admins can create vans" ON public.vans FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update vans" ON public.vans FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete vans" ON public.vans FOR DELETE USING (public.is_admin());

-- Fix INVENTORY_ITEMS policies
DROP POLICY IF EXISTS "Approved users can view inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Techs can manage own van inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Admins can manage all inventory" ON public.inventory_items;
CREATE POLICY "Approved users can view inventory" ON public.inventory_items FOR SELECT USING (public.is_approved());
CREATE POLICY "Techs can manage own van inventory" ON public.inventory_items FOR ALL USING (public.is_approved() AND van_id = public.get_user_van_id());
CREATE POLICY "Admins can manage all inventory" ON public.inventory_items FOR ALL USING (public.is_admin());

-- Fix ORDERS policies
DROP POLICY IF EXISTS "Approved users can view orders" ON public.orders;
DROP POLICY IF EXISTS "Approved users can create orders" ON public.orders;
CREATE POLICY "Approved users can view orders" ON public.orders FOR SELECT USING (public.is_approved());
CREATE POLICY "Approved users can create orders" ON public.orders FOR INSERT WITH CHECK (public.is_approved());
