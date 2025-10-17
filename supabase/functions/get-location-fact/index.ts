import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lng } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Fetching fact for location: ${lat}, ${lng}`);

    // First, get a fun fact about the location
    const factResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a fun and engaging geography expert. Provide interesting, unique facts about locations. Always return facts in this exact JSON format: {"fact": "the fact text", "placeName": "name of the place", "distance": 0}. If the exact coordinates don\'t have a famous place, find the nearest interesting location and include the distance in kilometers.'
          },
          {
            role: 'user',
            content: `Give me one fascinating, unique fun fact about the location at coordinates ${lat}, ${lng}. If this exact location doesn't have a notable landmark or interesting fact, find the nearest famous or interesting place and tell me about it. Include the distance from the original coordinates if it's different. Make it engaging and educational!`
          }
        ],
      }),
    });

    if (!factResponse.ok) {
      const errorText = await factResponse.text();
      console.error('AI gateway error:', factResponse.status, errorText);
      throw new Error('Failed to get location fact');
    }

    const factData = await factResponse.json();
    const factText = factData.choices[0].message.content;
    
    // Parse the JSON response
    let parsedFact;
    try {
      parsedFact = JSON.parse(factText);
    } catch {
      // Fallback if AI doesn't return proper JSON
      parsedFact = {
        fact: factText,
        placeName: 'This Location',
        distance: 0
      };
    }

    // Now generate an image related to the location
    const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: `Generate a beautiful, photorealistic image of ${parsedFact.placeName}. The image should be vibrant and capture the essence of this location.`
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    let imageUrl = null;
    if (imageResponse.ok) {
      const imageData = await imageResponse.json();
      imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    }

    return new Response(
      JSON.stringify({
        fact: parsedFact.fact,
        placeName: parsedFact.placeName,
        distance: parsedFact.distance,
        imageUrl: imageUrl,
        coordinates: { lat, lng }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
