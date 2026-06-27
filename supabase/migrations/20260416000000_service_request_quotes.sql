ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS quote_parts_cost numeric(10,2),
  ADD COLUMN IF NOT EXISTS quote_labor_cost numeric(10,2),
  ADD COLUMN IF NOT EXISTS quote_total numeric(10,2),
  ADD COLUMN IF NOT EXISTS quote_notes text,
  ADD COLUMN IF NOT EXISTS quote_status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS deposit_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS square_customer_id text,
  ADD COLUMN IF NOT EXISTS square_invoice_id text,
  ADD COLUMN IF NOT EXISTS invoice_sent_at timestamptz;
