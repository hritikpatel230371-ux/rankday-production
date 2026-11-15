import { z } from "zod";
import { prioritySchema, statusSchema, taskStatusSchema } from "@/validation/common";

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128)
});

/**
 * Registration validation schema.
 *
 * Security & Design Rationale:
 * 1. 12-Character Minimum Password Policy:
 *    - Modern GPUs can brute-force 8-character passwords within minutes to hours.
 *    - In line with NIST Special Publication 800-63B guidelines, requiring a minimum
 *      of 12 characters guarantees sufficient cryptographic entropy (>70 bits) to
 *      render brute-force, credential-stuffing, and dictionary attacks infeasible.
 * 2. 72-Byte Maximum Limit:
 *    - Bcrypt hashes passwords by chunking them into the Blowfish cipher's 72-byte key
 *      schedule. Any characters past 72 bytes are silently truncated by standard bcrypt.
 *    - By explicitly capping UTF-8 encoded length to 72 bytes, we prevent false security
 *      assumptions where a user believes the 73rd+ character is part of their password.
 * 3. Exact Confirmation Match:
 *    - Ensures the user has not made a typing error that would lock them out of their account.
 */
export const registrationSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80, "Name cannot exceed 80 characters."),
  email: z.string().trim().email("Please enter a valid email address."),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters long.")
    .max(128, "Password cannot exceed 128 characters.")
    .refine((value) => new TextEncoder().encode(value).length <= 72, {
      message: "Password must be 72 bytes or fewer (bcrypt limit)."
    }),
  confirmPassword: z.string().min(12, "Password confirmation must be at least 12 characters long.")
}).refine((value) => value.password === value.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"]
});

export const activityCreateSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  date: z.coerce.date().optional(),
  durationMinutes: z.number().int().min(0).max(1440).nullable().optional(),
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]).optional(),
  importance: prioritySchema.optional()
});

export const activityUpdateSchema = activityCreateSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "Provide at least one activity field to update."
});

export const dailyLogTextSchema = z.object({
  text: z.string().min(10, "Tell RankDay a little more about your day.").max(8000)
});

export const confirmDailyLogSchema = z.object({
  rawText: z.string().min(1).max(8000),
  activities: z.array(z.object({
    title: z.string().min(1).max(160),
    category: z.string().min(1),
    subject: z.string().nullable().optional(),
    durationMinutes: z.number().int().min(0).max(1440).nullable().optional(),
    plannedMinutes: z.number().int().min(0).max(1440).nullable().optional(),
    sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]),
    importance: prioritySchema,
    confidence: z.number().min(0).max(1).optional(),
    needsConfirmation: z.boolean().optional()
  })),
  tests: z.array(z.object({
    name: z.string().min(1).max(180),
    subject: z.string().nullable().optional(),
    obtainedMarks: z.number().min(0),
    totalMarks: z.number().positive(),
    difficulty: z.number().int().min(1).max(5).default(3)
  }).refine((test) => test.obtainedMarks <= test.totalMarks, {
    message: "Obtained marks cannot exceed total marks.",
    path: ["obtainedMarks"]
  })).default([]),
  pendingItems: z.array(z.string()).default([]),
  summary: z.unknown().optional()
});

export const goalSchema = z.object({
  title: z.string().min(1).max(180),
  description: z.string().max(1000).optional().nullable(),
  priority: prioritySchema.default("MEDIUM"),
  dueDate: z.coerce.date().optional().nullable(),
  progress: z.number().int().min(0).max(100).default(0),
  status: statusSchema.default("NOT_STARTED"),
  subjectId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable()
});

export const taskSchema = z.object({
  title: z.string().min(1).max(180),
  description: z.string().max(1000).optional().nullable(),
  priority: prioritySchema.default("MEDIUM"),
  dueDate: z.coerce.date().optional().nullable(),
  estimatedMinutes: z.number().int().min(0).max(1440).optional().nullable(),
  status: taskStatusSchema.default("TODO"),
  goalId: z.string().optional().nullable(),
  subjectId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable()
});

export const examSchema = z.object({
  name: z.string().min(1).max(180),
  subjectId: z.string().optional().nullable(),
  examDate: z.coerce.date(),
  totalMarks: z.number().int().positive().optional().nullable(),
  targetMarks: z.number().int().positive().optional().nullable(),
  priority: prioritySchema.default("HIGH")
});

export const testSchema = z.object({
  name: z.string().min(1).max(180),
  subjectId: z.string().optional().nullable(),
  date: z.coerce.date(),
  obtainedMarks: z.number().min(0),
  totalMarks: z.number().positive(),
  difficulty: z.number().int().min(1).max(5).default(3),
  notes: z.string().max(1000).optional().nullable()
}).refine((test) => test.obtainedMarks <= test.totalMarks, {
  message: "Obtained marks cannot exceed total marks.",
  path: ["obtainedMarks"]
});
