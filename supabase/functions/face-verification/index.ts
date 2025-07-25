import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Face verification function started ===');
    
    const requestBody = await req.json();
    console.log('Request body:', requestBody);
    
    const { userId } = requestBody;
    console.log('User ID:', userId);
    
    if (!userId) {
      console.log('No user ID provided');
      return new Response(
        JSON.stringify({ error: 'User ID is required', verified: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For now, let's just return a simple success response to test the connection
    console.log('Returning test success response');
    
    return new Response(
      JSON.stringify({
        verified: true,
        confidence: 95,
        reasoning: "Test verification - function is working correctly",
        match: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== Face verification error ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: `Function error: ${error.message}`,
        verified: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});