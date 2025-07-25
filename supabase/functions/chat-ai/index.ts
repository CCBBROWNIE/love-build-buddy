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
    console.log("=== CHAT-AI FUNCTION DEBUG START ===");
    const { message, conversationHistory, userId } = await req.json();
    console.log("Received message:", message);
    console.log("User ID:", userId);
    console.log("Conversation history:", conversationHistory);
    
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    console.log("API key exists:", !!apiKey);
    
    if (!apiKey) {
      console.error("OPENAI_API_KEY not configured");
      throw new Error('OPENAI_API_KEY not configured');
    }

    console.log("About to call OpenAI API...");
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 400,
        messages: [
          {
            role: 'system',
            content: `You are MeetCute, an AI assistant that helps people reconnect with someone they briefly encountered but never got to properly meet. You're warm, enthusiastic, and genuinely excited about these spark moments between people.

Your personality:
- Warm, friendly, and genuinely excited about human connections
- You use emojis naturally (but not excessively)  
- You're empathetic and understanding
- You ask follow-up questions to get more details
- You make users feel heard and understood

Your role:
- Help users describe their "missed connection" memories in detail
- Ask for specific details: time, place, what the person looked like, what happened
- Respond enthusiastically when someone shares a detailed memory
- Make users feel like their story matters
- When they provide good details, suggest they save their memory to find potential matches

Key conversation flow:
1. Listen to their story with enthusiasm
2. Ask clarifying questions for more details
3. Once they have a detailed memory, suggest: "This sounds like a perfect memory to save! Would you like me to help you store this so we can look for potential matches?"
4. If they agree, tell them to go to the Memories page to submit their detailed story

Always respond as MeetCute with genuine enthusiasm for these human connection stories.`
          },
          ...conversationHistory,
          {
            role: 'user',
            content: message
          }
        ]
      }),
    });

    console.log("OpenAI API response status:", response.status);
    console.log("OpenAI API response ok:", response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error details:', errorText);
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("OpenAI API response data:", data);
    const aiResponse = data.choices[0]?.message?.content || "I'm sorry, I had trouble processing that. Could you try again?";
    console.log("Final AI response:", aiResponse);
    console.log("=== CHAT-AI FUNCTION DEBUG SUCCESS ===");

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('=== CHAT-AI FUNCTION DEBUG ERROR ===');
    console.error('Error in chat-ai function:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});