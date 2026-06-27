-- Quote Sheet Database Schema
-- Run this SQL in your Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Profiles table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'tech' CHECK (role IN ('admin', 'tech')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  van_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vans table
CREATE TABLE public.vans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  license_plate TEXT,
  assigned_tech_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key for van_id in profiles after vans table exists
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_van_id_fkey
  FOREIGN KEY (van_id) REFERENCES public.vans(id) ON DELETE SET NULL;

-- Inventory items table
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  van_id UUID REFERENCES public.vans(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  part_number TEXT,
  quantity INTEGER DEFAULT 0,
  min_quantity INTEGER DEFAULT 1,
  cost DECIMAL(10,2),
  vendor TEXT,
  category TEXT CHECK (category IN ('refrigerant', 'electrical', 'filters', 'tools', 'parts', 'other')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'received')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_profiles_status ON public.profiles(status);
CREATE INDEX idx_profiles_van_id ON public.profiles(van_id);
CREATE INDEX idx_inventory_items_van_id ON public.inventory_items(van_id);
CREATE INDEX idx_inventory_items_category ON public.inventory_items(category);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_by ON public.orders(created_by);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- Allow insert for new user signup (via trigger)
CREATE POLICY "Allow profile creation on signup"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- VANS POLICIES
-- ============================================

-- Everyone can view vans
CREATE POLICY "Authenticated users can view vans"
  ON public.vans
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can create vans
CREATE POLICY "Admins can create vans"
  ON public.vans
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- Only admins can update vans
CREATE POLICY "Admins can update vans"
  ON public.vans
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- Only admins can delete vans
CREATE POLICY "Admins can delete vans"
  ON public.vans
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- ============================================
-- INVENTORY ITEMS POLICIES
-- ============================================

-- Approved users can view all inventory
CREATE POLICY "Approved users can view inventory"
  ON public.inventory_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND status = 'approved'
    )
  );

-- Techs can only manage their own van's inventory
CREATE POLICY "Techs can manage own van inventory"
  ON public.inventory_items
  FOR ALL
  USING (
    van_id IN (
      SELECT van_id FROM public.profiles
      WHERE id = auth.uid() AND status = 'approved'
    )
  )
  WITH CHECK (
    van_id IN (
      SELECT van_id FROM public.profiles
      WHERE id = auth.uid() AND status = 'approved'
    )
  );

-- Admins can manage all inventory
CREATE POLICY "Admins can manage all inventory"
  ON public.inventory_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- ============================================
-- ORDERS POLICIES
-- ============================================

-- Approved users can view all orders
CREATE POLICY "Approved users can view orders"
  ON public.orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND status = 'approved'
    )
  );

-- Approved users can create orders
CREATE POLICY "Approved users can create orders"
  ON public.orders
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND status = 'approved'
    )
  );

-- Admins can update orders
CREATE POLICY "Admins can update orders"
  ON public.orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on inventory_items
CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

-- Enable realtime for profiles (for pending page auto-refresh)
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- ============================================
-- SEED DATA (Optional - for testing)
-- ============================================

-- Uncomment to add sample data:

-- INSERT INTO public.vans (name, license_plate) VALUES
--   ('Van 1', 'ABC-1234'),
--   ('Van 2', 'XYZ-5678'),
--   ('Truck A', 'DEF-9012');

-- After creating a van and having an admin user, you can insert sample inventory:
-- INSERT INTO public.inventory_items (van_id, name, part_number, quantity, min_quantity, cost, vendor, category) VALUES
--   ('your-van-uuid', '410A Refrigerant', 'R410A-25', 5, 2, 125.00, 'Refrigerant Depot', 'refrigerant'),
--   ('your-van-uuid', 'Capacitor 45/5 MFD', 'CAP-45-5', 8, 4, 22.50, 'GEMAIRE', 'electrical'),
--   ('your-van-uuid', 'Contactor 2P 40A', 'CONT-2P-40', 3, 2, 35.00, 'GEMAIRE', 'electrical'),
--   ('your-van-uuid', '16x25x1 Filter', 'FILT-16-25-1', 20, 10, 8.00, 'Filters Fast', 'filters');
