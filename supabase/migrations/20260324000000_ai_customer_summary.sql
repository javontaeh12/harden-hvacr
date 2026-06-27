-- Add AI customer summary column to service_reports
ALTER TABLE service_reports
  ADD COLUMN IF NOT EXISTS ai_customer_summary JSONB DEFAULT NULL;

-- This stores the AI-generated customer-facing summary:
-- {
--   "findings_summary": "Plain-English explanation of what was found",
--   "urgency_explanation": "Why it needs fixing now",
--   "options_breakdown": [{ label, name, summary, includes_upgrades, total, value_note }],
--   "recommendation": "Professional recommendation",
--   "ai_cost": 0.001
-- }

COMMENT ON COLUMN service_reports.ai_customer_summary IS 'AI-generated customer-facing summary of findings and repair options';
