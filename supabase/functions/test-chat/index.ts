import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Test chat function called");
    const { message } = await req.json();
    console.log("Received message:", message);

    // Simple response without any external API calls
    const responses = [
      "I hear you! That sounds like an amazing moment. Tell me more about what they looked like or what caught your attention? 😊",
      "That's such a sweet story! 💕 Can you remember any other details about where exactly this happened or what time of day it was?",
      "I love these spark moments! What was it about them that made you remember them so clearly? ✨",
      "This sounds like a perfect missed connection story! Do you remember anything specific about what they were wearing or doing?",
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    return new Response(
      JSON.stringify({ response: randomResponse }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Error in test-chat function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        response: "I'm having some technical difficulties, but I'm here to help! Tell me about your missed connection! 😊"
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 even for errors to test the basic flow
      },
    );
  }
});