-- Migration 004: Test RLS Policies
-- This migration tests and validates the RLS policies

-- Record this migration in migrations table
INSERT INTO public.migrations (name, applied_at) 
VALUES ('004_test_rls_policies.sql', CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Function to test RLS policies
CREATE OR REPLACE FUNCTION public.test_rls_policies()
RETURNS TABLE (
    table_name text,
    has_rls boolean,
    policies text[]
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    tables_cursor CURSOR FOR 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN ('schema_migrations', 'schema_version');
    t_name text;
    pol_names text[];
    has_rls_enabled boolean;
BEGIN
    FOR t_name IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
                AND tablename NOT IN ('schema_migrations', 'schema_version')
    LOOP
        -- Check if RLS is enabled
        SELECT relrowsecurity INTO has_rls_enabled
        FROM pg_class
        WHERE relname = t_name AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
        
        -- Get policy names
        SELECT array_agg(polname::text) INTO pol_names
        FROM pg_policy
        WHERE polrelid = (SELECT oid FROM pg_class WHERE relname = t_name AND relnamespace = 
                         (SELECT oid FROM pg_namespace WHERE nspname = 'public'));
        
        -- Return results
        table_name := t_name;
        has_rls := has_rls_enabled;
        policies := pol_names;
        RETURN NEXT;
    END LOOP;
END;
$$;
