import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default async function SyllabusPage() {
  const user = await requireUser();
  const subjects = await prisma.subject.findMany({ where: { userId: user.id }, include: { units: { include: { topics: true } } } });
  return (
    <>
      <PageHeader title="Syllabus" description="Subject, unit, and topic completion used by exam preparedness." />
      <div className="grid gap-5 md:grid-cols-2">
        {subjects.map((subject) => {
          const topics = subject.units.flatMap((unit) => unit.topics);
          const percent = topics.length ? Math.round((topics.filter((topic) => topic.completed).length / topics.length) * 100) : 0;
          return <Card key={subject.id}><CardHeader><CardTitle>{subject.name}</CardTitle></CardHeader><CardContent className="space-y-3"><Progress value={percent} /><p className="text-sm text-muted-foreground">{percent}% complete · {topics.length} topics</p>{subject.units.slice(0, 3).map((unit) => <div key={unit.id} className="rounded-md border p-3 text-sm">{unit.title} · {unit.topics.filter((topic) => topic.completed).length}/{unit.topics.length}</div>)}</CardContent></Card>;
        })}
      </div>
    </>
  );
}
