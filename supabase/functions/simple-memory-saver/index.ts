import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log("=== SIMPLE MEMORY SAVER START ===");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { conversation, userId } = await req.json();
    
    console.log("Conversation length:", conversation?.length || 0);
    console.log("User ID:", userId);
    
    if (!conversation || !userId) {
      throw new Error('Missing conversation or userId');
    }

    // Create a simple memory entry
    const { data: memory, error: insertError } = await supabase
      .from('memories')
      .insert({
        user_id: userId,
        description: conversation,
        content: conversation,
        timestamp: new Date().toISOString(),
        status: 'waiting',
        processed: false
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Failed to save memory: ${insertError.message}`);
    }

    console.log("Memory saved successfully:", memory.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        memoryId: memory.id,
        message: 'Memory saved successfully!' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error("=== SIMPLE MEMORY SAVER ERROR ===");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);

    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});