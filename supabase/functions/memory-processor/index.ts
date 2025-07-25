import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY', 
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';",
};

// Get client IP address from request headers
function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const cfIP = req.headers.get('cf-connecting-ip');
  
  return cfIP || realIP || forwarded?.split(',')[0]?.trim() || 'unknown';
}

// Validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Sanitize text content
function sanitizeText(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim().substring(0, 5000);
}

// Log security event
async function logSecurityEvent(
  supabase: any,
  eventType: string,
  userId: string | null,
  ipAddress: string,
  userAgent: string | null,
  metadata: Record<string, any>,
  severity: string = 'medium'
): Promise<void> {
  try {
    await supabase.rpc('log_security_event', {
      p_event_type: eventType,
      p_user_id: userId,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_metadata: metadata,
      p_severity: severity,
      p_source: 'edge_function'
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

// Check rate limiting
async function checkRateLimit(supabase: any, identifier: string, actionType: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_action_type: actionType,
      p_max_attempts: 10, // Higher limit for memory processing
      p_window_minutes: 60
    });

    if (error) {
      console.error('Rate limit check error:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Rate limit check exception:', error);
    return false;
  }
}

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
  const startTime = Date.now();
  const clientIP = getClientIP(req);
  const userAgent = req.headers.get('user-agent') || 'unknown';
  
  console.log("=== MEMORY PROCESSOR START ===");
  console.log("Method:", req.method);
  console.log("Client IP:", clientIP);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client first for logging
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  
  console.log("Supabase URL exists:", !!supabaseUrl);
  console.log("Supabase Key exists:", !!supabaseKey);
  console.log("Anthropic Key exists:", !!anthropicKey);
  console.log("Anthropic Key length:", anthropicKey?.length || 0);
  
  if (!anthropicKey) {
    console.error("ANTHROPIC_API_KEY not found");
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured', success: false }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Only allow POST requests
  if (req.method !== 'POST') {
    await logSecurityEvent(
      supabase,
      'invalid_method_memory_processor',
      null,
      clientIP,
      userAgent,
      { method: req.method },
      'medium'
    );
    
    return new Response(
      JSON.stringify({ error: 'Method not allowed', success: false }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  let conversation: string;
  let userId: string;

  try {
    // Validate content type
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid content type');
    }

    // Parse and validate request body
    const body = await req.json();
    
    if (!body || typeof body !== 'object') {
      throw new Error('Invalid request body');
    }

    ({ conversation, userId } = body);
    
    // Input validation
    if (!conversation || !userId) {
      throw new Error('Missing conversation or userId');
    }

    if (typeof conversation !== 'string' || typeof userId !== 'string') {
      throw new Error('Conversation and userId must be strings');
    }

    // Validate userId format
    if (!isValidUUID(userId)) {
      await logSecurityEvent(
        supabase,
        'invalid_user_id_format',
        null,
        clientIP,
        userAgent,
        { userId },
        'high'
      );
      throw new Error('Invalid user ID format');
    }

    // Sanitize conversation text
    conversation = sanitizeText(conversation);
    
    if (conversation.length < 50) {
      throw new Error('Conversation too short for processing');
    }

    // Check rate limiting by user
    const userAllowed = await checkRateLimit(supabase, userId, 'memory_processing');
    if (!userAllowed) {
      await logSecurityEvent(
        supabase,
        'rate_limit_exceeded_memory',
        userId,
        clientIP,
        userAgent,
        { limitType: 'user' },
        'high'
      );
      
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.',
          success: false 
        }),
        {
          status: 429,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': '3600'
          },
        }
      );
    }

    // Check rate limiting by IP
    const ipAllowed = await checkRateLimit(supabase, clientIP, 'memory_processing_ip');
    if (!ipAllowed) {
      await logSecurityEvent(
        supabase,
        'rate_limit_exceeded_memory',
        userId,
        clientIP,
        userAgent,
        { limitType: 'ip' },
        'high'
      );
      
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.',
          success: false 
        }),
        {
          status: 429,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': '3600'
          },
        }
      );
    }

    console.log('Processing memory for user:', userId);

    // Log memory processing start
    await logSecurityEvent(
      supabase,
      'memory_processing_started',
      userId,
      clientIP,
      userAgent,
      { conversationLength: conversation.length },
      'low'
    );

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

    console.log("Calling Anthropic API for memory extraction...");
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': anthropicKey!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          { role: 'user', content: extractionPrompt }
        ]
      })
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error('Anthropic API error:', errorText);
      throw new Error(`Anthropic API error: ${claudeResponse.status} - ${errorText}`);
    }

    const claudeData = await claudeResponse.json();
    console.log("Raw Anthropic response:", claudeData);

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

    // Log successful processing
    await logSecurityEvent(
      supabase,
      'memory_processing_completed',
      userId,
      clientIP,
      userAgent,
      { 
        memoryId: newMemory.id,
        potentialMatches: potentialMatches.length,
        processingTime: Date.now() - startTime
      },
      'low'
    );

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
    // Log security event for errors
    await logSecurityEvent(
      supabase,
      'memory_processing_error',
      userId || null,
      clientIP,
      userAgent,
      { 
        error: error.message,
        processingTime: Date.now() - startTime,
        conversationLength: conversation?.length || 0
      },
      'medium'
    );

    console.error('Error in memory-processor function:', error);
    
    // Don't expose internal error details
    const isValidationError = error.message.includes('Invalid') || 
                              error.message.includes('Missing') ||
                              error.message.includes('too short') ||
                              error.message.includes('format');
    
    return new Response(JSON.stringify({ 
      success: false,
      error: isValidationError ? error.message : 'Failed to process memory'
    }), {
      status: isValidationError ? 400 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});