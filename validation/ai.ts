import { z } from "zod";
import { prioritySchema, sentimentSchema } from "@/validation/common";

function parseMinutes(val: unknown): number | null | undefined {
  if (typeof val === "number") return Math.round(val);
  if (typeof val === "string") {
    const hrMatch = val.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)/i);
    if (hrMatch) return Math.round(Number(hrMatch[1]) * 60);
    const minMatch = val.match(/(\d+)\s*(?:m|min|mins|minute|minutes)/i);
    if (minMatch) return Math.round(Number(minMatch[1]));
    const num = Number(val);
    if (!isNaN(num)) return Math.round(num);
  }
  return null;
}

function normalizeActivity(raw: unknown) {
  if (typeof raw !== "object" || raw === null) return raw;
  const item = raw as Record<string, unknown>;
  const title = item.title || item.name || item.description || (item.subject ? `Studied ${item.subject}` : "Logged activity");

  let durationMinutes = item.durationMinutes;
  if (durationMinutes === undefined && item.duration !== undefined) {
    durationMinutes = parseMinutes(item.duration);
  } else if (durationMinutes !== undefined && durationMinutes !== null) {
    durationMinutes = parseMinutes(durationMinutes);
  }

  let plannedMinutes = item.plannedMinutes;
  if (plannedMinutes !== undefined && plannedMinutes !== null) {
    plannedMinutes = parseMinutes(plannedMinutes);
  }

  let sentiment = item.sentiment;
  if (typeof sentiment === "string") {
    const upper = sentiment.toUpperCase();
    sentiment = ["POSITIVE", "NEUTRAL", "NEGATIVE"].includes(upper) ? upper : "NEUTRAL";
  }

  let importance = item.importance || item.priority;
  if (typeof importance === "string") {
    const upper = importance.toUpperCase();
    importance = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(upper) ? upper : "MEDIUM";
  }

  let confidence = Number(item.confidence ?? 0.7);
  if (isNaN(confidence) || confidence < 0) confidence = 0.7;
  if (confidence > 1) {
    // If returned as percentage like 85 or 90
    if (confidence <= 100) confidence = confidence / 100;
    else confidence = 1.0;
  }

  return {
    ...item,
    title: String(title).slice(0, 160),
    category: typeof item.category === "string" && item.category.trim() ? item.category.trim() : (item.subject ? "Education" : "Other"),
    subject: item.subject ? String(item.subject).trim() : null,
    durationMinutes: durationMinutes ?? null,
    plannedMinutes: plannedMinutes ?? null,
    sentiment: sentiment || "NEUTRAL",
    importance: importance || "MEDIUM",
    confidence,
    needsConfirmation: Boolean(item.needsConfirmation ?? false)
  };
}

function normalizeGoal(raw: unknown) {
  if (typeof raw !== "object" || raw === null) return raw;
  const item = raw as Record<string, unknown>;
  let status = item.status;
  if (typeof status === "string") {
    const upper = status.toUpperCase();
    if (["DONE", "FINISHED", "ACHIEVED"].includes(upper)) status = "COMPLETED";
    else if (["COMPLETED", "IN_PROGRESS", "MISSED", "PENDING"].includes(upper)) status = upper;
    else status = "IN_PROGRESS";
  }
  let importance = item.importance || item.priority;
  if (typeof importance === "string") {
    const upper = importance.toUpperCase();
    importance = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(upper) ? upper : "MEDIUM";
  }

  let progressDelta = Number(item.progressDelta ?? 0);
  if (isNaN(progressDelta)) progressDelta = 0;
  progressDelta = Math.max(-100, Math.min(100, Math.round(progressDelta)));

  return {
    ...item,
    title: String(item.title || item.name || "Goal").slice(0, 180),
    status: status || "IN_PROGRESS",
    progressDelta,
    importance: importance || "MEDIUM",
    needsConfirmation: Boolean(item.needsConfirmation ?? true)
  };
}

function normalizeTest(raw: unknown) {
  if (typeof raw !== "object" || raw === null) return raw;
  const item = raw as Record<string, unknown>;
  const name = String(item.name || item.title || "Test").slice(0, 180);
  let obtainedMarks = Number(item.obtainedMarks ?? item.marksObtained ?? item.score ?? 0);
  if (isNaN(obtainedMarks) || obtainedMarks < 0) obtainedMarks = 0;
  let totalMarks = Number(item.totalMarks ?? item.outOf ?? item.maxMarks ?? 100);
  if (isNaN(totalMarks) || totalMarks <= 0) totalMarks = 100;
  let difficulty = Math.round(Number(item.difficulty ?? 3));
  if (isNaN(difficulty) || difficulty < 1) difficulty = 3;
  if (difficulty > 5) difficulty = 5;

  return {
    ...item,
    name,
    subject: item.subject ? String(item.subject).trim() : null,
    obtainedMarks,
    totalMarks,
    difficulty,
    needsConfirmation: Boolean(item.needsConfirmation ?? false)
  };
}

function normalizeSyllabus(raw: unknown) {
  if (typeof raw !== "object" || raw === null) return raw;
  const item = raw as Record<string, unknown>;
  return {
    subject: String(item.subject || item.title || item.name || "General"),
    unit: item.unit ? String(item.unit) : null,
    topic: item.topic ? String(item.topic) : null,
    completed: Boolean(item.completed ?? true),
    needsConfirmation: Boolean(item.needsConfirmation ?? true)
  };
}

