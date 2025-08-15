-- Professional Gas Safe Diagnostic Database Schema Migration
-- Phase 1: Core Diagnostic Tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Unified Fault Code System
CREATE TABLE diagnostic_fault_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manufacturer_id UUID REFERENCES manufacturers(id),
    fault_code VARCHAR(20) NOT NULL,
    fault_description TEXT NOT NULL,
    severity_level VARCHAR(20) CHECK (severity_level IN ('critical', 'major', 'minor', 'warning')),
    gas_safe_category VARCHAR(50),
    
    -- Professional diagnostic data
    root_causes JSONB, -- Array of possible causes
    diagnostic_procedures JSONB, -- Step-by-step testing procedures
    required_equipment JSONB, -- Test equipment needed
    expected_values JSONB, -- Normal operating parameters
    safety_precautions JSONB, -- Gas Safe isolation procedures
    
    -- Technical specifications
    component_references JSONB, -- Related components
    wiring_diagram_refs JSONB, -- Diagram references
    service_bulletin_refs JSONB, -- Manufacturer bulletins
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(manufacturer_id, fault_code)
);

-- 2. Component Technical Database
CREATE TABLE boiler_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_name VARCHAR(100) NOT NULL,
    component_type VARCHAR(50), -- sensor, valve, pump, etc.
    function_description TEXT,
    
    -- Technical specifications
    electrical_specs JSONB, -- voltage, resistance, current
    operating_parameters JSONB, -- pressure, temperature ranges
    test_procedures JSONB, -- How to test this component
    common_failure_modes JSONB, -- Typical ways it fails
    
    -- Safety information
    safety_warnings JSONB,
    isolation_requirements JSONB,
    
    -- Relationships
    compatible_manufacturers JSONB, -- Which manufacturers use this
    related_fault_codes JSONB, -- Associated fault codes
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Professional Diagnostic Procedures
CREATE TABLE diagnostic_procedures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    procedure_name VARCHAR(200) NOT NULL,
    procedure_type VARCHAR(50), -- systematic, component, safety, etc.
    
    -- Procedure details
    step_by_step_instructions JSONB, -- Detailed steps
    required_tools JSONB, -- Specific equipment needed
    expected_results JSONB, -- What to expect at each step
    decision_points JSONB, -- If/then diagnostic logic
    
    -- Safety and compliance
    gas_safe_requirements JSONB,
    safety_checks JSONB,
    regulatory_compliance JSONB,
    
    -- Time and complexity
    estimated_time_minutes INTEGER,
    skill_level VARCHAR(20), -- basic, intermediate, advanced
    
    -- Relationships
    applicable_fault_codes JSONB,
    related_components JSONB,
    manufacturer_specific BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enhanced Manufacturer Information
CREATE TABLE manufacturers_enhanced (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manufacturer_name VARCHAR(100) NOT NULL UNIQUE,
    
    -- Technical support information
    technical_support_contact JSONB,
    service_manual_access JSONB,
    parts_availability JSONB,
    
    -- Diagnostic specifics
    diagnostic_protocols JSONB, -- Manufacturer-specific procedures
    fault_code_patterns JSONB, -- How they structure fault codes
    special_tools_required JSONB, -- Proprietary diagnostic tools
    
    -- Gas Safe information
    gas_safe_approvals JSONB,
    certification_requirements JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Diagnostic Knowledge Graph
CREATE TABLE diagnostic_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationship definition
    source_type VARCHAR(50), -- fault_code, component, symptom
    source_id UUID,
    target_type VARCHAR(50),
    target_id UUID,
    relationship_type VARCHAR(50), -- causes, indicates, requires, etc.
    
    -- Relationship strength and context
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    context_conditions JSONB, -- When this relationship applies
    
    -- Professional insights
    engineer_notes TEXT,
    frequency_occurrence VARCHAR(20), -- common, occasional, rare
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. LLM-Optimized Knowledge Base
CREATE TABLE professional_knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Content organization
    knowledge_type VARCHAR(50), -- procedure, specification, regulation
    category VARCHAR(100), -- gas_safe, manufacturer_specific, component
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    
    -- Professional context
    gas_safe_regulation_refs JSONB,
    manufacturer_applicability JSONB,
    component_relevance JSONB,
    fault_code_relevance JSONB,
    
    -- LLM optimization
    semantic_tags JSONB, -- Keywords for semantic search
    professional_level VARCHAR(20), -- apprentice, qualified, senior
    content_embedding VECTOR(1536), -- For semantic search
    
    -- Metadata
    source_document VARCHAR(200),
    last_verified TIMESTAMPTZ,
    verification_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for optimal performance
CREATE INDEX idx_diagnostic_fault_codes_manufacturer ON diagnostic_fault_codes(manufacturer_id);
CREATE INDEX idx_diagnostic_fault_codes_code ON diagnostic_fault_codes(fault_code);
CREATE INDEX idx_diagnostic_fault_codes_severity ON diagnostic_fault_codes(severity_level);

CREATE INDEX idx_boiler_components_type ON boiler_components(component_type);
CREATE INDEX idx_boiler_components_name ON boiler_components(component_name);

CREATE INDEX idx_diagnostic_procedures_type ON diagnostic_procedures(procedure_type);
CREATE INDEX idx_diagnostic_procedures_skill ON diagnostic_procedures(skill_level);

CREATE INDEX idx_diagnostic_relationships_source ON diagnostic_relationships(source_type, source_id);
CREATE INDEX idx_diagnostic_relationships_target ON diagnostic_relationships(target_type, target_id);
CREATE INDEX idx_diagnostic_relationships_type ON diagnostic_relationships(relationship_type);

CREATE INDEX idx_professional_knowledge_type ON professional_knowledge_base(knowledge_type);
CREATE INDEX idx_professional_knowledge_category ON professional_knowledge_base(category);
CREATE INDEX idx_professional_knowledge_level ON professional_knowledge_base(professional_level);

-- Create vector index for semantic search (if vector extension is available)
-- CREATE INDEX idx_professional_knowledge_embedding ON professional_knowledge_base 
-- USING ivfflat (content_embedding vector_cosine_ops) WITH (lists = 100);

-- Add Row Level Security policies
ALTER TABLE diagnostic_fault_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE boiler_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturers_enhanced ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (allow read access for authenticated users)
CREATE POLICY "Allow read access for authenticated users" ON diagnostic_fault_codes
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access for authenticated users" ON boiler_components
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access for authenticated users" ON diagnostic_procedures
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access for authenticated users" ON manufacturers_enhanced
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access for authenticated users" ON diagnostic_relationships
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access for authenticated users" ON professional_knowledge_base
    FOR SELECT USING (auth.role() = 'authenticated');

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_diagnostic_fault_codes_updated_at BEFORE UPDATE ON diagnostic_fault_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_boiler_components_updated_at BEFORE UPDATE ON boiler_components FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_diagnostic_procedures_updated_at BEFORE UPDATE ON diagnostic_procedures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_manufacturers_enhanced_updated_at BEFORE UPDATE ON manufacturers_enhanced FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_diagnostic_relationships_updated_at BEFORE UPDATE ON diagnostic_relationships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_professional_knowledge_base_updated_at BEFORE UPDATE ON professional_knowledge_base FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
