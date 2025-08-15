-- Migration 001: Create Knowledge Base Tables
-- This migration creates the foundational tables for the BoilerBrain knowledge system

-- Record this migration in migrations table
INSERT INTO public.migrations (name, applied_at) 
VALUES ('001_create_knowledge_base.sql', CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Create manufacturers reference table
CREATE TABLE IF NOT EXISTS public.manufacturers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    website_url TEXT,
    support_url TEXT,
    phone_number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create boiler models table with manufacturer relationship
CREATE TABLE IF NOT EXISTS public.boiler_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manufacturer_id UUID REFERENCES public.manufacturers(id),
    model_name VARCHAR(255) NOT NULL,
    description TEXT,
    year_released INTEGER,
    fuel_type VARCHAR(50),
    boiler_type VARCHAR(50),
    efficiency_rating VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (manufacturer_id, model_name)
);

-- Create fault codes reference table
CREATE TABLE IF NOT EXISTS public.fault_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manufacturer_id UUID REFERENCES public.manufacturers(id),
    code VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    causes TEXT[] DEFAULT '{}',
    troubleshooting TEXT[] DEFAULT '{}',
    safety_level VARCHAR(50) DEFAULT 'Low',
    applies_to_models UUID[] DEFAULT '{}',  -- Array of boiler_models UUIDs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (manufacturer_id, code)
);

-- Create knowledge categories table
CREATE TABLE IF NOT EXISTS public.knowledge_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES public.knowledge_categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create safety warnings reference table
CREATE TABLE IF NOT EXISTS public.safety_warnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keyword VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    severity INTEGER DEFAULT 1, -- 1-5 scale
    action_required TEXT,
    emergency_contact BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fault_codes_manufacturer ON public.fault_codes(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_boiler_models_manufacturer ON public.boiler_models(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_categories_parent ON public.knowledge_categories(parent_id);

-- Enable RLS
ALTER TABLE public.manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boiler_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fault_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_warnings ENABLE ROW LEVEL SECURITY;

-- Set up policies
CREATE POLICY "Public read access" ON public.manufacturers FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.boiler_models FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.fault_codes FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.knowledge_categories FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.safety_warnings FOR SELECT USING (true);

-- Admin policies
CREATE POLICY "Admin full access" ON public.manufacturers USING (auth.role() = 'service_role');
CREATE POLICY "Admin full access" ON public.boiler_models USING (auth.role() = 'service_role');
CREATE POLICY "Admin full access" ON public.fault_codes USING (auth.role() = 'service_role');
CREATE POLICY "Admin full access" ON public.knowledge_categories USING (auth.role() = 'service_role');
CREATE POLICY "Admin full access" ON public.safety_warnings USING (auth.role() = 'service_role');
