import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, conversationHistory } = await req.json()
    
    const apiKey = Deno.env.get('CLAUDE_API_KEY') || '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'

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
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
- Store these memories to potentially match with others who experienced the same moment
- Ask for specific details: time, place, what the person looked like, what happened
- Respond enthusiastically when someone shares a detailed memory
- Make users feel like their story matters

Always respond as MeetCute with genuine enthusiasm for these human connection stories.`,
        messages: [
          ...conversationHistory,
          {
            role: 'user',
            content: message
          }
        ]
      }),
    })

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`)
    }

    const data = await response.json()
    const aiResponse = data.content[0]?.text || "I'm sorry, I had trouble processing that. Could you try again?"

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})