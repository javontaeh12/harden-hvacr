-- Custom Parts Table
-- Run this in Supabase SQL Editor to create the custom_parts table

CREATE TABLE IF NOT EXISTS public.custom_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.custom_parts ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view custom parts
CREATE POLICY "Anyone can view custom parts"
  ON public.custom_parts
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only admins can insert custom parts
CREATE POLICY "Admins can insert custom parts"
  ON public.custom_parts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'approved'
    )
  );

-- Policy: Only admins can delete custom parts
CREATE POLICY "Admins can delete custom parts"
  ON public.custom_parts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'approved'
    )
  );

-- Create index for faster searching
CREATE INDEX IF NOT EXISTS idx_custom_parts_item ON public.custom_parts(item);
CREATE INDEX IF NOT EXISTS idx_custom_parts_description ON public.custom_parts(description);
