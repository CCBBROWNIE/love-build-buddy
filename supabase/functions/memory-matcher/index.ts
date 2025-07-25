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
    console.log("=== MEMORY MATCHER START ===");
    const { memory_text, user_id, location, time_period } = await req.json();
    
    const openai_key = Deno.env.get('OPENAI_API_KEY');
    const supabase_url = Deno.env.get('SUPABASE_URL');
    const supabase_key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!openai_key || !supabase_url || !supabase_key) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabase_url, supabase_key);

    // Step 1: Generate embedding for the new memory
    console.log("Generating embedding for memory...");
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openai_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: memory_text,
        model: 'text-embedding-3-small'
      })
    });

    if (!embeddingResponse.ok) {
      throw new Error(`Embedding API error: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;
    console.log("Generated embedding, length:", embedding.length);

    // Step 2: Store the memory with embedding
    const { data: memoryData, error: memoryError } = await supabase
      .from('memories')
      .insert({
        user_id,
        content: memory_text,
        location,
        time_period,
        embedding,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (memoryError) {
      console.error('Error storing memory:', memoryError);
      throw new Error(`Failed to store memory: ${memoryError.message}`);
    }

    console.log("Memory stored with ID:", memoryData.id);

    // Step 3: Find similar memories using cosine similarity
    console.log("Searching for similar memories...");
    
    // Get all other memories (excluding current user's memories)
    const { data: otherMemories, error: fetchError } = await supabase
      .from('memories')
      .select('id, user_id, content, location, time_period, embedding, created_at')
      .neq('user_id', user_id);

    if (fetchError) {
      console.error('Error fetching memories:', fetchError);
      throw new Error(`Failed to fetch memories: ${fetchError.message}`);
    }

    console.log(`Found ${otherMemories?.length || 0} other memories to compare`);

    // Calculate cosine similarity for each memory
    const matches = [];
    const threshold = 0.85; // High similarity threshold

    if (otherMemories) {
      for (const otherMemory of otherMemories) {
        if (otherMemory.embedding) {
          const similarity = cosineSimilarity(embedding, otherMemory.embedding);
          console.log(`Similarity with memory ${otherMemory.id}: ${similarity}`);
          
          if (similarity > threshold) {
            matches.push({
              memory_id: otherMemory.id,
              user_id: otherMemory.user_id,
              content: otherMemory.content,
              location: otherMemory.location,
              time_period: otherMemory.time_period,
              similarity_score: similarity,
              created_at: otherMemory.created_at
            });
          }
        }
      }
    }

    console.log(`Found ${matches.length} potential matches above threshold ${threshold}`);

    // Step 4: If matches found, create match records and send notifications
    if (matches.length > 0) {
      for (const match of matches) {
        // Store the match in database
        await supabase
          .from('memory_matches')
          .insert({
            memory1_id: memoryData.id,
            memory2_id: match.memory_id,
            user1_id: user_id,
            user2_id: match.user_id,
            similarity_score: match.similarity_score,
            status: 'pending',
            created_at: new Date().toISOString()
          });

        console.log(`Match recorded between users ${user_id} and ${match.user_id}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        memory_id: memoryData.id,
        matches_found: matches.length,
        matches: matches.map(m => ({
          similarity_score: m.similarity_score,
          location: m.location,
          time_period: m.time_period
        }))
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in memory-matcher:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Helper function to calculate cosine similarity between two vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}