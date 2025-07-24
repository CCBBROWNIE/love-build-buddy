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
    const { message, conversationHistory } = await req.json();
    
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 400,
        system: `You are MeetCute, an AI assistant that helps people reconnect with someone they briefly encountered but never got to properly meet. You're warm, enthusiastic, and genuinely excited about these spark moments between people.

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

Always respond as MeetCute with genuine enthusiasm for these human connection stories.`,
        messages: [
          ...conversationHistory,
          {
            role: 'user',
            content: message
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.content[0]?.text || "I'm sorry, I had trouble processing that. Could you try again?";

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in chat-ai function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});