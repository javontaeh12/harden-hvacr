-- Migration: Create call_sessions table for AI CSR
-- Run against existing HardenHVACR Supabase project

CREATE TABLE IF NOT EXISTS call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vapi_call_id TEXT UNIQUE,
  caller_phone TEXT,
  customer_id UUID REFERENCES customers(id),
  transcript TEXT,
  intent TEXT,
  confidence NUMERIC(3,2),
  service_type TEXT,
  urgency TEXT,
  extracted_info JSONB DEFAULT '{}',
  proposed_slot JSONB DEFAULT '{}',
  outcome TEXT DEFAULT 'pending',
  escalation_reason TEXT,
  ai_model TEXT,
  ai_cost NUMERIC(10,6) DEFAULT 0,
  duration_seconds INTEGER,
  recording_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_call_sessions_phone ON call_sessions(caller_phone);
CREATE INDEX IF NOT EXISTS idx_call_sessions_created ON call_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_sessions_vapi_id ON call_sessions(vapi_call_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_customer ON call_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_intent ON call_sessions(intent);
CREATE INDEX IF NOT EXISTS idx_call_sessions_outcome ON call_sessions(outcome);

-- RLS (service role bypasses RLS, but set up policy for future dashboard access)
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated admins to read all call sessions
CREATE POLICY "Admins can view call sessions"
  ON call_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner')
    )
  );

-- Service role can do everything (used by orchestrator)
CREATE POLICY "Service role full access"
  ON call_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
