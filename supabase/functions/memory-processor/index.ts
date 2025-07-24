import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MemoryDetails {
  location?: string;
  time_period?: string;
  person_description?: string;
  user_description?: string;
  circumstances?: string;
  clothing?: string;
  interaction?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversation, userId } = await req.json();
    
    if (!conversation || !userId) {
      throw new Error('Missing conversation or userId');
    }

    console.log('Processing memory for user:', userId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract memory details using Claude API
    const extractionPrompt = `
      Analyze this conversation about a missed connection and extract structured information. 
      Focus on factual details that could help match with someone else's memory of the same event.

      Conversation: ${conversation}

      Extract and return ONLY a JSON object with these fields (use null for missing info):
      {
        "location": "specific place/venue",
        "time_period": "time/date range when this happened", 
        "person_description": "what the other person looked like",
        "user_description": "what the user was wearing/looked like",
        "circumstances": "what was happening/context",
        "clothing": "specific clothing mentioned",
        "interaction": "brief description of their interaction"
      }
    `;

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [
          { role: 'user', content: extractionPrompt }
        ]
      })
    });

    if (!claudeResponse.ok) {
      throw new Error(`Claude API error: ${claudeResponse.status}`);
    }

    const claudeData = await claudeResponse.json();
    const extractedText = claudeData.content[0].text;
    
    console.log('Claude extraction response:', extractedText);

    // Parse the extracted JSON
    let memoryDetails: MemoryDetails;
    try {
      // Remove any markdown formatting
      const jsonText = extractedText.replace(/```json\n?|\n?```/g, '').trim();
      memoryDetails = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError);
      throw new Error('Failed to extract structured memory details');
    }

    // Create a memory record
    const memoryText = conversation.split('MeetCute:').pop()?.trim() || conversation;
    
    const { data: newMemory, error: memoryError } = await supabase
      .from('memories')
      .insert({
        user_id: userId,
        description: memoryText,
        location: memoryDetails.location,
        extracted_location: memoryDetails.location,
        extracted_time_period: memoryDetails.time_period,
        extracted_details: memoryDetails,
        timestamp: new Date().toISOString(),
        processed: true
      })
      .select()
      .single();

    if (memoryError) {
      console.error('Error creating memory:', memoryError);
      throw new Error('Failed to save memory');
    }

    console.log('Created memory:', newMemory.id);

    // Now find potential matches
    const { data: otherMemories, error: searchError } = await supabase
      .from('memories')
      .select('*, profiles!inner(first_name, last_name)')
      .neq('user_id', userId)
      .eq('processed', true);

    if (searchError) {
      console.error('Error searching memories:', searchError);
      throw new Error('Failed to search for matches');
    }

    console.log(`Found ${otherMemories?.length || 0} other memories to analyze`);

    const potentialMatches = [];

    for (const otherMemory of otherMemories || []) {
      const matchPrompt = `
        Analyze these two missed connection memories to determine if they could be describing the same event from different perspectives.

        Memory 1 (from User A):
        Location: ${memoryDetails.location || 'not specified'}
        Time: ${memoryDetails.time_period || 'not specified'}
        Details: ${JSON.stringify(memoryDetails)}
        Description: ${memoryText}

        Memory 2 (from User B):
        Location: ${otherMemory.extracted_location || 'not specified'}
        Time: ${otherMemory.extracted_time_period || 'not specified'}
        Details: ${JSON.stringify(otherMemory.extracted_details || {})}
        Description: ${otherMemory.description}

        Respond with ONLY a JSON object:
        {
          "is_match": true/false,
          "confidence": 0.0-1.0,
          "reason": "brief explanation of why this could be a match"
        }

        Consider matches when:
        - Same or very similar location and timeframe
        - Complementary descriptions (one person's description matches the other's appearance)
        - Compatible circumstances
        - One person's clothing matches what the other remembers
      `;

      try {
        const matchResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': Deno.env.get('ANTHROPIC_API_KEY')!,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 500,
            messages: [
              { role: 'user', content: matchPrompt }
            ]
          })
        });

        if (matchResponse.ok) {
          const matchData = await matchResponse.json();
          const matchText = matchData.content[0].text.replace(/```json\n?|\n?```/g, '').trim();
          const matchResult = JSON.parse(matchText);

          if (matchResult.is_match && matchResult.confidence > 0.6) {
            console.log(`Found potential match with confidence ${matchResult.confidence}`);
            
            // Create match record
            const { error: matchError } = await supabase
              .from('matches')
              .insert({
                memory1_id: newMemory.id,
                memory2_id: otherMemory.id,
                user1_id: userId,
                user2_id: otherMemory.user_id,
                confidence_score: matchResult.confidence,
                match_reason: matchResult.reason,
                status: 'pending'
              });

            if (!matchError) {
              potentialMatches.push({
                memory_id: otherMemory.id,
                other_user: otherMemory.profiles,
                confidence: matchResult.confidence,
                reason: matchResult.reason
              });
            }
          }
        }
      } catch (matchError) {
        console.error('Error analyzing potential match:', matchError);
        // Continue with other memories
      }
    }

    console.log(`Created ${potentialMatches.length} potential matches`);

    return new Response(JSON.stringify({
      success: true,
      memory_id: newMemory.id,
      extracted_details: memoryDetails,
      potential_matches: potentialMatches.length,
      matches: potentialMatches
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in memory-processor function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});