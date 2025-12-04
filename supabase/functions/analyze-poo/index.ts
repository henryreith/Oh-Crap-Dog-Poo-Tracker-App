import "jsr:@supabase/functions-js/edge-runtime.d.ts";

function buildImageUrl(photo_url?: string, image_base64?: string): string {
  // 1) Prefer Base64 if available (more reliable for local-first apps, avoids public URL issues)
  if (image_base64) {
    const trimmed = String(image_base64).trim();

    // If already a data URL, use it directly
    if (trimmed.startsWith("data:")) {
      return trimmed;
    }

    // Strip any accidental prefix before "base64,"
    const base64Part = trimmed.includes("base64,")
      ? trimmed.split("base64,").pop()!
      : trimmed;

    // Build a proper data URL (jpeg is a sane default for most camera images)
    return `data:image/jpeg;base64,${base64Part}`;
  }

  // 2) Fallback to photo_url
  if (photo_url) {
    const trimmed = String(photo_url).trim();

    // Already a data URL or http(s) URL, just return it
    if (trimmed.startsWith("data:") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }

    // If it looks like a Supabase storage path, try to prefix with SUPABASE_URL
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    if (SUPABASE_URL && (trimmed.startsWith("storage/") || trimmed.startsWith("object/public/"))) {
      // Adjust this prefix if your paths differ
      return `${SUPABASE_URL}/${trimmed.replace(/^\/+/, "")}`;
    }

    // Fallback, return as-is (OpenAI will accept any valid URL)
    return trimmed;
  }

  // 3) Nothing at all
  throw new Error("No image provided to buildImageUrl");
}

