-- Migration 001 (v2): Corrects initial database schema based on architectural blueprint.
-- Fixes data type mismatch for fault_code_id foreign key.

BEGIN;

-- 1. Rename 'boilers' to 'boiler_manuals' and update column names for clarity.
ALTER TABLE IF EXISTS public.boilers RENAME TO boiler_manuals;
ALTER TABLE public.boiler_manuals RENAME COLUMN make TO manufacturer;
ALTER TABLE public.boiler_manuals RENAME COLUMN model TO name;
ALTER TABLE public.boiler_manuals RENAME COLUMN pdf_url TO url;

-- 2. Create the 'boiler_models' table for detailed specifications.
CREATE TABLE IF NOT EXISTS public.boiler_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manufacturer TEXT NOT NULL,
    model_name TEXT NOT NULL,
    gc_number TEXT UNIQUE,
    system_type TEXT, -- e.g., Combi, System, Heat-only
    specifications JSONB, -- For storing technical details
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create the 'repair_histories' table for logging repairs.
CREATE TABLE IF NOT EXISTS public.repair_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.chat_sessions(id),
    boiler_model_id UUID REFERENCES public.boiler_models(id),
    fault_code_id TEXT REFERENCES public.boiler_fault_codes(id), -- Corrected data type to TEXT
    symptoms_reported TEXT[],
    diagnostic_steps_taken TEXT[],
    solution_applied TEXT,
    parts_used TEXT[],
    engineer_notes TEXT,
    repair_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Drop the redundant 'knowledge_embeddings' table to consolidate embedding strategy.
DROP TABLE IF EXISTS public.knowledge_embeddings;

-- Add comments to new tables for clarity
COMMENT ON TABLE public.boiler_models IS 'Stores detailed specifications for different boiler models.';
COMMENT ON TABLE public.repair_histories IS 'Logs historical repair data for analysis and improved diagnostics.';

COMMIT;
