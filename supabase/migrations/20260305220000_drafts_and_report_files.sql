-- Work order drafts: stores auto-saved form data across devices
CREATE TABLE IF NOT EXISTS work_order_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  draft_type text NOT NULL CHECK (draft_type IN ('quote', 'payment', 'notes')),
  data jsonb NOT NULL DEFAULT '{}',
  updated_by uuid REFERENCES auth.users(id),
  group_id uuid NOT NULL REFERENCES organization_groups(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(work_order_id, draft_type)
);

-- Service report files: links files permanently to reports and customers
CREATE TABLE IF NOT EXISTS service_report_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_report_id uuid NOT NULL REFERENCES service_reports(id) ON DELETE CASCADE,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  file_type text NOT NULL CHECK (file_type IN ('photo', 'video', 'document', 'signature')),
  file_url text NOT NULL,
  file_name text,
  file_size integer,
  caption text,
  sort_order integer DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id),
  group_id uuid NOT NULL REFERENCES organization_groups(id),
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_drafts_work_order ON work_order_drafts(work_order_id, draft_type);
CREATE INDEX idx_report_files_report ON service_report_files(service_report_id);
CREATE INDEX idx_report_files_customer ON service_report_files(customer_id);
CREATE INDEX idx_report_files_work_order ON service_report_files(work_order_id);

-- Enable RLS
ALTER TABLE work_order_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_report_files ENABLE ROW LEVEL SECURITY;

-- RLS policies (allow all for authenticated — API routes use service role key anyway)
CREATE POLICY "Allow all for authenticated" ON work_order_drafts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON service_report_files FOR ALL TO authenticated USING (true) WITH CHECK (true);
