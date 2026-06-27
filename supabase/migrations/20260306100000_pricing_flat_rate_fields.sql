-- Add service_type and trade columns to pricing table for flat rate pricing structure
ALTER TABLE pricing ADD COLUMN IF NOT EXISTS service_type text NOT NULL DEFAULT 'residential';
ALTER TABLE pricing ADD COLUMN IF NOT EXISTS trade text NOT NULL DEFAULT 'hvac';
ALTER TABLE pricing ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE pricing ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Add check constraints
ALTER TABLE pricing ADD CONSTRAINT pricing_service_type_check CHECK (service_type IN ('residential', 'commercial'));
ALTER TABLE pricing ADD CONSTRAINT pricing_trade_check CHECK (trade IN ('hvac', 'refrigeration'));
