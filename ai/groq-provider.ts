import Groq from "groq-sdk";
import type { AIProvider, InsightInput, ReelInput } from "@/ai/provider";
import {
  aiDailyLogSchema,
  aiInsightsResponseSchema,
  aiReelResponseSchema,
  type AIDailyLog
} from "@/validation/ai";
import { AIProviderError } from "@/ai/errors";
import { ZodError, z, type ZodTypeAny } from "zod";

export class GroqProvider implements AIProvider {
  private groq: Groq;
  private defaultModel: string;

  constructor(
    apiKey = process.env.GROQ_API_KEY || "",
    model = process.env.GROQ_MODEL || "openai/gpt-oss-120b"
  ) {
    if (!apiKey) {
      throw new AIProviderError(
        "GROQ_KEY_MISSING",
        503,
        "Groq is selected but GROQ_API_KEY is not configured in .env.local."
      );
    }
    this.groq = new Groq({ apiKey });
    this.defaultModel = model;
  }

  async generateJson(prompt: string) {
    const modelsToTry = Array.from(new Set([
      this.defaultModel,
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "qwen/qwen3.8-27b",
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant"
    ]));

    let completion;
    let lastError: unknown;

    for (const model of modelsToTry) {
      try {
        completion = await this.groq.chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content: "You are an AI assistant for RankDay productivity command center. You must respond strictly with valid JSON conforming to the requested schema. Return raw JSON only, no markdown."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 8000
        });

        if (completion?.choices?.[0]?.message?.content) {
          break;
        }
      } catch (error: unknown) {
        lastError = error;
        const err = error as { status?: number; code?: string; message?: string };
        // If model not found or unavailable, try next candidate model
        if (err?.status === 404 || err?.code === "model_not_found") {
          continue;
        }
        if (err?.status === 401 || err?.status === 403) {
          throw new AIProviderError("GROQ_AUTH", 502, "Groq rejected the API key. Please check your GROQ_API_KEY.");
        }
        if (err?.status === 429) {
          throw new AIProviderError("GROQ_QUOTA", 503, "Groq rate limit or quota was reached. Please try again later.");
        }
        throw new AIProviderError("GROQ_ERROR", 502, `Groq request failed: ${err?.message || "Unknown error"}`);
      }
    }

    const content = completion?.choices?.[0]?.message?.content;
    if (!content) {
      const err = lastError as { message?: string } | undefined;
      throw new AIProviderError("GROQ_EMPTY", 502, `Groq returned an empty response. ${err?.message || "Please try again."}`);
    }

    try {
      return JSON.parse(content);
    } catch {
      throw new AIProviderError("GROQ_INVALID_JSON", 502, "Groq returned an invalid JSON response. Please try again.");
    }
  }

  private parseOutput<Schema extends ZodTypeAny>(schema: Schema, value: unknown): z.output<Schema> {
    try {
      return schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("[GroqProvider] Schema validation failed:", JSON.stringify(error.flatten(), null, 2));
        console.error("[GroqProvider] Raw value received:", JSON.stringify(value, null, 2));
        throw new AIProviderError("GROQ_SCHEMA", 502, "Groq returned content that did not match RankDay's expected format.");
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
    const json = await this.generateJson(prompt);
    return this.parseOutput(aiDailyLogSchema, json);
  }

  async generateInsights(input: InsightInput) {
    const json = await this.generateJson(`Generate 3 short, kind, non-shaming productivity insights from these stored facts only. Return {"insights": string[]}.\n${JSON.stringify(input)}`);
    return this.parseOutput(aiInsightsResponseSchema, json).insights;
  }

  async generateReelScript(input: ReelInput) {
    const prompt = `You are a world-class viral short-form video director and scriptwriter specializing in high-retention Instagram Reels, YouTube Shorts, and TikToks (30-60 seconds).

Generate the MOST DETAILED, COMPREHENSIVE, MAXIMUM-LENGTH production storyboard and script possible based on these real user productivity facts. Do NOT give brief summaries—provide an exhaustive, professional creator blueprint with word-for-word dialogue, camera choreography, sound design, and a full caption.

Context & Facts:
- Range: ${input.rangeLabel || "Today"}
- Tone / Aesthetic: ${input.tone || "natural"}
- Recorded Facts:
${(input.facts || []).map((f) => `  * ${f}`).join("\n")}

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
    const json = await this.generateJson(prompt);
    return this.parseOutput(aiReelResponseSchema, json).script;
  }
}
