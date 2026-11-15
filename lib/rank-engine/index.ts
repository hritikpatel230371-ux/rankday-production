import { differenceInCalendarDays, isPast, startOfDay } from "date-fns";
import { clamp } from "@/lib/utils";
import type { Priority, RankInput, RankResult, RankWeights } from "@/lib/rank-engine/types";

export const defaultRankWeights: RankWeights = {
  goalCompletion: 0.2,
  studyProgress: 0.2,
  examPreparedness: 0.2,
  testPerformance: 0.15,
  consistency: 0.1,
  timeManagement: 0.1,
  longTermProgress: 0.05
};

const priorityWeight: Record<Priority, number> = {
  LOW: 0.6,
  MEDIUM: 1,
  HIGH: 1.35,
  CRITICAL: 1.75
};

export function examUrgency(daysRemaining: number, horizonDays = 60) {
  if (daysRemaining <= 0) return 1;
  const normalized = 1 - Math.min(daysRemaining / horizonDays, 1);
  return clamp(Math.pow(normalized, 1.35), 0, 1);
}

export function calculateTestPercentage(obtainedMarks: number, totalMarks: number) {
  if (totalMarks <= 0) return 0;
  return clamp((obtainedMarks / totalMarks) * 100, 0, 100);
}

export function calculateSyllabusPercentage(topics: Array<{ completed: boolean }>) {
  if (!topics.length) return 0;
  return Math.round((topics.filter((topic) => topic.completed).length / topics.length) * 100);
}

function weightedAverage(items: number[]) {
  if (!items.length) return 0;
  return items.reduce((sum, item) => sum + item, 0) / items.length;
}

function componentToDelta(component: number, weight: number, previousComponent?: number, maxSwing = 34) {
  if (previousComponent !== undefined) {
    return (component - previousComponent / 100) * weight * maxSwing;
  }
  return (component - 0.5) * 2 * weight * maxSwing;
}

export function calculateRank(input: RankInput): RankResult {
  const weights = { ...defaultRankWeights, ...input.weights };
  const studyMinutes = input.activities
    .filter((activity) => ["Education", "Project", "Career"].includes(activity.category || "") || activity.sentiment === "POSITIVE")
    .reduce((sum, activity) => sum + (activity.durationMinutes || 0), 0);
  const wastedMinutes = input.activities
    .filter((activity) => activity.sentiment === "NEGATIVE" || activity.category === "Entertainment")
    .reduce((sum, activity) => sum + (activity.durationMinutes || 0), 0);
  const plannedMinutes = input.activities.reduce((sum, activity) => sum + (activity.plannedMinutes || 0), 0);

  const goalScore = input.goals.length
    ? clamp(
        weightedAverage(input.goals.map((goal) => (goal.progress / 100) * priorityWeight[goal.priority])),
        0,
        1
      )
    : 0.5;

  const studyTarget = Math.max(input.dailyStudyTargetMinutes || 1, 1);
  const studyScore = clamp(Math.sqrt(studyMinutes / studyTarget), 0, 1);
  const planScore = plannedMinutes ? clamp(studyMinutes / plannedMinutes, 0, 1.1) / 1.1 : 0.6;

  const syllabusScore = input.syllabus.length ? calculateSyllabusPercentage(input.syllabus) / 100 : 0.55;
  const examScores = input.exams.map((exam) => {
    const days = differenceInCalendarDays(startOfDay(exam.examDate), startOfDay(input.date));
    const urgency = examUrgency(days);
    const prepared = exam.preparedness ?? syllabusScore;
    return clamp(prepared * (1 - urgency * 0.35) + urgency * 0.35 * priorityWeight[exam.priority] * 0.7, 0, 1);
  });
  const examScore = examScores.length ? weightedAverage(examScores) : 0.55;

  const testScore = input.tests.length
    ? clamp(weightedAverage(input.tests.slice(-5).map((test) => test.percentage / 100)), 0, 1)
    : 0.55;

  const doneTasks = input.tasks.filter((task) => task.status === "COMPLETED");
  const overduePenalty = input.tasks
    .filter((task) => task.status !== "COMPLETED" && task.dueDate && isPast(task.dueDate))
    .reduce((sum, task) => sum + priorityWeight[task.priority] * 0.06, 0);
  const taskCompletion = input.tasks.length
    ? clamp(doneTasks.reduce((sum, task) => sum + priorityWeight[task.priority], 0) / input.tasks.reduce((sum, task) => sum + priorityWeight[task.priority], 0), 0, 1)
    : 0.55;

  const wastedRatio = wastedMinutes / Math.max(studyMinutes + wastedMinutes, 60);
  const timeScore = clamp((planScore + (1 - wastedRatio)) / 2 - overduePenalty, 0, 1);
  const consistencyScore = clamp(input.streakDays / 14, 0, 1);
  const longTermScore = clamp((goalScore + syllabusScore + taskCompletion) / 3, 0, 1);

  const components = {
    goalCompletion: goalScore,
    studyProgress: studyScore,
    examPreparedness: examScore,
    testPerformance: testScore,
    consistency: consistencyScore,
    timeManagement: timeScore,
    longTermProgress: longTermScore
  };

  const reasons = [
    { label: "Goal completion", delta: componentToDelta(goalScore, weights.goalCompletion, input.previousComponents?.goalCompletion), tone: "neutral" as const },
    { label: "Study progress", delta: componentToDelta(studyScore, weights.studyProgress, input.previousComponents?.studyProgress), tone: "neutral" as const },
    { label: "Exam preparedness", delta: componentToDelta(examScore, weights.examPreparedness, input.previousComponents?.examPreparedness), tone: "neutral" as const },
    { label: "Test performance", delta: componentToDelta(testScore, weights.testPerformance, input.previousComponents?.testPerformance), tone: "neutral" as const },
    { label: "Consistency", delta: componentToDelta(consistencyScore, weights.consistency, input.previousComponents?.consistency), tone: "neutral" as const },
    { label: "Time management", delta: componentToDelta(timeScore, weights.timeManagement, input.previousComponents?.timeManagement), tone: "neutral" as const },
    { label: "Long-term progress", delta: componentToDelta(longTermScore, weights.longTermProgress, input.previousComponents?.longTermProgress), tone: "neutral" as const }
  ];

  const uncappedDelta = reasons.reduce((sum, reason) => sum + reason.delta, 0);
  const dailyCap = uncappedDelta >= 0 ? 32 : 26;
  const roundedDelta = Math.round(clamp(uncappedDelta, -dailyCap, dailyCap));
  const delta = roundedDelta === 0 ? 0 : roundedDelta;
  const score = Math.round(clamp(input.previousScore + delta, 0, 1000));
  const componentReasons = reasons.map((reason) => ({
    ...reason,
    tone: reason.delta > 0 ? "positive" as const : reason.delta < 0 ? "negative" as const : "neutral" as const
  }));

  return {
    score,
    delta,
    uncappedDelta: Math.round(uncappedDelta),
    reasons: componentReasons
      .map((reason) => ({ ...reason, delta: Math.round(reason.delta) }))
      .filter((reason) => reason.delta !== 0),
    components: Object.fromEntries(Object.entries(components).map(([key, value]) => [key, Math.round(value * 100)]))
  };
}
