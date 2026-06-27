-- Blocked dates: days when no appointments can be scheduled
CREATE TABLE IF NOT EXISTS blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  reason TEXT,
  group_id UUID NOT NULL REFERENCES organization_groups(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(date, group_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_dates_date ON blocked_dates(date);
CREATE INDEX IF NOT EXISTS idx_blocked_dates_group ON blocked_dates(group_id);

ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read blocked dates"
  ON blocked_dates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role full access to blocked dates"
  ON blocked_dates FOR ALL TO service_role USING (true) WITH CHECK (true);
