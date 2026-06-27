-- Service Reports table
CREATE TABLE IF NOT EXISTS service_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  equipment_id uuid REFERENCES customer_equipment(id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  group_id uuid NOT NULL REFERENCES organization_groups(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',
  equipment_info jsonb DEFAULT '{}',
  warranty_info jsonb DEFAULT '{}',
  problem_found text,
  problem_details jsonb DEFAULT '{}',
  system_impact text,
  impact_details jsonb DEFAULT '{}',
  repair_options jsonb DEFAULT '[]',
  upgrades jsonb DEFAULT '[]',
  tech_notes text,
  customer_name text,
  customer_address text,
  service_date date DEFAULT CURRENT_DATE,
  report_url text,
  share_token text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Service Report Media table
CREATE TABLE IF NOT EXISTS service_report_media (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  service_report_id uuid NOT NULL REFERENCES service_reports(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'photo',
  url text NOT NULL,
  caption text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_reports_group_id ON service_reports(group_id);
CREATE INDEX IF NOT EXISTS idx_service_reports_share_token ON service_reports(share_token);
CREATE INDEX IF NOT EXISTS idx_service_reports_customer_id ON service_reports(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_reports_status ON service_reports(status);
CREATE INDEX IF NOT EXISTS idx_service_report_media_report_id ON service_report_media(service_report_id);

-- Enable RLS
ALTER TABLE service_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_report_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_reports
CREATE POLICY "Users can view own group reports"
  ON service_reports FOR SELECT
  USING (
    group_id IN (SELECT group_id FROM profiles WHERE id = auth.uid())
    OR share_token IS NOT NULL
  );

CREATE POLICY "Users can insert own group reports"
  ON service_reports FOR INSERT
  WITH CHECK (group_id IN (SELECT group_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own group reports"
  ON service_reports FOR UPDATE
  USING (group_id IN (SELECT group_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own group reports"
  ON service_reports FOR DELETE
  USING (group_id IN (SELECT group_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for service_report_media
CREATE POLICY "Users can manage own group report media"
  ON service_report_media FOR ALL
  USING (
    service_report_id IN (
      SELECT id FROM service_reports
      WHERE group_id IN (SELECT group_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Public can view shared report media"
  ON service_report_media FOR SELECT
  USING (
    service_report_id IN (
      SELECT id FROM service_reports WHERE share_token IS NOT NULL
    )
  );

-- Storage bucket for service report media
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-reports', 'service-reports', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for service-reports bucket
CREATE POLICY "Authenticated users can upload service report files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'service-reports');

CREATE POLICY "Anyone can view service report files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'service-reports');

CREATE POLICY "Authenticated users can delete service report files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'service-reports');
