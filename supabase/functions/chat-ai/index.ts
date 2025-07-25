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
    
    // Validate request method
    if (req.method !== 'POST') {
      console.error("Invalid method:", req.method);
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 405 
        }
      );
    }

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const { message, conversationHistory } = requestBody;
    
    if (!message || typeof message !== 'string') {
      console.error("Invalid message:", message);
      return new Response(
        JSON.stringify({ error: "Message is required and must be a string" }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log("Message received:", message);
    console.log("History length:", conversationHistory?.length || 0);
    
    // Get OpenAI API key
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    console.log("OpenAI key exists:", !!openaiKey);
    
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

    // Prepare messages array
    const messages = [
      {
        role: 'system',
        content: 'You are MeetCute, a friendly AI assistant that helps people reconnect with someone they briefly met. Be warm, enthusiastic, and ask follow-up questions to help them describe their memory in detail.'
      }
    ];

    // Add conversation history if it exists and is valid
    if (Array.isArray(conversationHistory)) {
      messages.push(...conversationHistory);
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: message
    });

    // Call OpenAI API
    console.log("Calling OpenAI API...");
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: messages,
        max_tokens: 500,
        temperature: 0.7
      }),
    });

    console.log("OpenAI response status:", openaiResponse.status);

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API error:", errorText);
      return new Response(
        JSON.stringify({ error: `OpenAI error: ${openaiResponse.status} - ${errorText}` }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    const openaiData = await openaiResponse.json();
    
    if (!openaiData.choices || !openaiData.choices[0] || !openaiData.choices[0].message) {
      console.error("Invalid OpenAI response structure:", openaiData);
      return new Response(
        JSON.stringify({ error: "Invalid response from OpenAI" }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    const aiResponse = openaiData.choices[0].message.content || "Sorry, I couldn't generate a response.";
    
    console.log("AI response generated successfully");
    console.log("Response length:", aiResponse.length);
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
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: `Function error: ${error.message}`,
        type: error.name || 'Unknown'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});