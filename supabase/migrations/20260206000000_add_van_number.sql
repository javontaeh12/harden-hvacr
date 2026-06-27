-- 1. Add van_number column to vans table
ALTER TABLE vans ADD COLUMN IF NOT EXISTS van_number TEXT;

-- Backfill van_number from name for existing rows
UPDATE vans SET van_number = name WHERE van_number IS NULL;

-- Now make it NOT NULL and UNIQUE
ALTER TABLE vans ALTER COLUMN van_number SET NOT NULL;
ALTER TABLE vans ADD CONSTRAINT vans_van_number_key UNIQUE (van_number);

-- 2. Drop the broken category CHECK constraint on inventory_items
-- The constraint only allows 6 values but parts-data.ts has 35+ categories
DO $$
BEGIN
  -- Drop any CHECK constraint on the category column
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints cc
    JOIN information_schema.constraint_column_usage ccu ON cc.constraint_name = ccu.constraint_name
    WHERE ccu.table_name = 'inventory_items' AND ccu.column_name = 'category'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE inventory_items DROP CONSTRAINT ' || cc.constraint_name
      FROM information_schema.check_constraints cc
      JOIN information_schema.constraint_column_usage ccu ON cc.constraint_name = ccu.constraint_name
      WHERE ccu.table_name = 'inventory_items' AND ccu.column_name = 'category'
      LIMIT 1
    );
  END IF;
END $$;

-- 3. Create the missing is_admin() function referenced by RLS policies
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
