-- Store Bouncie OAuth tokens for auto-refresh
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to app_settings"
  ON app_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
