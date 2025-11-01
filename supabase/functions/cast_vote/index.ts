// =====================================================
// CAST VOTE EDGE FUNCTION
// Deploy: supabase functions deploy cast_vote
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jwt = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;

    // Parse request body
    const { question_id, option_key } = await req.json();

    if (!question_id || !option_key) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: question_id, option_key" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already voted (graceful idempotency)
    const { data: existingVote } = await supabaseAdmin
      .from('votes')
      .select('id, option_key')
      .eq('question_id', question_id)
      .eq('user_id', userId)
      .maybeSingle()

    // If vote exists, return current counts (idempotent response)
    if (existingVote) {
      const { data: currentCounts } = await supabaseAdmin
        .from('tallies')
        .select('counts')
        .eq('question_id', question_id)
        .maybeSingle()
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          counts: currentCounts?.counts ?? {},
          message: `Already voted for ${existingVote.option_key}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call the cast_vote database function
    const { data, error } = await supabaseAdmin.rpc('cast_vote', {
      p_question_id: question_id,
      p_user_id: userId,
      p_option_key: option_key,
    });

    if (error) {
      console.error('Vote error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, counts: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('Unexpected error:', e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

