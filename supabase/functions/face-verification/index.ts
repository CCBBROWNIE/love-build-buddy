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
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId } = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's profile photo and verification selfie URLs
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('profile_photo_url, verification_selfie_url')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    if (!profile.profile_photo_url || !profile.verification_selfie_url) {
      return new Response(
        JSON.stringify({ 
          verified: false, 
          error: 'Both profile photo and verification selfie are required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Comparing images for user:', userId);

    // Fetch both images and convert to base64
    const [profileImageResponse, selfieImageResponse] = await Promise.all([
      fetch(profile.profile_photo_url),
      fetch(profile.verification_selfie_url)
    ]);

    if (!profileImageResponse.ok || !selfieImageResponse.ok) {
      throw new Error('Failed to fetch images for comparison');
    }

    const profileImageBuffer = await profileImageResponse.arrayBuffer();
    const selfieImageBuffer = await selfieImageResponse.arrayBuffer();

    const profileImageBase64 = btoa(String.fromCharCode(...new Uint8Array(profileImageBuffer)));
    const selfieImageBase64 = btoa(String.fromCharCode(...new Uint8Array(selfieImageBuffer)));

    // Get content types
    const profileContentType = profileImageResponse.headers.get('content-type') || 'image/jpeg';
    const selfieContentType = selfieImageResponse.headers.get('content-type') || 'image/jpeg';

    // Use OpenAI's vision model to compare the two images
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a facial verification expert. Compare the two images and determine if they show the same person. 
            
            Respond with a JSON object containing:
            - "match": boolean (true if same person, false if different people)
            - "confidence": number between 0-100 (confidence percentage)
            - "reasoning": string (brief explanation of your decision)
            
            Be very careful and conservative. Only return true if you are highly confident it's the same person. Consider factors like facial structure, eye shape, nose, mouth, and overall facial geometry.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please compare these two images and determine if they show the same person. The first image is the profile photo, the second is the verification selfie.'
              },
              {
                type: 'image_url',
                image_url: { 
                  url: `data:${profileContentType};base64,${profileImageBase64}`
                }
              },
              {
                type: 'image_url',
                image_url: { 
                  url: `data:${selfieContentType};base64,${selfieImageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 300,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error details:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const result = data.choices[0].message.content;
    
    console.log('OpenAI response:', result);

    // Parse the JSON response from OpenAI
    let verificationResult;
    try {
      verificationResult = JSON.parse(result);
    } catch (e) {
      throw new Error('Failed to parse verification result');
    }

    // Only mark as verified if it's a high-confidence match
    const isVerified = verificationResult.match && verificationResult.confidence >= 80;

    if (isVerified) {
      // Update the user's verification status
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_verified: true })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating verification status:', updateError);
        throw updateError;
      }

      console.log('User successfully verified:', userId);
    }

    return new Response(
      JSON.stringify({
        verified: isVerified,
        confidence: verificationResult.confidence,
        reasoning: verificationResult.reasoning,
        match: verificationResult.match
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Face verification error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        verified: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});