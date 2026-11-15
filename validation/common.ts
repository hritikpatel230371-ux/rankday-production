import { z } from "zod";

export const prioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const statusSchema = z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "PAUSED", "CANCELLED"]);
export const taskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "COMPLETED", "POSTPONED", "CANCELLED"]);
export const sentimentSchema = z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]);

export const idSchema = z.string().min(4);
export const optionalDateSchema = z.coerce.date().optional().nullable();
