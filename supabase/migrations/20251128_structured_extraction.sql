-- Structured Manual Extraction Tables
-- Run this migration in Supabase SQL Editor

-- 1. Service Procedures Table
CREATE TABLE IF NOT EXISTS service_procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id uuid REFERENCES manual_intelligence(id),
  manufacturer text NOT NULL,
  model_name text,
  procedure_name text NOT NULL,
  procedure_type text,
  steps jsonb DEFAULT '[]',
  tools_required text[],
  safety_warnings text[],
  expected_readings jsonb,
  page_numbers int[],
  created_at timestamptz DEFAULT now()
);

-- 2. Fault Finding Guides Table  
CREATE TABLE IF NOT EXISTS fault_finding_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id uuid REFERENCES manual_intelligence(id),
  manufacturer text NOT NULL,
  model_name text,
  fault_code text NOT NULL,
  cause_codes text[],
  description text,
  reset_type text,
  possible_causes text[],
  components text[],
  solutions jsonb,
  page_numbers int[],
  created_at timestamptz DEFAULT now()
);

-- 3. Boiler Part Images Table
CREATE TABLE IF NOT EXISTS boiler_part_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id uuid REFERENCES manual_intelligence(id),
  manufacturer text NOT NULL,
  model_name text,
  image_url text NOT NULL,
  image_type text,
  title text,
  description text,
  components_shown text[],
  part_annotations jsonb,
  page_number int,
  created_at timestamptz DEFAULT now()
);

-- 4. Part Replacement Procedures
CREATE TABLE IF NOT EXISTS part_replacement_procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id uuid REFERENCES manual_intelligence(id),
  manufacturer text NOT NULL,
  model_name text,
  part_name text NOT NULL,
  part_number text,
  removal_steps jsonb,
  installation_steps jsonb,
  tools_required text[],
  safety_warnings text[],
  requires_gas_safe boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fault_guides_code ON fault_finding_guides(fault_code);
CREATE INDEX IF NOT EXISTS idx_fault_guides_manufacturer ON fault_finding_guides(manufacturer);
CREATE INDEX IF NOT EXISTS idx_service_procedures_manufacturer ON service_procedures(manufacturer);
CREATE INDEX IF NOT EXISTS idx_part_replacement_part ON part_replacement_procedures(part_number);

-- Search function for fault codes
CREATE OR REPLACE FUNCTION search_fault_codes(
  p_code text,
  p_manufacturer text DEFAULT NULL
)
RETURNS TABLE (
  fault_code text,
  cause_codes text[],
  description text,
  reset_type text,
  possible_causes text[],
  components text[],
  manufacturer text,
  model_name text
)
LANGUAGE sql STABLE
AS $$
  SELECT 
    fg.fault_code,
    fg.cause_codes,
    fg.description,
    fg.reset_type,
    fg.possible_causes,
    fg.components,
    fg.manufacturer,
    fg.model_name
  FROM fault_finding_guides fg
  WHERE fg.fault_code ILIKE p_code
    AND (p_manufacturer IS NULL OR fg.manufacturer ILIKE '%' || p_manufacturer || '%')
  LIMIT 10;
$$;
