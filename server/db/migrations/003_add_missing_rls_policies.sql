-- Migration 003: Add Missing Row Level Security Policies
-- This migration adds RLS policies to tables that are missing them

-- Record this migration in migrations table
INSERT INTO public.migrations (name, applied_at) 
VALUES ('003_add_missing_rls_policies.sql', CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- Users Table RLS
-- =============================================
-- Enable RLS on users table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        -- Enable Row Level Security
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
        
        -- Users can only see and edit their own profile
        CREATE POLICY IF NOT EXISTS "Users can view own profile only" 
        ON public.users 
        FOR SELECT 
        USING (auth.uid() = id);
        
        CREATE POLICY IF NOT EXISTS "Users can update own profile only" 
        ON public.users 
        FOR UPDATE 
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
        
        -- Admins with service_role can view and manage all user profiles
        CREATE POLICY IF NOT EXISTS "Service role can view all profiles" 
        ON public.users 
        FOR SELECT 
        USING (auth.role() = 'service_role');
        
        CREATE POLICY IF NOT EXISTS "Service role can manage all profiles" 
        ON public.users 
        FOR ALL
        USING (auth.role() = 'service_role');
        
        -- Allow signups
        CREATE POLICY IF NOT EXISTS "New users can insert profile" 
        ON public.users 
        FOR INSERT 
        WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- =============================================
-- Manual_Records Table RLS
-- =============================================
-- Enable RLS on manual_records table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'manual_records') THEN
        -- Enable Row Level Security
        ALTER TABLE public.manual_records ENABLE ROW LEVEL SECURITY;
        
        -- Users can only see their own records
        CREATE POLICY IF NOT EXISTS "Users can view own records only" 
        ON public.manual_records 
        FOR SELECT 
        USING (auth.uid() = user_id OR user_id IS NULL);
        
        -- Users can only create records for themselves
        CREATE POLICY IF NOT EXISTS "Users can create own records only" 
        ON public.manual_records 
        FOR INSERT 
        WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
        
        -- Service role can do anything
        CREATE POLICY IF NOT EXISTS "Service role can manage all records" 
        ON public.manual_records 
        FOR ALL 
        USING (auth.role() = 'service_role');
    END IF;
END $$;

-- =============================================
-- Migrations Table RLS
-- =============================================
-- Enable RLS on migrations table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'migrations') THEN
        -- Enable Row Level Security
        ALTER TABLE public.migrations ENABLE ROW LEVEL SECURITY;
        
        -- Only allow read access to authenticated users
        CREATE POLICY IF NOT EXISTS "Authenticated users can view migrations" 
        ON public.migrations 
        FOR SELECT 
        USING (auth.role() = 'authenticated');
        
        -- Only service role can modify migrations
        CREATE POLICY IF NOT EXISTS "Service role can manage migrations" 
        ON public.migrations 
        FOR ALL 
        USING (auth.role() = 'service_role');
    END IF;
END $$;

-- =============================================
-- Manuals Table RLS
-- =============================================
-- Enable RLS on manuals table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'manuals') THEN
        -- Enable Row Level Security
        ALTER TABLE public.manuals ENABLE ROW LEVEL SECURITY;
        
        -- Allow public read access to all manuals
        CREATE POLICY IF NOT EXISTS "Public read access for manuals" 
        ON public.manuals 
        FOR SELECT 
        USING (true);
        
        -- Only service role can modify manuals
        CREATE POLICY IF NOT EXISTS "Service role can manage manuals" 
        ON public.manuals 
        FOR ALL 
        USING (auth.role() = 'service_role');
    END IF;
END $$;

-- Check for any additional tables that might need RLS
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN (
            'migrations', 'users', 'manual_records', 'manuals', 
            'boiler_manuals', 'knowledge_embeddings', 'feedback',
            'manufacturers', 'boiler_models', 'fault_codes',
            'knowledge_categories', 'safety_warnings',
            'schema_migrations', 'schema_version'
        )
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_record.tablename);
        EXECUTE format(
            'CREATE POLICY "Public read access" ON public.%I FOR SELECT USING (true)', 
            table_record.tablename
        );
        EXECUTE format(
            'CREATE POLICY "Admin full access" ON public.%I FOR ALL USING (auth.role() = ''service_role'')', 
            table_record.tablename
        );
        RAISE NOTICE 'Enabled RLS and created default policies for table: %', table_record.tablename;
    END LOOP;
END $$;
