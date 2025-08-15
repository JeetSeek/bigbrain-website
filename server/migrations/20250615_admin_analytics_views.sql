-- Migration: Admin Analytics Views and RLS Policies
-- Purpose: Create views for admin dashboard analytics and secure them with RLS

-- Create view for user statistics with aggregated data
CREATE OR REPLACE VIEW admin_user_stats AS
SELECT
  u.id,
  u.email,
  u.created_at,
  u.last_sign_in_at,
  u.app_metadata,
  u.user_metadata,
  count(DISTINCT cs.id) AS chat_count,
  count(DISTINCT mv.id) AS manual_views_count,
  count(DISTINCT f.id) AS feedback_count,
  COALESCE(u.app_metadata->>'role', 'user') AS role,
  COALESCE(u.user_metadata->>'tier', 'free') AS tier
FROM
  auth.users u
LEFT JOIN
  public.chat_sessions cs ON u.id = cs.user_id
LEFT JOIN
  public.manual_views mv ON u.id = mv.user_id
LEFT JOIN
  public.feedback f ON u.id = f.user_id
GROUP BY
  u.id, u.email, u.created_at, u.last_sign_in_at, u.app_metadata, u.user_metadata;

-- Create view for system-wide metrics
CREATE OR REPLACE VIEW admin_system_metrics AS
SELECT
  (SELECT count(*) FROM auth.users) AS total_users,
  (SELECT count(*) FROM auth.users WHERE created_at >= NOW() - INTERVAL '24 hours') AS new_users_24h,
  (SELECT count(*) FROM auth.users WHERE created_at >= NOW() - INTERVAL '7 days') AS new_users_7d,
  (SELECT count(*) FROM auth.users WHERE created_at >= NOW() - INTERVAL '30 days') AS new_users_30d,
  (SELECT count(*) FROM public.chat_sessions) AS total_chats,
  (SELECT count(*) FROM public.chat_sessions WHERE created_at >= NOW() - INTERVAL '24 hours') AS chats_24h,
  (SELECT count(*) FROM public.chat_sessions WHERE created_at >= NOW() - INTERVAL '7 days') AS chats_7d,
  (SELECT count(*) FROM public.manual_views) AS total_manual_views,
  (SELECT count(*) FROM public.manual_views WHERE viewed_at >= NOW() - INTERVAL '7 days') AS manual_views_7d,
  (SELECT count(*) FROM public.feedback) AS total_feedback,
  (SELECT count(*) FROM public.feedback WHERE created_at >= NOW() - INTERVAL '7 days') AS feedback_7d,
  (SELECT count(*) FROM public.knowledge_base) AS knowledge_base_items,
  (SELECT count(*) FROM public.knowledge_embeddings) AS knowledge_embeddings,
  NOW() AS generated_at;

-- Enable RLS on views
ALTER VIEW admin_user_stats SECURITY INVOKER;
ALTER VIEW admin_system_metrics SECURITY INVOKER;

-- Create RLS policies for views
-- Only allow access to users with the 'admin' role

-- Create a function to check if user is admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply RLS policies to underlying tables that feed into our views

-- RLS for chat_sessions table
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Admin users can see all chat sessions
CREATE POLICY admin_all_chat_sessions
  ON public.chat_sessions
  FOR ALL
  TO authenticated
  USING (auth.is_admin());

-- Policy: Users can only see their own chat sessions
CREATE POLICY user_own_chat_sessions
  ON public.chat_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS for manual_views table
ALTER TABLE public.manual_views ENABLE ROW LEVEL SECURITY;

-- Policy: Admin users can see all manual views
CREATE POLICY admin_all_manual_views
  ON public.manual_views
  FOR ALL
  TO authenticated
  USING (auth.is_admin());

-- Policy: Users can only see their own manual views
CREATE POLICY user_own_manual_views
  ON public.manual_views
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS for feedback table
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Admin users can see all feedback
CREATE POLICY admin_all_feedback
  ON public.feedback
  FOR ALL
  TO authenticated
  USING (auth.is_admin());

-- Create a secure view for admin analytics that checks for admin role
CREATE OR REPLACE VIEW admin_secure_analytics AS
SELECT * 
FROM admin_system_metrics
WHERE auth.is_admin();

-- Create a secure view for admin user management that checks for admin role
CREATE OR REPLACE VIEW admin_secure_user_stats AS
SELECT * 
FROM admin_user_stats
WHERE auth.is_admin();

-- Create a function to validate that all tables have RLS enabled
CREATE OR REPLACE FUNCTION public.validate_rls_enabled()
RETURNS TABLE (table_name text, has_rls boolean) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tables.table_name::text,
    tables.has_row_level_security AS has_rls
  FROM 
    information_schema.tables
  JOIN 
    pg_catalog.pg_tables AS pgt
    ON tables.table_name = pgt.tablename
  WHERE 
    tables.table_schema = 'public'
    AND tables.table_type = 'BASE TABLE';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to the anon and authenticated roles
GRANT SELECT ON public.admin_secure_analytics TO authenticated;
GRANT SELECT ON public.admin_secure_user_stats TO authenticated;
