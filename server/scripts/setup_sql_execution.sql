-- Setup SQL execution function for migrations
-- This script creates a function for executing arbitrary SQL in Supabase

-- Create the function to execute SQL directly
CREATE OR REPLACE FUNCTION public.run_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION public.run_sql IS 'Executes arbitrary SQL. SECURITY DEFINER means it runs with the privileges of the creating user (typically postgres).';

-- Create another version with a different parameter name for compatibility
CREATE OR REPLACE FUNCTION public.execute_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION public.execute_sql IS 'Executes arbitrary SQL (alias of run_sql). SECURITY DEFINER means it runs with the privileges of the creating user.';

-- Grant execute permission to authenticated users (optional, depends on security requirements)
GRANT EXECUTE ON FUNCTION public.run_sql TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_sql TO authenticated;
