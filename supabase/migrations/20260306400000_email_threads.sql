-- Email threads for two-way AI agent communication
CREATE TABLE IF NOT EXISTS email_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  agent text NOT NULL,
  request_id uuid REFERENCES service_requests(id) ON DELETE SET NULL,
  context jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'awaiting_reply',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_threads_token ON email_threads(token);
CREATE INDEX idx_email_threads_status ON email_threads(status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_email_threads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_threads_updated_at
  BEFORE UPDATE ON email_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_email_threads_updated_at();
