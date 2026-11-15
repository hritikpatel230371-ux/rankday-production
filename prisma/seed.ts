import { addDays, subDays } from "date-fns";
import { PrismaClient } from "@prisma/client";
import { ensureUserDefaults } from "../lib/onboarding";
import { calculateTestPercentage } from "../lib/rank-engine";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_USER_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error("Set SEED_USER_EMAIL to an existing account before seeding sample data.");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("No account exists for SEED_USER_EMAIL. Register an account before seeding sample data.");
  await ensureUserDefaults(user.id);

  const categories = await prisma.category.findMany({ where: { userId: user.id } });
  const subjects = await prisma.subject.findMany({ where: { userId: user.id } });
  const bySubject = Object.fromEntries(subjects.map((subject) => [subject.name, subject]));
  const byCategory = Object.fromEntries(categories.map((category) => [category.name, category]));

  for (const subject of subjects) {
    for (let unitNumber = 1; unitNumber <= 3; unitNumber++) {
      const unit = await prisma.syllabusUnit.upsert({
        where: { id: `${subject.id}-unit-${unitNumber}` },
        update: {},
        create: { id: `${subject.id}-unit-${unitNumber}`, subjectId: subject.id, title: `Unit ${unitNumber}`, order: unitNumber }
      });
      for (let topicNumber = 1; topicNumber <= 4; topicNumber++) {
        await prisma.syllabusTopic.upsert({
          where: { id: `${unit.id}-topic-${topicNumber}` },
          update: {},
          create: {
            id: `${unit.id}-topic-${topicNumber}`,
            unitId: unit.id,
            name: `${subject.name} Topic ${topicNumber}`,
            estimatedStudyMinutes: 60,
            completed: unitNumber === 1 || topicNumber <= 2,
            difficulty: Math.min(5, unitNumber + 1),
            priority: unitNumber === 3 ? "HIGH" : "MEDIUM"
          }
        });
      }
    }
  }

  await prisma.goal.createMany({
    data: [
      { userId: user.id, subjectId: bySubject.DBMS?.id, categoryId: byCategory.Education?.id, title: "Complete DBMS Unit 3", priority: "HIGH", progress: 58, status: "IN_PROGRESS", dueDate: addDays(new Date(), 12) },
      { userId: user.id, subjectId: bySubject.DSA?.id, categoryId: byCategory.Career?.id, title: "Solve 50 DSA problems", priority: "HIGH", progress: 42, status: "IN_PROGRESS", targetValue: 50, currentValue: 21 },
      { userId: user.id, categoryId: byCategory.Project?.id, title: "Finish portfolio tracker module", priority: "MEDIUM", progress: 70, status: "IN_PROGRESS" }
    ],
    skipDuplicates: true
  });

  await prisma.task.createMany({
    data: [
      { userId: user.id, title: "Revise DBMS normalization", priority: "HIGH", dueDate: addDays(new Date(), 1), estimatedMinutes: 90 },
      { userId: user.id, title: "Solve 10 SQL joins", priority: "MEDIUM", dueDate: addDays(new Date(), 2), estimatedMinutes: 60 },
      { userId: user.id, title: "OS Unit 4 notes", priority: "CRITICAL", dueDate: addDays(new Date(), 3), estimatedMinutes: 120 },
      { userId: user.id, title: "Update project README", priority: "LOW", dueDate: addDays(new Date(), 5), estimatedMinutes: 30 }
    ],
    skipDuplicates: true
  });

  await prisma.exam.createMany({
    data: [
      { userId: user.id, subjectId: bySubject.DBMS?.id, name: "DBMS Midterm", examDate: addDays(new Date(), 18), totalMarks: 100, targetMarks: 85, priority: "HIGH" },
      { userId: user.id, subjectId: bySubject["Operating Systems"]?.id, name: "OS Internal", examDate: addDays(new Date(), 9), totalMarks: 50, targetMarks: 40, priority: "CRITICAL" }
    ],
    skipDuplicates: true
  });

  const tests = [
    ["DBMS Quiz 1", "DBMS", 72, 100, subDays(new Date(), 20)],
    ["DBMS Quiz 2", "DBMS", 76, 100, subDays(new Date(), 14)],
    ["DBMS Quiz 3", "DBMS", 84, 100, subDays(new Date(), 7)],
    ["Maths Test", "DBMS", 78, 100, subDays(new Date(), 2)]
  ] as const;
  for (const [name, subjectName, obtained, total, date] of tests) {
    await prisma.test.create({
      data: {
        userId: user.id,
        subjectId: bySubject[subjectName]?.id,
        name,
        date,
        obtainedMarks: obtained,
        totalMarks: total,
        percentage: calculateTestPercentage(obtained, total),
        difficulty: 3
      }
    });
  }

  for (let day = 12; day >= 0; day--) {
    const date = subDays(new Date(), day);
    await prisma.rankSnapshot.create({
      data: {
        userId: user.id,
        date,
        score: 660 + (12 - day) * 6 + (day % 3 === 0 ? 8 : -2),
        delta: day % 3 === 0 ? 14 : 4,
        reasons: [{ label: "Study progress", delta: 8, tone: "positive" }, { label: "Consistency", delta: 4, tone: "positive" }],
        components: { studyProgress: 78, goalCompletion: 62, examPreparedness: 58 }
      }
    });
  }

  await prisma.activity.createMany({
    data: [
      { userId: user.id, categoryId: byCategory.Education?.id, subjectId: bySubject.DBMS?.id, title: "Studied DBMS Unit 2", date: new Date(), durationMinutes: 180, plannedMinutes: 300, sentiment: "POSITIVE", importance: "HIGH" },
      { userId: user.id, categoryId: byCategory.Project?.id, title: "Project work", date: new Date(), durationMinutes: 120, sentiment: "POSITIVE", importance: "HIGH" },
      { userId: user.id, categoryId: byCategory.Entertainment?.id, title: "Watched reels", date: new Date(), durationMinutes: 90, sentiment: "NEGATIVE", importance: "MEDIUM" }
    ],
    skipDuplicates: true
  });

  console.log(`Seeded sample data for the configured account.`);
}

main().finally(async () => {
  await prisma.$disconnect();
});
