-- Agent Logs table for AI agent activity tracking
CREATE TABLE IF NOT EXISTS public.agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent TEXT NOT NULL,
  action TEXT NOT NULL,
  request_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_agent ON public.agent_logs(agent);
CREATE INDEX IF NOT EXISTS idx_agent_logs_action ON public.agent_logs(action);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created ON public.agent_logs(created_at DESC);

ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

-- Service role inserts bypass RLS, so no insert policy needed.
-- Admin users can view all logs.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agent_logs' AND policyname = 'Admins can view agent logs') THEN
    CREATE POLICY "Admins can view agent logs" ON public.agent_logs
      FOR SELECT USING (public.is_admin());
  END IF;
END $$;
