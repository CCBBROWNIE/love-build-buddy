import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    console.log("=== CHAT-AI FUNCTION START ===");
    
    // Parse request body
    const { message, conversationHistory } = await req.json();
    console.log("Message received:", message);
    console.log("History length:", conversationHistory?.length || 0);
    
    // Get OpenAI API key
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    console.log("OpenAI key exists:", !!openaiKey);
    console.log("OpenAI key length:", openaiKey?.length || 0);
    console.log("OpenAI key starts with:", openaiKey?.substring(0, 7) || 'none');
    
    if (!openaiKey) {
      console.error("OPENAI_API_KEY not found");
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Call OpenAI API
    console.log("Calling OpenAI API...");
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are MeetCute, a friendly AI assistant that helps people reconnect with someone they briefly met. Be warm, enthusiastic, and ask follow-up questions to help them describe their memory in detail.'
          },
          ...conversationHistory,
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      }),
    });

    console.log("OpenAI response status:", openaiResponse.status);

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API error:", errorText);
      return new Response(
        JSON.stringify({ error: `OpenAI error: ${openaiResponse.status}` }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
    
    console.log("AI response generated successfully");
    console.log("=== CHAT-AI FUNCTION SUCCESS ===");

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error("=== CHAT-AI FUNCTION ERROR ===");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: `Function error: ${error.message}`,
        stack: error.stack 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});