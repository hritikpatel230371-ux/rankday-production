import { describe, expect, it } from "vitest";
import { calculateRank, calculateSyllabusPercentage, calculateTestPercentage, examUrgency } from "@/lib/rank-engine";

const base = {
  previousScore: 700,
  date: new Date("2026-10-04"),
  dailyStudyTargetMinutes: 240,
  activities: [],
  goals: [],
  tasks: [],
  exams: [],
  tests: [],
  syllabus: [],
  streakDays: 0
};

describe("rank engine", () => {
  it("increases score when an important goal is completed", () => {
    const result = calculateRank({ ...base, goals: [{ progress: 100, status: "COMPLETED", priority: "HIGH", dueDate: null }], activities: [{ title: "Studied DBMS", durationMinutes: 180, plannedMinutes: 180, sentiment: "POSITIVE", importance: "HIGH", category: "Education" }] });
    expect(result.delta).toBeGreaterThan(0);
  });

  it("decreases score when a critical task is missed near an exam", () => {
    const result = calculateRank({ ...base, activities: [{ title: "Wasted time", durationMinutes: 240, sentiment: "NEGATIVE", importance: "MEDIUM", category: "Entertainment" }], tasks: [{ status: "TODO", priority: "CRITICAL", dueDate: new Date("2026-10-03"), estimatedMinutes: 120 }], exams: [{ examDate: new Date("2026-10-07"), priority: "CRITICAL", preparedness: 0.25 }] });
    expect(result.delta).toBeLessThan(0);
  });

  it("exam urgency increases as the exam approaches", () => {
    expect(examUrgency(3)).toBeGreaterThan(examUrgency(30));
  });

  it("trivial tasks cannot inflate rank excessively", () => {
    const result = calculateRank({ ...base, tasks: Array.from({ length: 100 }, () => ({ status: "COMPLETED", priority: "LOW" as const, dueDate: null, estimatedMinutes: 1 })) });
    expect(result.delta).toBeLessThanOrEqual(32);
  });

  it("rank remains within 0-1000", () => {
    expect(calculateRank({ ...base, previousScore: 995, activities: [{ title: "Study", durationMinutes: 900, sentiment: "POSITIVE", importance: "CRITICAL", category: "Education" }] }).score).toBeLessThanOrEqual(1000);
    expect(calculateRank({ ...base, previousScore: 5, activities: [{ title: "Waste", durationMinutes: 900, sentiment: "NEGATIVE", importance: "CRITICAL", category: "Entertainment" }] }).score).toBeGreaterThanOrEqual(0);
  });

  it("one bad day cannot destroy rank", () => {
    const result = calculateRank({ ...base, previousScore: 800, activities: [{ title: "Waste", durationMinutes: 900, sentiment: "NEGATIVE", importance: "CRITICAL", category: "Entertainment" }], tasks: [{ status: "TODO", priority: "CRITICAL", dueDate: new Date("2026-10-03") }] });
    expect(result.delta).toBeGreaterThanOrEqual(-26);
  });

  it("does not award rank again for unchanged component scores", () => {
    const input = {
      ...base,
      activities: [{ title: "Studied DBMS", durationMinutes: 180, plannedMinutes: 180, sentiment: "POSITIVE" as const, importance: "HIGH" as const, category: "Education" }],
      goals: [{ progress: 75, status: "IN_PROGRESS", priority: "HIGH" as const, dueDate: null }]
    };
    const first = calculateRank(input);
    const second = calculateRank({
      ...input,
      previousScore: first.score,
      previousComponents: first.components
    });

    expect(second.delta).toBe(0);
    expect(second.score).toBe(first.score);
  });

  it("calculates test percentage", () => {
    expect(calculateTestPercentage(41, 50)).toBe(82);
  });

  it("calculates syllabus percentage", () => {
    expect(calculateSyllabusPercentage([{ completed: true }, { completed: false }, { completed: true }])).toBe(67);
  });
});