Deno.serve(async (req) => {
  try {
    const { photo_url, image_base64, consistency_score, colour_code, notes } =
      await req.json();

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API Key not configured in Supabase secrets.");
    }

    let imageUrl: string;
    try {
      imageUrl = buildImageUrl(photo_url, image_base64);
    } catch (e) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        max_completion_tokens: 2000,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `
You are a veterinary AI assistant specializing in canine digestive health.
This analysis is used inside a Dog Poop Tracking module within a full dog life tracking application for dog owners.

CRITICAL RULES:
- You must ALWAYS return valid JSON.
- Do NOT include markdown.
- **STRICTLY CHECK IF THE IMAGE IS DOG POO.**
- If the image is clearly NOT dog poo (e.g. a car, a person, a blank screen, a dog's face, random object), you MUST classify it as "Not Poo / Unknown" and set "confidence_score" to 0.
- If the image is blurry, dark, or imperfect, DO YOUR BEST to analyze it. Lower the confidence_score (e.g. 0.4-0.7) to reflect the quality issues, but do not reject it unless it is unrecognizable.
- Do NOT diagnose disease.
- This is educational only.
- Recommend a licensed veterinarian if serious symptoms may be present.

SCORING PRECISION RULES:
- Avoid rounded or generic scores like 7, 8, 80.
- Use the full 0–10 scale with decimal accuracy if helpful (for example 6.3, 8.7).
- Base the score strictly on what is visible: shape, texture, colour, moisture, and visible anomalies.
- Two visually different stools should NOT receive the same score.

HYDRATION ESTIMATE RULES:
- Estimate "hydration_level" as a percentage from 0 to 100.
- 100 means "Optimally hydrated stool" (moist, good texture).
- 0 means "Extremely dry/dehydrated stool" (hard, dry, crumbly).
- Base it mainly on moisture, texture and, secondarily, colour.
- This estimate is about this specific stool only.

You must analyze what is ACTUALLY visible in the image, not what a textbook "ideal" stool looks like.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this dog poo.

Context:
- User Consistency Score (1–5): ${consistency_score}
- User Color Selection: ${colour_code}
- User Notes: ${notes}

Return a JSON object with this EXACT structure:
{
  "poo_analysis": {
    "classification": "string (for example Healthy, Soft, Diarrhoea-like, Not Poo / Unknown)",
    "score": number (0–10),
    "gut_health_summary": "string (2–3 sentences, plain language)",
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
    "hydration_estimate": {
      "hydration_level": number (0–100),
      "interpretation": "string (e.g. 'Well hydrated', 'Slightly dry', 'Dehydrated')"
    },
    "confidence_score": number (0–1)
  }
}`,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
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

    const content = aiData?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No content returned from OpenAI.");
    }

    let parsedResult: any;
    try {
      parsedResult = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse OpenAI response:", content);
      parsedResult = {
        poo_analysis: {
          classification: "Analysis Failed",
          score: 0,
          gut_health_summary:
            "The AI could not analyze this image. It may not be clear enough, or it might not be recognized as dog poo.",
          details: {
            shape: { description: "Unknown", signals: [] },
            texture: { description: "Unknown", possible_interpretations: [] },
            colour: { description: "Unknown", possible_interpretations: [] },
            moisture_and_hydration: { description: "Unknown", signals: [] },
            parasite_check: {
              visible_signs: "None",
              notes: "Could not analyze",
            },
          },
          potential_flags: {
            none_major: false,
            minor_observations: [],
          },
          hydration_estimate: {
            dehydration_likelihood_percent: 0,
            interpretation:
              "Unknown, no reliable hydration estimate available for this image.",
          },
          recommendations: [
            "Try taking a clearer photo",
            "Ensure the photo is of dog poo",
            "Consult a veterinarian if you have health concerns about your dog",
          ],
          confidence_score: 0,
        },
      };
    }

    const analysis = parsedResult.poo_analysis || {};

    // Clamp confidence_score
    if (
      typeof analysis.confidence_score !== "number" ||
      analysis.confidence_score < 0 ||
      analysis.confidence_score > 1
    ) {
      analysis.confidence_score = 0.3;
    }

    // Ensure details object exists
    analysis.details = analysis.details || {};
    const details = analysis.details;

    // Ensure hydration estimate exists and is within 0–100
    if (!analysis.hydration_estimate) {
      analysis.hydration_estimate = {
        hydration_level: 0,
        interpretation: "No hydration estimate provided.",
      };
    }
    if (
      typeof analysis.hydration_estimate.hydration_level !==
      "number"
    ) {
      analysis.hydration_estimate.hydration_level = 0;
    }
    analysis.hydration_estimate.hydration_level = Math.min(
      100,
      Math.max(
        0,
        analysis.hydration_estimate.hydration_level,
      ),
    );

    analysis.potential_flags = analysis.potential_flags || {
      none_major: true,
      minor_observations: [],
    };

    analysis.recommendations = analysis.recommendations || [];

    const rawScore =
      typeof analysis.score === "number" ? analysis.score : 0;

    const mappedData = {
      poo_analysis: {
        classification: analysis.classification || "Unknown",
        // 0–10 => 0–100 integer score
        health_score: Math.round(Math.min(10, Math.max(0, rawScore)) * 10),
        gut_health_summary:
          analysis.gut_health_summary ||
          "No summary available for this stool.",
        detailed_breakdown: {
          shape: details.shape || {
            description: "Unknown",
            signals: [],
          },
          texture: details.texture || {
            description: "Unknown",
            possible_interpretations: [],
          },
          colour:
            details.colour ||
            details.color || {
              description: "Unknown",
              possible_interpretations: [],
            },
          moisture_and_hydration:
            details.moisture_and_hydration ||
            details.moisture || {
              description: "Unknown",
              signals: [],
            },
          parasite_check:
            details.parasite_check || {
              visible_signs: "None",
              notes: "Not evaluated",
            },
        },
        hydration_estimate: {
          hydration_level:
            analysis.hydration_estimate.hydration_level,
          interpretation: analysis.hydration_estimate.interpretation,
        },
        flags_and_observations:
          analysis.potential_flags.minor_observations || [],
        vet_flag: !analysis.potential_flags.none_major,
        confidence_score: analysis.confidence_score,
      },
    };

    return new Response(JSON.stringify(mappedData), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Edge function error:", error);
    // Return 200 with error field so client can read the message
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});
