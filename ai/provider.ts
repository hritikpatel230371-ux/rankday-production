import type { AIDailyLog } from "@/validation/ai";

export type InsightInput = {
  rankScore: number;
  rankDelta: number;
  studyMinutes: number;
  wastedMinutes: number;
  pendingTasks: number;
  upcomingExam?: string;
};

export type ReelInput = {
  rangeLabel: string;
  facts: string[];
  tone?: "natural" | "funny" | "emotional" | "professional";
};

export interface AIProvider {
  analyzeDailyLog(text: string): Promise<AIDailyLog>;
  generateInsights(input: InsightInput): Promise<string[]>;
  generateReelScript(input: ReelInput): Promise<string>;
}
