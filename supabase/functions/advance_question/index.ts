// =====================================================
// ADVANCE QUESTION EDGE FUNCTION (Admin only)
// Deploy: supabase functions deploy advance_question
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
    const { poll_id, to_idx } = await req.json();

    if (!poll_id || to_idx === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: poll_id, to_idx" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is owner or admin of this poll
    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .from('polls')
      .select('id, owner_id')
      .eq('id', poll_id)
      .single();

    if (adminError || !adminCheck) {
      return new Response(
        JSON.stringify({ error: "Poll not found" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is owner
    const isOwner = adminCheck.owner_id === userId;

    // If not owner, check if user is in poll_admins
    let isAdmin = false;
    if (!isOwner) {
      const { data: adminData } = await supabaseAdmin
        .from('poll_admins')
        .select('user_id')
        .eq('poll_id', poll_id)
        .eq('user_id', userId)
        .single();
      
      isAdmin = !!adminData;
    }

    if (!isOwner && !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: You are not an admin of this poll" }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call the advance_question database function
    const { error: advanceError } = await supabaseAdmin.rpc('advance_question', {
      p_poll_id: poll_id,
      p_to_idx: to_idx,
    });

    if (advanceError) {
      console.error('Advance question error:', advanceError);
      return new Response(
        JSON.stringify({ error: advanceError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
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

