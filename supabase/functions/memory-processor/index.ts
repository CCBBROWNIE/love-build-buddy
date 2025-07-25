import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

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
    const { conversation, userId } = await req.json();

    console.log('Processing memory for user:', userId);
    console.log('Conversation length:', conversation?.length || 0);

    if (!conversation || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing conversation or userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract key information from the conversation
    // Look for patterns like location, time, activities, etc.
    const description = conversation.substring(0, 500); // Limit description length
    
    // Simple extraction logic (this could be enhanced with AI later)
    let extractedLocation = null;
    let extractedTimePeriod = null;
    
    // Look for common location patterns
    const locationPatterns = [
      /at (the )?([A-Z][a-z]+ [A-Z][a-z]+|[A-Z][a-z]+)/g,
      /in ([A-Z][a-z]+ [A-Z][a-z]+|[A-Z][a-z]+)/g,
      /near (the )?([A-Z][a-z]+ [A-Z][a-z]+|[A-Z][a-z]+)/g
    ];
    
    for (const pattern of locationPatterns) {
      const match = conversation.match(pattern);
      if (match) {
        extractedLocation = match[0];
        break;
      }
    }
    
    // Look for time patterns
    const timePatterns = [
      /yesterday/i,
      /today/i,
      /last week/i,
      /this morning/i,
      /this afternoon/i,
      /this evening/i,
      /around \d{1,2}(:\d{2})?\s?(am|pm|AM|PM)/g
    ];
    
    for (const pattern of timePatterns) {
      const match = conversation.match(pattern);
      if (match) {
        extractedTimePeriod = match[0];
        break;
      }
    }

    // Save the memory to the database
    const { data: memory, error: insertError } = await supabase
      .from('memories')
      .insert({
        user_id: userId,
        description: description,
        content: conversation,
        timestamp: new Date().toISOString(),
        extracted_location: extractedLocation,
        extracted_time_period: extractedTimePeriod,
        status: 'waiting',
        processed: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving memory:', insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Memory saved successfully:', memory.id);

    // Automatically trigger memory matching
    try {
      const matchResponse = await fetch(`${supabaseUrl}/functions/v1/memory-matcher`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memory_text: conversation,
          user_id: userId,
          location: extractedLocation,
          time_period: extractedTimePeriod
        })
      });

      if (matchResponse.ok) {
        const matchResult = await matchResponse.json();
        console.log('Memory matching completed:', matchResult);
        
        if (matchResult.matches_found > 0) {
          // Update memory status to matched if matches were found
          await supabase
            .from('memories')
            .update({ status: 'matched' })
            .eq('id', memory.id);
        }
      }
    } catch (matchError) {
      console.error('Error during memory matching:', matchError);
      // Don't fail the whole request if matching fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        memory: memory,
        extracted: {
          location: extractedLocation,
          timePeriod: extractedTimePeriod
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in memory-processor function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});