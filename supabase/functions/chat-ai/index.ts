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
    console.log("Request method:", req.method);
    console.log("Request headers:", Object.fromEntries(req.headers.entries()));
    
    const rawBody = await req.text();
    console.log("Raw request body:", rawBody);
    
    let parsedBody;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error(`Invalid JSON in request body: ${parseError.message}`);
    }
    
    const { message, conversationHistory, userId } = parsedBody;
    console.log("Received message:", message);
    console.log("User ID:", userId);
    console.log("Conversation history length:", conversationHistory?.length || 0);
    
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    console.log("API key exists:", !!apiKey);
    
    if (!apiKey) {
      console.error("OPENAI_API_KEY not configured");
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Get user's profile for personalized greeting
    const supabase_url = Deno.env.get('SUPABASE_URL');
    const supabase_key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    let userName = '';
    if (userId && supabase_url && supabase_key) {
      try {
        const supabaseClient = await import('https://esm.sh/@supabase/supabase-js@2.52.1');
        const supabase = supabaseClient.createClient(supabase_url, supabase_key);
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (profile?.first_name) {
          userName = profile.first_name.trim();
        }
      } catch (error) {
        console.log('Could not fetch user profile:', error);
      }
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
        max_tokens: 500,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `You are MeetCute's friendly AI assistant. ${userName ? `The user's name is ${userName}. ` : ''}Your job is to help users describe real-life memories (IRL encounters) for potential matching.

PERSONALITY:
- Warm, enthusiastic, and genuinely excited about human connections
- Use emojis naturally but not excessively
- Ask follow-up questions to get specific details
- Make users feel heard and understood

GOALS:
1. Help users describe their real-life memory in detail
2. Extract: location, time, physical descriptions, what happened, emotional vibe
3. When they provide good details, suggest saving the memory for matching
4. Always respond as if you're genuinely excited to help them reconnect

RESPONSE STRUCTURE:
When users share a memory, extract key details and respond enthusiastically. Focus on getting:
- WHERE exactly (specific location, store, building, etc.)
- WHEN (day of week, time of day, season, etc.) 
- WHAT they looked like (clothing, hair, distinctive features)
- WHAT happened (eye contact, conversation, interaction)
- THE VIBE (how it felt, why it was memorable)

Once you have good details, suggest: "This sounds like a perfect memory to save! Would you like me to help you store this so we can look for potential matches?"

${userName ? `Start by greeting ${userName} warmly.` : 'Be friendly and welcoming.'}`
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error details:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("OpenAI API response received");
    const aiResponse = data.choices[0]?.message?.content || "I'm sorry, I had trouble processing that. Could you try again?";

    // Check if the response contains structured memory data (for future enhancement)
    let structuredResponse = {
      chat_response: aiResponse
    };

    // If the user seems to be describing a detailed memory, we could extract structured data here
    if (message.toLowerCase().includes('save') || message.toLowerCase().includes('store') || 
        (message.length > 50 && (message.includes('saw') || message.includes('met') || message.includes('noticed')))) {
      
      // This could be enhanced to extract structured data using another API call
      structuredResponse = {
        chat_response: aiResponse,
        memory_ready: true,
        suggested_action: "save_memory"
      };
    }

    console.log("=== CHAT-AI FUNCTION SUCCESS ===");

    return new Response(
      JSON.stringify({ 
        response: structuredResponse.chat_response,
        memory_ready: structuredResponse.memory_ready || false,
        suggested_action: structuredResponse.suggested_action || null
      }),
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