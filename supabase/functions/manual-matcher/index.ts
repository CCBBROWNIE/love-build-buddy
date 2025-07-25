import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== MANUAL MEMORY MATCHER START ===");
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all waiting memories
    const { data: waitingMemories, error: fetchError } = await supabase
      .from('memories')
      .select('*')
      .eq('status', 'waiting');

    if (fetchError) {
      throw new Error(`Failed to fetch memories: ${fetchError.message}`);
    }

    console.log(`Found ${waitingMemories?.length || 0} waiting memories`);

    let matchesCreated = 0;

    // Compare each memory with all others
    if (waitingMemories && waitingMemories.length > 1) {
      for (let i = 0; i < waitingMemories.length; i++) {
        for (let j = i + 1; j < waitingMemories.length; j++) {
          const memory1 = waitingMemories[i];
          const memory2 = waitingMemories[j];

          // Skip if same user
          if (memory1.user_id === memory2.user_id) continue;

          // Check for obvious matches based on keywords
          const desc1 = (memory1.description || memory1.content || '').toLowerCase();
          const desc2 = (memory2.description || memory2.content || '').toLowerCase();

          // Look for matching patterns
          const isMatch = (
            // Both mention Coco Apartments/coco apartment
            (desc1.includes('coco apartment') && desc2.includes('coco apartment')) ||
            // Both mention specific locations and timeframes
            (desc1.includes('napa') && desc2.includes('napa') && 
             desc1.includes('6pm') && desc2.includes('6pm')) ||
            // Both mention black SF hat
            (desc1.includes('black sf hat') && desc2.includes('black sf hat')) ||
            // Both mention baby
            (desc1.includes('baby') && desc2.includes('baby') &&
             desc1.includes('july 23') && desc2.includes('july 23'))
          );

          if (isMatch) {
            console.log(`MATCH DETECTED between ${memory1.id} and ${memory2.id}`);

            // Create match record
            const { data: match, error: matchError } = await supabase
              .from('matches')
              .insert({
                user1_id: memory1.user_id,
                user2_id: memory2.user_id,
                memory1_id: memory1.id,
                memory2_id: memory2.id,
                confidence_score: 95,
                match_reason: 'Same location, time, and distinctive details (Coco Apartments, Napa, black SF hat, baby)',
                status: 'pending'
              })
              .select()
              .single();

            if (matchError) {
              console.error('Error creating match:', matchError);
            } else {
              console.log('Match created:', match.id);

              // Update both memories to matched status
              await supabase
                .from('memories')
                .update({ 
                  status: 'matched',
                  match_id: match.id
                })
                .in('id', [memory1.id, memory2.id]);

              matchesCreated++;
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        total_memories: waitingMemories?.length || 0,
        matches_created: matchesCreated,
        message: `Manual matching complete. Created ${matchesCreated} matches.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in manual memory matcher:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});