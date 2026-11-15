export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type Sentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE";

export type RankWeights = {
  goalCompletion: number;
  studyProgress: number;
  examPreparedness: number;
  testPerformance: number;
  consistency: number;
  timeManagement: number;
  longTermProgress: number;
};

export type RankInput = {
  previousScore: number;
  date: Date;
  dailyStudyTargetMinutes: number;
  activities: Array<{
    title: string;
    durationMinutes?: number | null;
    plannedMinutes?: number | null;
    sentiment: Sentiment;
    importance: Priority;
    category?: string | null;
  }>;
  goals: Array<{ progress: number; status: string; priority: Priority; dueDate?: Date | null }>;
  tasks: Array<{ status: string; priority: Priority; dueDate?: Date | null; estimatedMinutes?: number | null }>;
  exams: Array<{ examDate: Date; priority: Priority; preparedness?: number | null }>;
  tests: Array<{ percentage: number; date?: Date | null }>;
  syllabus: Array<{ completed: boolean; difficulty?: number | null; priority: Priority }>;
  streakDays: number;
  previousComponents?: Partial<Record<keyof RankWeights, number>>;
  weights?: Partial<RankWeights>;
};

export type RankReason = {
  label: string;
  delta: number;
  tone: "positive" | "negative" | "neutral";
};

export type RankResult = {
  score: number;
  delta: number;
  uncappedDelta: number;
  reasons: RankReason[];
  components: Record<string, number>;
};
