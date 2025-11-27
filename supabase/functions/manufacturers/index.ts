// Supabase Edge Function: Manufacturers API
// Returns list of unique manufacturers

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get unique manufacturers from boiler_manuals
    const { data, error } = await supabase
      .from('boiler_manuals')
      .select('manufacturer')
      .order('manufacturer');

    if (error) throw error;

    // Extract unique manufacturer names
    const manufacturers = [...new Set((data || []).map(m => m.manufacturer))]
      .filter(Boolean)
      .sort();

    return new Response(
      JSON.stringify({ manufacturers }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Manufacturers function error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch manufacturers', manufacturers: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