function normalizeSummary(raw: unknown) {
  if (typeof raw === "string") {
    return {
      completed: [],
      pending: [],
      bestAchievement: raw.slice(0, 300),
      mainConcern: null
    };
  }
  if (typeof raw === "object" && raw !== null) {
    const s = raw as Record<string, unknown>;
    return {
      completed: Array.isArray(s.completed) ? s.completed.map(String) : [],
      pending: Array.isArray(s.pending) ? s.pending.map(String) : [],
      bestAchievement: s.bestAchievement ? String(s.bestAchievement).slice(0, 300) : null,
      mainConcern: s.mainConcern ? String(s.mainConcern).slice(0, 300) : null
    };
  }
  return {
    completed: [],
    pending: [],
    bestAchievement: null,
    mainConcern: null
  };
}

function normalizeDailyLog(raw: unknown) {
  if (typeof raw !== "object" || raw === null) {
    return {
      activities: [],
      goals: [],
      tests: [],
      syllabusUpdates: [],
      timeWaste: [],
      pendingItems: [],
      summary: {}
    };
  }
  const obj = raw as Record<string, unknown>;
  const target = (obj.data || obj.dailyLog || obj.result || obj.log || obj) as Record<string, unknown>;

  return {
    activities: Array.isArray(target.activities) ? target.activities : [],
    goals: Array.isArray(target.goals) ? target.goals : [],
    tests: Array.isArray(target.tests) ? target.tests : [],
    syllabusUpdates: Array.isArray(target.syllabusUpdates) ? target.syllabusUpdates : [],
    timeWaste: Array.isArray(target.timeWaste) ? target.timeWaste : [],
    pendingItems: Array.isArray(target.pendingItems)
      ? target.pendingItems.map((item) => (typeof item === "string" ? item : (item && typeof item === "object" && "title" in item ? String((item as Record<string, unknown>).title) : String(item))))
      : [],
    summary: target.summary ?? {}
  };
}

export const extractedActivitySchema = z.preprocess(
  normalizeActivity,
  z.object({
    id: z.string().optional(),
    title: z.string().min(1).max(160),
    category: z.string().default("Other"),
    subject: z.string().nullable().optional(),
    durationMinutes: z.number().int().min(0).max(1440).nullable().optional(),
    plannedMinutes: z.number().int().min(0).max(1440).nullable().optional(),
    sentiment: sentimentSchema.default("NEUTRAL"),
    importance: prioritySchema.default("MEDIUM"),
    confidence: z.number().min(0).max(1).default(0.7),
    needsConfirmation: z.boolean().default(false)
  })
);

export const extractedGoalSchema = z.preprocess(
  normalizeGoal,
  z.object({
    title: z.string().min(1).max(180),
    status: z.enum(["COMPLETED", "IN_PROGRESS", "MISSED", "PENDING"]).default("IN_PROGRESS"),
    progressDelta: z.number().min(-100).max(100).default(0),
    importance: prioritySchema.default("MEDIUM"),
    needsConfirmation: z.boolean().default(true)
  })
);

export const extractedTestSchema = z.preprocess(
  normalizeTest,
  z.object({
    name: z.string().min(1).max(180),
    subject: z.string().nullable().optional(),
    obtainedMarks: z.number().min(0),
    totalMarks: z.number().positive(),
    difficulty: z.number().int().min(1).max(5).default(3),
    needsConfirmation: z.boolean().default(false)
  }).refine((test) => test.obtainedMarks <= test.totalMarks, {
    message: "Obtained marks cannot exceed total marks.",
    path: ["obtainedMarks"]
  })
);

export const extractedSyllabusSchema = z.preprocess(
  normalizeSyllabus,
  z.object({
    subject: z.string(),
    unit: z.string().nullable().optional(),
    topic: z.string().nullable().optional(),
    completed: z.boolean().default(true),
    needsConfirmation: z.boolean().default(true)
  })
);

export const aiDailyLogSchema = z.preprocess(
  normalizeDailyLog,
  z.object({
    activities: z.array(extractedActivitySchema).default([]),
    goals: z.array(extractedGoalSchema).default([]),
    tests: z.array(extractedTestSchema).default([]),
    syllabusUpdates: z.array(extractedSyllabusSchema).default([]),
    timeWaste: z.array(extractedActivitySchema).default([]),
    pendingItems: z.array(z.string()).default([]),
    summary: z.preprocess(normalizeSummary, z.object({
      completed: z.array(z.string()).default([]),
      pending: z.array(z.string()).default([]),
      bestAchievement: z.string().nullable().optional(),
      mainConcern: z.string().nullable().optional()
    }).default({}))
  })
);

export const aiInsightsResponseSchema = z.object({
  insights: z.array(z.string().trim().min(1).max(600)).min(1).max(4)
});

/**
 * Schema for short-form social video (Reels / Shorts / TikToks) scripts.
 * Expanded to 50,000 characters to allow maximum-length, multi-scene storyboard
 * output including timestamps, camera angles, sound design, shot checklists,
 * and comprehensive social captions without truncation.
 */
export const aiReelResponseSchema = z.object({
  script: z.string().trim().min(1).max(50000)
});

export type AIDailyLog = z.infer<typeof aiDailyLogSchema>;
