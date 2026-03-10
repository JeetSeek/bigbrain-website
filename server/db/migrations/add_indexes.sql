-- Database performance indexes for frequently queried columns
-- Run this migration against your Supabase project

-- boiler_manuals: frequently filtered by manufacturer and searched by name
CREATE INDEX IF NOT EXISTS idx_boiler_manuals_manufacturer ON boiler_manuals (manufacturer);
CREATE INDEX IF NOT EXISTS idx_boiler_manuals_name ON boiler_manuals USING gin (name gin_trgm_ops);

-- gc_fault_codes: looked up by fault_code + manufacturer
CREATE INDEX IF NOT EXISTS idx_gc_fault_codes_fault_code ON gc_fault_codes (fault_code);
CREATE INDEX IF NOT EXISTS idx_gc_fault_codes_manufacturer ON gc_fault_codes (manufacturer);
CREATE INDEX IF NOT EXISTS idx_gc_fault_codes_display_code ON gc_fault_codes (display_code);
CREATE INDEX IF NOT EXISTS idx_gc_fault_codes_composite ON gc_fault_codes (fault_code, manufacturer);

-- verified_knowledge: queried by fault_code + manufacturer
CREATE INDEX IF NOT EXISTS idx_verified_knowledge_fault_code ON verified_knowledge (fault_code);
CREATE INDEX IF NOT EXISTS idx_verified_knowledge_manufacturer ON verified_knowledge (manufacturer);

-- symptom_guidance: filtered by manufacturer, model, symptom
CREATE INDEX IF NOT EXISTS idx_symptom_guidance_manufacturer ON symptom_guidance (manufacturer);
CREATE INDEX IF NOT EXISTS idx_symptom_guidance_model ON symptom_guidance (model);

-- chat_sessions: looked up by session_id and cleaned up by expires_at
CREATE INDEX IF NOT EXISTS idx_chat_sessions_session_id ON chat_sessions (session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_expires_at ON chat_sessions (expires_at);

-- boiler_fault_codes: if this table exists, index key lookup columns
CREATE INDEX IF NOT EXISTS idx_boiler_fault_codes_manufacturer ON boiler_fault_codes (manufacturer);
CREATE INDEX IF NOT EXISTS idx_boiler_fault_codes_fault_code ON boiler_fault_codes (fault_code);

-- NOTE: The gin_trgm_ops index on boiler_manuals.name requires the pg_trgm extension.
-- If not already enabled, run:  CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- If pg_trgm is unavailable, remove the idx_boiler_manuals_name index above and use:
-- CREATE INDEX IF NOT EXISTS idx_boiler_manuals_name_btree ON boiler_manuals (name);
