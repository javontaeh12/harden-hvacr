-- Bouncie GPS tracker integration tables

-- Cached vehicle data from Bouncie API
CREATE TABLE IF NOT EXISTS bouncie_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bouncie_id text UNIQUE NOT NULL,           -- Bouncie's internal vehicle ID (IMEI)
  van_id uuid REFERENCES vans(id) ON DELETE SET NULL, -- Link to our vans table
  vin text,
  year int,
  make text,
  model text,
  nickname text,
  color text,
  license_plate text,
  odometer numeric,                          -- Last known odometer reading
  fuel_level numeric,                        -- 0-100 percentage (if OBD-II reports it)
  battery_voltage numeric,
  last_lat numeric,
  last_lng numeric,
  last_location_at timestamptz,
  status text DEFAULT 'active',              -- active, inactive
  raw_data jsonb DEFAULT '{}',               -- Full API response for reference
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Trip history from Bouncie
CREATE TABLE IF NOT EXISTS bouncie_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bouncie_vehicle_id text NOT NULL,          -- References bouncie_vehicles.bouncie_id
  trip_id text UNIQUE,                       -- Bouncie's trip ID if available
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  start_lat numeric,
  start_lng numeric,
  start_address text,
  end_lat numeric,
  end_lng numeric,
  end_address text,
  distance_miles numeric,                    -- Distance in miles
  duration_minutes numeric,
  idle_minutes numeric,
  max_speed_mph numeric,
  avg_speed_mph numeric,
  fuel_used_gallons numeric,
  mpg numeric,
  hard_brakes int DEFAULT 0,
  rapid_accels int DEFAULT 0,
  raw_data jsonb DEFAULT '{}',
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- DTC (Diagnostic Trouble Codes) from Bouncie
CREATE TABLE IF NOT EXISTS bouncie_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bouncie_vehicle_id text NOT NULL,
  code text NOT NULL,                        -- e.g. P0300
  description text,
  severity text,                             -- info, warning, critical
  detected_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  raw_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Sync log to track last sync per vehicle
CREATE TABLE IF NOT EXISTS bouncie_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bouncie_vehicle_id text NOT NULL,
  sync_type text NOT NULL,                   -- vehicles, trips, diagnostics
  last_synced_at timestamptz DEFAULT now(),
  record_count int DEFAULT 0,
  error text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bouncie_vehicles_van ON bouncie_vehicles(van_id);
CREATE INDEX IF NOT EXISTS idx_bouncie_trips_vehicle ON bouncie_trips(bouncie_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bouncie_trips_time ON bouncie_trips(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_bouncie_diagnostics_vehicle ON bouncie_diagnostics(bouncie_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bouncie_sync_log_vehicle ON bouncie_sync_log(bouncie_vehicle_id, sync_type);

-- RLS
ALTER TABLE bouncie_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bouncie_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE bouncie_diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE bouncie_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on bouncie_vehicles" ON bouncie_vehicles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on bouncie_trips" ON bouncie_trips FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on bouncie_diagnostics" ON bouncie_diagnostics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on bouncie_sync_log" ON bouncie_sync_log FOR ALL USING (true) WITH CHECK (true);
