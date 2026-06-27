-- Truck management tables for mileage, gas, and maintenance tracking

CREATE TABLE IF NOT EXISTS truck_mileage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  van_id UUID REFERENCES vans(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  start_miles NUMERIC(10,1) NOT NULL,
  end_miles NUMERIC(10,1) NOT NULL,
  total_miles NUMERIC(10,1) GENERATED ALWAYS AS (end_miles - start_miles) STORED,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS truck_gas_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  van_id UUID REFERENCES vans(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  gallons NUMERIC(8,3) NOT NULL,
  price_per_gallon NUMERIC(6,3) NOT NULL,
  total_cost NUMERIC(10,2) GENERATED ALWAYS AS (gallons * price_per_gallon) STORED,
  odometer NUMERIC(10,1),
  station TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS truck_maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  van_id UUID REFERENCES vans(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  cost NUMERIC(10,2),
  vendor TEXT,
  next_due_date DATE,
  next_due_miles NUMERIC(10,1),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mileage_van_date ON truck_mileage_logs(van_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_gas_van_date ON truck_gas_logs(van_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_van_date ON truck_maintenance_logs(van_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_next_due ON truck_maintenance_logs(next_due_date) WHERE next_due_date IS NOT NULL;

-- RLS
ALTER TABLE truck_mileage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE truck_gas_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE truck_maintenance_logs ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON truck_mileage_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON truck_gas_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON truck_maintenance_logs FOR ALL USING (true) WITH CHECK (true);
