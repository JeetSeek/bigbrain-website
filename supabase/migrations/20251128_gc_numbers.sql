-- GC Number-centric boiler data model
-- ================================================
-- GC numbers are the definitive identifier for boilers
-- Model names can change but GC numbers are engineering truth

-- Primary boiler identification table
CREATE TABLE IF NOT EXISTS boiler_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- PRIMARY IDENTIFIER
  gc_number TEXT NOT NULL,
  
  -- Marketing names
  manufacturer TEXT NOT NULL,
  model_name TEXT NOT NULL,
  model_variant TEXT,
  
  -- Metadata
  boiler_type TEXT,
  fuel_type TEXT DEFAULT 'natural_gas',
  output_kw DECIMAL,
  
  -- Production dates
  production_start DATE,
  production_end DATE,
  
  -- Manual reference
  manual_url TEXT,
  manual_filename TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(gc_number, manufacturer)
);

CREATE INDEX IF NOT EXISTS idx_boiler_models_gc ON boiler_models(gc_number);
CREATE INDEX IF NOT EXISTS idx_boiler_models_manufacturer ON boiler_models(manufacturer);
CREATE INDEX IF NOT EXISTS idx_boiler_models_model ON boiler_models(model_name);

-- GC number aliases (LPG variants, successors, etc.)
CREATE TABLE IF NOT EXISTS gc_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_gc TEXT NOT NULL,
  alias_gc TEXT NOT NULL,
  alias_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(primary_gc, alias_gc)
);

CREATE INDEX IF NOT EXISTS idx_gc_aliases_primary ON gc_aliases(primary_gc);
CREATE INDEX IF NOT EXISTS idx_gc_aliases_alias ON gc_aliases(alias_gc);

-- Manual sections with TOC structure for RAG navigation
CREATE TABLE IF NOT EXISTS manual_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gc_number TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  model_name TEXT,
  
  section_title TEXT NOT NULL,
  section_level INT DEFAULT 1,
  section_order INT,
  start_page INT,
  end_page INT,
  content TEXT NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manual_sections_gc ON manual_sections(gc_number);
CREATE INDEX IF NOT EXISTS idx_manual_sections_mfr ON manual_sections(manufacturer);
CREATE INDEX IF NOT EXISTS idx_manual_sections_title ON manual_sections USING gin(to_tsvector('english', section_title));
CREATE INDEX IF NOT EXISTS idx_manual_sections_content ON manual_sections USING gin(to_tsvector('english', content));

-- Fault codes linked to GC numbers
CREATE TABLE IF NOT EXISTS gc_fault_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gc_number TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  model_name TEXT,
  
  fault_code TEXT NOT NULL,
  display_code TEXT,
  description TEXT,
  cause TEXT,
  remedy TEXT,
  page_reference INT,
  severity TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gc_fault_codes_gc ON gc_fault_codes(gc_number);
CREATE INDEX IF NOT EXISTS idx_gc_fault_codes_code ON gc_fault_codes(fault_code);
CREATE INDEX IF NOT EXISTS idx_gc_fault_codes_mfr ON gc_fault_codes(manufacturer);

-- Procedures linked to GC numbers
CREATE TABLE IF NOT EXISTS gc_procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gc_number TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  model_name TEXT,
  
  procedure_name TEXT NOT NULL,
  category TEXT,
  steps JSONB,
  page_reference INT,
  time_estimate TEXT,
  difficulty TEXT,
  warnings TEXT[],
  tools_required TEXT[],
  parts_required TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gc_procedures_gc ON gc_procedures(gc_number);
CREATE INDEX IF NOT EXISTS idx_gc_procedures_category ON gc_procedures(category);
CREATE INDEX IF NOT EXISTS idx_gc_procedures_mfr ON gc_procedures(manufacturer);

-- GC Number lookup function
CREATE OR REPLACE FUNCTION search_by_gc(search_gc TEXT)
RETURNS TABLE (
  gc_number TEXT,
  manufacturer TEXT,
  model_name TEXT,
  fault_codes JSONB,
  procedures JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bm.gc_number,
    bm.manufacturer,
    bm.model_name,
    (SELECT jsonb_agg(jsonb_build_object(
      'code', fc.fault_code,
      'description', fc.description,
      'cause', fc.cause,
      'remedy', fc.remedy
    )) FROM gc_fault_codes fc WHERE fc.gc_number = bm.gc_number) as fault_codes,
    (SELECT jsonb_agg(jsonb_build_object(
      'name', p.procedure_name,
      'category', p.category,
      'steps', p.steps
    )) FROM gc_procedures p WHERE p.gc_number = bm.gc_number) as procedures
  FROM boiler_models bm
  WHERE bm.gc_number ILIKE '%' || search_gc || '%'
     OR EXISTS (SELECT 1 FROM gc_aliases ga WHERE ga.alias_gc ILIKE '%' || search_gc || '%' AND ga.primary_gc = bm.gc_number);
END;
$$ LANGUAGE plpgsql;

-- Search fault codes across all GC numbers
CREATE OR REPLACE FUNCTION search_fault_code(search_code TEXT, search_manufacturer TEXT DEFAULT NULL)
RETURNS TABLE (
  gc_number TEXT,
  manufacturer TEXT,
  model_name TEXT,
  fault_code TEXT,
  description TEXT,
  cause TEXT,
  remedy TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fc.gc_number,
    fc.manufacturer,
    fc.model_name,
    fc.fault_code,
    fc.description,
    fc.cause,
    fc.remedy
  FROM gc_fault_codes fc
  WHERE fc.fault_code ILIKE '%' || search_code || '%'
    AND (search_manufacturer IS NULL OR fc.manufacturer ILIKE '%' || search_manufacturer || '%');
END;
$$ LANGUAGE plpgsql;

-- Disable RLS for data insertion
ALTER TABLE boiler_models DISABLE ROW LEVEL SECURITY;
ALTER TABLE gc_aliases DISABLE ROW LEVEL SECURITY;
ALTER TABLE manual_sections DISABLE ROW LEVEL SECURITY;
ALTER TABLE gc_fault_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE gc_procedures DISABLE ROW LEVEL SECURITY;
