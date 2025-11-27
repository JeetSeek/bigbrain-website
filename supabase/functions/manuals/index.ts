// Supabase Edge Function: Manuals API
// Replaces Express /api/manuals endpoint

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get('search') || '';
    const manufacturer = url.searchParams.get('manufacturer') || '';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query
    let query = supabase
      .from('boiler_manuals')
      .select('*', { count: 'exact' });

    // Apply filters
    if (manufacturer) {
      query = query.ilike('manufacturer', `%${manufacturer}%`);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,manufacturer.ilike.%${search}%,gc_number.ilike.%${search}%`);
    }

    // Apply pagination and sorting
    query = query
      .range(offset, offset + limit - 1)
      .order('manufacturer', { ascending: true });

    const { data, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    return new Response(
      JSON.stringify({
        data: data || [],
        total: count || 0,
        hasMore: (offset + limit) < (count || 0)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Manuals function error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch manuals', data: [], total: 0 }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
