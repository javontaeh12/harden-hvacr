-- ============================================================================
-- Agent System Tables: expenses, income, payroll, tax_estimates, security_scans
-- ============================================================================

-- Expenses tracking
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN (
    'fuel','parts','tools','vehicle_maintenance','insurance','software',
    'marketing','office','training','licensing','uniforms','subcontractor',
    'utilities','rent','other'
  )),
  description text,
  amount numeric(10,2) NOT NULL,
  vendor text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  tax_deductible boolean DEFAULT false,
  tax_category text,
  payment_method text,
  recurring boolean DEFAULT false,
  recurring_interval text,
  receipt_url text,
  created_by uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Income tracking
CREATE TABLE IF NOT EXISTS income (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN (
    'service_call','maintenance_agreement','membership','contract',
    'parts_sale','consultation','referral_bonus','other'
  )),
  description text,
  amount numeric(10,2) NOT NULL,
  customer_id uuid REFERENCES customers(id),
  work_order_id uuid,
  payment_method text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  tax_category text,
  invoice_number text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payroll records
CREATE TABLE IF NOT EXISTS payroll (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tech_id uuid REFERENCES profiles(id),
  pay_period_start date NOT NULL,
  pay_period_end date NOT NULL,
  hours_worked numeric DEFAULT 0,
  overtime_hours numeric DEFAULT 0,
  hourly_rate numeric NOT NULL,
  overtime_rate numeric,
  gross_pay numeric,
  federal_tax numeric DEFAULT 0,
  state_tax numeric DEFAULT 0,
  fica numeric DEFAULT 0,
  net_pay numeric,
  status text DEFAULT 'pending' CHECK (status IN ('pending','approved','paid')),
  paid_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Quarterly tax estimates
CREATE TABLE IF NOT EXISTS tax_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text NOT NULL,
  total_income numeric DEFAULT 0,
  total_expenses numeric DEFAULT 0,
  net_profit numeric DEFAULT 0,
  estimated_tax numeric DEFAULT 0,
  tax_rate numeric DEFAULT 0,
  deductions_total numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Security scan results
CREATE TABLE IF NOT EXISTS security_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_type text NOT NULL CHECK (scan_type IN (
    'headers','ssl','auth_audit','rls_check','api_exposure','full_daily'
  )),
  status text DEFAULT 'running' CHECK (status IN ('running','passed','warnings','critical')),
  findings jsonb DEFAULT '[]'::jsonb,
  summary text,
  severity text DEFAULT 'low' CHECK (severity IN ('low','medium','high','critical')),
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_scans ENABLE ROW LEVEL SECURITY;

-- Service role full access policies
CREATE POLICY "Service role full access on expenses"
  ON expenses FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on income"
  ON income FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on payroll"
  ON payroll FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on tax_estimates"
  ON tax_estimates FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on security_scans"
  ON security_scans FOR ALL USING (true) WITH CHECK (true);
