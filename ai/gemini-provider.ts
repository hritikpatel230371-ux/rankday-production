import { GroqProvider } from "@/ai/groq-provider";
import type { AIProvider, InsightInput, ReelInput } from "@/ai/provider";
import {
  aiDailyLogSchema,
  aiInsightsResponseSchema,
  aiReelResponseSchema,
  type AIDailyLog
} from "@/validation/ai";
import { AIProviderError } from "@/ai/errors";
import { ZodError, z, type ZodTypeAny } from "zod";

export class GeminiProvider implements AIProvider {
  private apiKey: string;

  constructor(apiKey = process.env.GEMINI_API_KEY || "") {
    this.apiKey = apiKey;
  }

  private async generateJson(prompt: string) {
    if (!this.apiKey) {
      throw new AIProviderError(
        "GEMINI_KEY_MISSING",
        503,
        "Gemini is selected but GEMINI_API_KEY is not configured. Add it to .env.local and restart the development server."
      );
    }

    const defaultModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const modelsToTry = Array.from(new Set([defaultModel, "gemini-3-flash-preview", "gemini-3.1-flash-lite", "gemini-3.8-flash"]));

    let response: Response | undefined;
    for (const model of modelsToTry) {
      try {
        const candidateResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
          signal: AbortSignal.timeout(30_000),
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.3,
              maxOutputTokens: 8192
            }
          })
        });

        if ((candidateResponse.status === 404 || candidateResponse.status === 503) && model !== modelsToTry[modelsToTry.length - 1]) {
          continue;
        }

        response = candidateResponse;
        break;
      } catch (error) {
        if (model === modelsToTry[modelsToTry.length - 1]) {
          if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
            throw new AIProviderError("GEMINI_TIMEOUT", 504, "Gemini did not respond in time. Please try again.");
          }
          throw new AIProviderError("GEMINI_UNREACHABLE", 502, "RankDay could not reach Gemini. Check your connection and try again.");
        }
      }
    }

    if (!response || !response.ok) {
      if (process.env.GROQ_API_KEY?.trim()) {
        try {
          console.warn(`[GeminiProvider] Gemini ${response ? `status ${response.status}` : "unreachable"}. Falling back to Groq (Llama 3.1)...`);
          const groq = new GroqProvider();
          return await groq.generateJson(prompt);
        } catch (groqErr) {
          console.error("[GeminiProvider] Groq fallback error:", groqErr);
        }
      }
    }

    if (!response) {
      throw new AIProviderError("GEMINI_UNREACHABLE", 502, "RankDay could not reach Gemini. Check your connection and try again.");
    }

    if (!response.ok) {
      const status = response.status;
      if (status === 401 || status === 403) {
        throw new AIProviderError("GEMINI_AUTH", 502, "Gemini rejected the API key. Verify that it is valid and enabled for the Gemini API.");
      }
      if (status === 429) {
        throw new AIProviderError("GEMINI_QUOTA", 503, "Gemini's rate limit or quota was reached. Check your Gemini quota or try again later.");
      }
      if (status === 404) {
        throw new AIProviderError("GEMINI_MODEL", 502, "The configured Gemini model is unavailable. Check model access and try again.");
      }
      throw new AIProviderError(
        "GEMINI_REQUEST",
        status >= 500 ? 503 : 502,
        status >= 500
          ? "Gemini is temporarily unavailable. Please try again later."
          : "Gemini rejected the request. Check the configured model and request options."
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new AIProviderError("GEMINI_INVALID_JSON", 502, "Gemini returned an invalid response. Please try again.");
    }
    const text = typeof payload === "object" && payload !== null && "candidates" in payload
      ? (payload.candidates as Array<{ content?: { parts?: Array<{ text?: unknown }> } }> | undefined)?.[0]
        ?.content?.parts?.map((part) => part.text)
        .filter((part): part is string => typeof part === "string")
        .join("")
      : undefined;
    if (!text) {
      throw new AIProviderError("GEMINI_EMPTY_RESPONSE", 502, "Gemini returned no script content. Please try again.");
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new AIProviderError("GEMINI_INVALID_RESPONSE", 502, "Gemini returned a response in an unexpected format. Please try again.");
    }
  }

  private parseOutput<Schema extends ZodTypeAny>(schema: Schema, value: unknown): z.output<Schema> {
    try {
      return schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("[GeminiProvider] Schema validation failed:", JSON.stringify(error.flatten(), null, 2));
        console.error("[GeminiProvider] Raw value received:", JSON.stringify(value, null, 2));
        throw new AIProviderError("GEMINI_SCHEMA", 502, "Gemini returned content that did not match RankDay's expected format. Please try again.");
      }
      throw error;
    }
  }

  async analyzeDailyLog(text: string): Promise<AIDailyLog> {
    const prompt = `You are a productivity analysis parser for RankDay. Extract all activities, completed tasks, goals, tests, and pending items explicitly mentioned in this daily reflection log.

Output MUST be a JSON object with this exact structure:
{
  "activities": [
    {
      "title": "Studied DBMS",
      "category": "Education",
      "subject": "DBMS",
      "durationMinutes": 60,
      "sentiment": "POSITIVE",
      "importance": "MEDIUM",
      "needsConfirmation": false
    }
  ],
  "goals": [
    {
      "title": "Completed Normal Forms",
      "status": "COMPLETED",
      "progressDelta": 100,
      "importance": "MEDIUM",
      "needsConfirmation": true
    }
  ],
  "tests": [
    {
      "name": "Maths Test",
      "subject": "Maths",
      "obtainedMarks": 78,
      "totalMarks": 100,
      "difficulty": 3
    }
  ],
  "syllabusUpdates": [],
  "timeWaste": [
    {
      "title": "Watched reels",
      "category": "Entertainment",
      "durationMinutes": 90,
      "sentiment": "NEGATIVE",
      "importance": "LOW"
    }
  ],
  "pendingItems": ["OS Unit 4"],
  "summary": {
    "completed": ["Normal forms revision"],
    "pending": ["OS Unit 4"],
    "bestAchievement": "Finished DBMS Unit 2",
    "mainConcern": "Wasted time on reels"
  }
}

Important Rules:
1. "title" is required for each activity. Convert "studied X for 1 hour" into title: "Studied X", durationMinutes: 60.
2. "durationMinutes" must be an integer number of minutes (1 hour = 60).
3. "sentiment" must be uppercase: "POSITIVE", "NEUTRAL", or "NEGATIVE".
4. "importance" must be uppercase: "LOW", "MEDIUM", "HIGH", or "CRITICAL".
5. Distraction or wasted time must go into "timeWaste" with sentiment "NEGATIVE".

User daily log:
${text}`;
    try {
      const json = await this.generateJson(prompt);
      return this.parseOutput(aiDailyLogSchema, json);
    } catch (err) {
      if (process.env.GROQ_API_KEY?.trim()) {
        try {
          console.warn("[GeminiProvider] analyzeDailyLog failed with Gemini. Falling back to Groq...");
          const groq = new GroqProvider();
          return await groq.analyzeDailyLog(text);
        } catch (groqErr) {
          console.error("[GeminiProvider] Groq fallback also failed:", groqErr);
        }
      }
      throw err;
    }
  }

  async generateInsights(input: InsightInput) {
    const json = await this.generateJson(`Generate 3 short, kind, non-shaming productivity insights from these stored facts only. Return {"insights": string[]}.\n${JSON.stringify(input)}`);
    return this.parseOutput(aiInsightsResponseSchema, json).insights;
  }

  async generateReelScript(input: ReelInput) {
    const prompt = `You are a world-class viral short-form video director and scriptwriter specializing in high-retention Instagram Reels, YouTube Shorts, and TikToks (30-60 seconds).

Generate the MOST DETAILED, COMPREHENSIVE, MAXIMUM-LENGTH production storyboard and script possible based on these real user productivity facts. Do NOT give brief summaries—provide an exhaustive, professional creator blueprint with word-for-word dialogue, camera choreography, sound design, and a full caption.

Context & Facts:
- Range: ${input.rangeLabel}
- Tone / Aesthetic: ${input.tone || "natural"}
- Recorded Facts:
${input.facts.map((f) => `  * ${f}`).join("\n")}

Respond strictly as a JSON object: {"script": "..."}.
Inside the "script" string, structure your output with rich markdown headings, timestamps, and bullet points covering all 6 mandatory sections:

---
🎬 **SECTION 1: SOUNDTRACK & AUDIO DESIGN**
- **Recommended Audio Track / Sound Style**: Exact music genre, tempo (BPM: e.g. 115-125 BPM), trending audio archetype matching the ${input.tone || "natural"} tone.
- **Audio Mix Balance**: Voiceover level (e.g. -3dB), background track ducking level (-18dB during speech).
- **SFX Sound Library**: Exact sound effects with timestamps (e.g., [SFX: Sub-bass drop at 0:01], [SFX: Paper swoosh at 0:04], [SFX: Mechanical keyboard tactile clicks], [SFX: Rank level-up chime at 0:24]).

⚡ **SECTION 2: COMPLETE TIMESTAMPED STORYBOARD & SCRIPT**
Break down the video into at least 5 distinct scenes. For EVERY single scene include:
- **Timestamp & Duration** (e.g., [0:00 - 0:03], [0:03 - 0:12], [0:12 - 0:22], [0:22 - 0:34], [0:34 - 0:45])
- **Scene Title** (Hook, The Focus Grind, The Obstacle / Distraction, The Rank & Metrics Reveal, Outro & CTA)
- **Visual & Camera Direction**: Framing (overhead 90°, over-the-shoulder 45°, punch-in macro), camera motion (slow pan, snap zoom, static locked-off), lighting atmosphere (golden hour desk lamp, moody blue monitor glow).
- **Verbatim Voiceover (VO)**: Word-for-word exact spoken script that sounds conversational, authentic, punchy, and captivating. Incorporate the recorded facts naturally.
- **On-Screen Text (OST) & Motion Graphics**: Exact capitalized captions, emojis, animation style (kinetic pop-in, typewriter, highlight stroke), and screen positioning (center-safe, bottom third).
- **B-Roll & Action Description**: What the creator physically does on screen (typing, highlighting notes, drinking iced matcha, reviewing RankDay dashboard graphs).

🎥 **SECTION 3: B-ROLL SHOT LIST & FILMING CHECKLIST**
Provide an exhaustive list of 6 to 8 specific camera shots the creator needs to film:
- Shot 1: A-Roll talking head / over-the-shoulder hook shot
- Shot 2: Macro close-up on pen on paper or mechanical keys
- Shot 3: Screen capture / screen recording of the RankDay interface & rank delta
- Shot 4: Atmospheric desk setup pan with coffee / beverage
- Shot 5: Timelapse or speed-ramp of focused study block
- Shot 6: Evening desk shutdown / shutting laptop screen

📝 **SECTION 4: COMPLETE SOCIAL MEDIA CAPTION**
- **Headline / Hook Line**: Attention-grabbing opening sentence.
- **Body Paragraphs**: 3 detailed, vulnerable, inspiring paragraphs sharing the behind-the-scenes reality of the work done in ${input.rangeLabel.toLowerCase()}, the mindset shift, and actionable advice.
- **Call-To-Action (CTA)**: Specific discussion question asking viewers to comment their current goals or study streaks.

🏷️ **SECTION 5: HIGH-REACH HASHTAG STRATEGY**
Provide 15-20 categorized hashtags:
- High-volume broad tags (#productivity #studygram #deepwork #grindset)
- Niche community tags (#studymotivation #softwareengineering #focusroutine)
- Product & lifestyle tags (#rankday #timemanagement #habitbuilding)

💡 **SECTION 6: ALGORITHM & RETENTION OPTIMIZATION TIPS**
- Pacing & cut frequency (e.g. cut every 1.5 - 2.5 seconds to maximize retention).
- Retention Hook secret (how the visual hook prevents immediate swipe-away).
- Seamless Loop Trick: How the final spoken word transitions smoothly back into the opening sentence for infinite looping.
---

Generate the entire, un-truncated, maximum-depth script now.`;

    try {
      const json = await this.generateJson(prompt);
      return this.parseOutput(aiReelResponseSchema, json).script;
    } catch (err) {
      if (process.env.GROQ_API_KEY?.trim()) {
        try {
          console.warn("[GeminiProvider] generateReelScript failed with Gemini. Falling back to Groq...");
          const groq = new GroqProvider();
          return await groq.generateReelScript(input);
        } catch (groqErr) {
          console.error("[GeminiProvider] Groq fallback also failed:", groqErr);
        }
      }
      throw err;
    }
  }
}
