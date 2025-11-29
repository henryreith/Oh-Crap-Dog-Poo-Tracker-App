import "jsr:@supabase/functions-js/edge-runtime.d.ts"

Deno.serve(async (req) => {
  try {
    const { photo_url, consistency_score, colour_code, notes } = await req.json();

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API Key not configured in Supabase secrets.");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a veterinary AI expert specializing in canine digestive health. Analyze the dog poo image and provided metadata. 
            Return ONLY valid JSON matching the requested structure. Do not include markdown formatting.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this dog poo.
                Context:
                - User Consistency Score (1-5): ${consistency_score}
                - User Color Selection: ${colour_code}
                - User Notes: ${notes}

                Return a JSON object with this EXACT structure:
                {
                  "poo_analysis": {
                    "classification": "string (e.g. Healthy, Well-Formed)",
                    "score": number (0-10, 10 being perfect),
                    "gut_health_summary": "string (2-3 sentences)",
                    "details": {
                      "shape": { "description": "string", "signals": ["string"] },
                      "texture": { "description": "string", "possible_interpretations": ["string"] },
                      "color": { "description": "string", "possible_interpretations": ["string"] },
                      "moisture": { "description": "string", "signals": ["string"] },
                      "parasite_check": { "visible_signs": "string", "notes": "string" }
                    },
                    "potential_flags": {
                      "none_major": boolean,
                      "minor_observations": ["string"]
                    },
                    "recommendations": ["string"],
                    "confidence_score": number (0-1)
                  }
                }`
              },
              {
                type: "image_url",
                image_url: {
                  url: photo_url,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });

    const aiData = await response.json();
    
    if (aiData.error) {
      throw new Error(`OpenAI Error: ${aiData.error.message}`);
    }

    const content = aiData.choices[0].message.content;
    // Clean up potential markdown code blocks if GPT adds them
    const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsedResult = JSON.parse(cleanContent);
    const analysis = parsedResult.poo_analysis;

    // Transform to match the App's expected schema
    const mappedData = {
      poo_analysis: {
        classification: analysis.classification,
        health_score: Math.round(analysis.score * 10), // Convert 0-10 to 0-100
        gut_health_summary: analysis.gut_health_summary,
        detailed_breakdown: analysis.details, // Map 'details' to 'detailed_breakdown'
        flags_and_observations: analysis.potential_flags.minor_observations,
        actionable_recommendations: analysis.recommendations,
        vet_flag: !analysis.potential_flags.none_major,
        confidence_score: analysis.confidence_score
      }
    };

    return new Response(
      JSON.stringify(mappedData),
      { headers: { "Content-Type": "application/json" } },
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
})
