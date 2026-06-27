CREATE TABLE IF NOT EXISTS public.service_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  contact text,
  phone text,
  email text,
  address text,
  city text,
  zip text,
  service_type text,
  urgency text,
  equipment_info text,
  issue text NOT NULL,
  started_when text,
  symptoms text[],
  file_url text,
  file_urls text[],
  membership_interest boolean DEFAULT false,
  status text DEFAULT 'pending'
);

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY service_requests_insert ON public.service_requests
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY service_requests_select_service_role ON public.service_requests
    FOR SELECT TO service_role
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
