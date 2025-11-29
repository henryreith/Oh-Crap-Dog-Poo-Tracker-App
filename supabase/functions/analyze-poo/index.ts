import "jsr:@supabase/functions-js/edge-runtime.d.ts"

Deno.serve(async (req) => {
  try {
    const { photo_url, image_base64, consistency_score, colour_code, notes } = await req.json();

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
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a veterinary AI expert specializing in canine digestive health. Analyze the dog poo image and provided metadata. 
            
            CRITICAL: You must ALWAYS return valid JSON, even if the image is not dog poo or you cannot analyze it.
            If the image is not dog poo (e.g. a car, a person, a random object), return the JSON with:
            - "classification": "Not Poo / Unknown"
            - "score": 0
            - "confidence_score": 0
            - "gut_health_summary": "This image does not appear to be dog poo. Please upload a clear photo of dog waste for analysis."
            
            Do not include markdown formatting (no \`\`\`json). Return raw JSON only.`
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
                      "colour": { "description": "string", "possible_interpretations": ["string"] },
                      "moisture_and_hydration": { "description": "string", "signals": ["string"] },
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
                  url: image_base64 || photo_url,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API Error (${response.status}): ${errText}`);
    }

    const aiData = await response.json();
    
    if (aiData.error) {
      throw new Error(`OpenAI Error: ${aiData.error.message}`);
    }

    const content = aiData.choices[0].message.content;
    // Clean up potential markdown code blocks if GPT adds them
    const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
    
    let parsedResult;
    try {
      parsedResult = JSON.parse(cleanContent);
    } catch (e) {
      console.error("Failed to parse OpenAI response:", cleanContent);
      // Fallback for non-JSON responses (e.g. refusals)
      parsedResult = {
        poo_analysis: {
          classification: "Analysis Failed",
          score: 0,
          gut_health_summary: "The AI could not analyze this image. It may not be clear enough, or it might not be recognized as dog poo.",
          details: {
            shape: { description: "Unknown", signals: [] },
            texture: { description: "Unknown", possible_interpretations: [] },
            colour: { description: "Unknown", possible_interpretations: [] },
            moisture_and_hydration: { description: "Unknown", signals: [] },
            parasite_check: { visible_signs: "None", notes: "Could not analyze" }
          },
          potential_flags: { none_major: false, minor_observations: [] },
          recommendations: ["Try taking a clearer photo", "Ensure the photo is of dog poo"],
          confidence_score: 0
        }
      };
    }

    const analysis = parsedResult.poo_analysis;

    // Transform to match the App's expected schema
    const mappedData = {
      poo_analysis: {
        classification: analysis.classification,
        health_score: Math.round(analysis.score * 10), // Convert 0-10 to 0-100
        gut_health_summary: analysis.gut_health_summary,
        detailed_breakdown: {
          shape: analysis.details.shape,
          texture: analysis.details.texture,
          colour: analysis.details.colour || analysis.details.color,
          moisture_and_hydration: analysis.details.moisture_and_hydration || analysis.details.moisture,
          parasite_check: analysis.details.parasite_check
        },
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
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
})
