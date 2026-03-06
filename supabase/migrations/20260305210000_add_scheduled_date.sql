-- Add scheduled_date to work_orders for scheduling jobs
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS scheduled_date DATE;

-- Create index for efficient date-based queries
CREATE INDEX IF NOT EXISTS idx_work_orders_scheduled_date ON public.work_orders(scheduled_date);
