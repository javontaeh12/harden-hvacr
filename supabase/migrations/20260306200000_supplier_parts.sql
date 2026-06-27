-- Supplier Parts Store
CREATE TABLE IF NOT EXISTS public.supplier_parts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES organization_groups(id) NOT NULL,
  name text NOT NULL,
  part_number text,
  category text NOT NULL DEFAULT 'Misc',
  supplier_name text DEFAULT 'Johnstone Supply',
  supplier_cost decimal(10,2) DEFAULT 0,
  markup_pct decimal(5,2) DEFAULT 50,
  retail_price decimal(10,2) GENERATED ALWAYS AS (supplier_cost * (1 + markup_pct / 100)) STORED,
  image_url text,
  in_stock boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_parts_group ON supplier_parts(group_id);
CREATE INDEX IF NOT EXISTS idx_supplier_parts_category ON supplier_parts(category);

ALTER TABLE public.supplier_parts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supplier_parts' AND policyname = 'supplier_parts_all') THEN
    CREATE POLICY supplier_parts_all ON public.supplier_parts FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Markup Rules per category
CREATE TABLE IF NOT EXISTS public.supplier_markup_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES organization_groups(id) NOT NULL,
  category text NOT NULL,
  default_markup_pct decimal(5,2) DEFAULT 50,
  created_at timestamptz DEFAULT now(),
  UNIQUE(group_id, category)
);

ALTER TABLE public.supplier_markup_rules ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supplier_markup_rules' AND policyname = 'markup_rules_all') THEN
    CREATE POLICY markup_rules_all ON public.supplier_markup_rules FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
