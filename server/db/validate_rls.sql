-- RLS Validation SQL Script
-- This script will validate and report on Row Level Security status for all tables

-- Create or replace the RLS validation function
CREATE OR REPLACE FUNCTION public.validate_rls_status()
RETURNS TABLE (
    table_name text,
    has_rls boolean,
    policy_count integer,
    policies text[],
    status text
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
    policy_cnt integer;
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
        
        -- Count policies
        SELECT COUNT(*) INTO policy_cnt
        FROM pg_policy
        WHERE polrelid = (SELECT oid FROM pg_class WHERE relname = t_name AND relnamespace = 
                        (SELECT oid FROM pg_namespace WHERE nspname = 'public'));
        
        -- Determine status
        IF has_rls_enabled AND policy_cnt > 0 THEN
            status := 'SECURE';
        ELSIF has_rls_enabled AND policy_cnt = 0 THEN
            status := 'BLOCKED';
        ELSE
            status := 'INSECURE';
        END IF;
        
        -- Return results
        table_name := t_name;
        has_rls := has_rls_enabled;
        policy_count := policy_cnt;
        policies := pol_names;
        RETURN NEXT;
    END LOOP;
END;
$$;

-- Apply missing RLS policies for users table if needed
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        -- Check if RLS is enabled
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = 'users'
            AND n.nspname = 'public'
            AND c.relrowsecurity = true
        ) THEN
            -- Enable Row Level Security
            ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
            
            -- Users can only see and edit their own profile
            CREATE POLICY "Users can view own profile only" 
            ON public.users 
            FOR SELECT 
            USING (auth.uid() = id);
            
            CREATE POLICY "Users can update own profile only" 
            ON public.users 
            FOR UPDATE 
            USING (auth.uid() = id)
            WITH CHECK (auth.uid() = id);
            
            -- Admins with service_role can view and manage all user profiles
            CREATE POLICY "Service role can view all profiles" 
            ON public.users 
            FOR SELECT 
            USING (auth.role() = 'service_role');
            
            CREATE POLICY "Service role can manage all profiles" 
            ON public.users 
            FOR ALL
            USING (auth.role() = 'service_role');
            
            -- Allow signups
            CREATE POLICY "New users can insert profile" 
            ON public.users 
            FOR INSERT 
            WITH CHECK (auth.uid() = id);
            
            RAISE NOTICE 'RLS enabled and policies added for public.users table';
        ELSE
            RAISE NOTICE 'RLS already enabled for public.users table';
        END IF;
    ELSE
        RAISE NOTICE 'public.users table does not exist in database';
    END IF;
END $$;

-- Apply missing RLS policies for manual_records table if needed
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'manual_records') THEN
        -- Check if RLS is enabled
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = 'manual_records'
            AND n.nspname = 'public'
            AND c.relrowsecurity = true
        ) THEN
            -- Enable Row Level Security
            ALTER TABLE public.manual_records ENABLE ROW LEVEL SECURITY;
            
            -- Users can only see their own records
            CREATE POLICY "Users can view own records only" 
            ON public.manual_records 
            FOR SELECT 
            USING (auth.uid() = user_id OR user_id IS NULL);
            
            -- Users can only create records for themselves
            CREATE POLICY "Users can create own records only" 
            ON public.manual_records 
            FOR INSERT 
            WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
            
            -- Service role can do anything
            CREATE POLICY "Service role can manage all records" 
            ON public.manual_records 
            FOR ALL 
            USING (auth.role() = 'service_role');
            
            RAISE NOTICE 'RLS enabled and policies added for public.manual_records table';
        ELSE
            RAISE NOTICE 'RLS already enabled for public.manual_records table';
        END IF;
    ELSE
        RAISE NOTICE 'public.manual_records table does not exist in database';
    END IF;
END $$;

-- Apply missing RLS policies for migrations table if needed
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'migrations') THEN
        -- Check if RLS is enabled
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = 'migrations'
            AND n.nspname = 'public'
            AND c.relrowsecurity = true
        ) THEN
            -- Enable Row Level Security
            ALTER TABLE public.migrations ENABLE ROW LEVEL SECURITY;
            
            -- Only allow read access to authenticated users
            CREATE POLICY "Authenticated users can view migrations" 
            ON public.migrations 
            FOR SELECT 
            USING (auth.role() = 'authenticated');
            
            -- Only service role can modify migrations
            CREATE POLICY "Service role can manage migrations" 
            ON public.migrations 
            FOR ALL 
            USING (auth.role() = 'service_role');
            
            RAISE NOTICE 'RLS enabled and policies added for public.migrations table';
        ELSE
            RAISE NOTICE 'RLS already enabled for public.migrations table';
        END IF;
    ELSE
        RAISE NOTICE 'public.migrations table does not exist in database';
    END IF;
END $$;

-- Apply missing RLS policies for manuals table if needed
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'manuals') THEN
        -- Check if RLS is enabled
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = 'manuals'
            AND n.nspname = 'public'
            AND c.relrowsecurity = true
        ) THEN
            -- Enable Row Level Security
            ALTER TABLE public.manuals ENABLE ROW LEVEL SECURITY;
            
            -- Allow public read access to all manuals
            CREATE POLICY "Public read access for manuals" 
            ON public.manuals 
            FOR SELECT 
            USING (true);
            
            -- Only service role can modify manuals
            CREATE POLICY "Service role can manage manuals" 
            ON public.manuals 
            FOR ALL 
            USING (auth.role() = 'service_role');
            
            RAISE NOTICE 'RLS enabled and policies added for public.manuals table';
        ELSE
            RAISE NOTICE 'RLS already enabled for public.manuals table';
        END IF;
    ELSE
        RAISE NOTICE 'public.manuals table does not exist in database';
    END IF;
END $$;

-- Generate validation report
SELECT
    table_name,
    has_rls,
    policy_count,
    policies,
    status,
    CASE 
        WHEN status = 'SECURE' THEN '✓'
        WHEN status = 'BLOCKED' THEN '⚠️'
        WHEN status = 'INSECURE' THEN '❌'
    END as status_icon
FROM
    validate_rls_status()
ORDER BY
    CASE status
        WHEN 'INSECURE' THEN 1
        WHEN 'BLOCKED' THEN 2
        WHEN 'SECURE' THEN 3
    END,
    table_name ASC;
