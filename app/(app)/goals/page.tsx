import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { QuickCreateForm } from "@/components/quick-create-form";

export default async function GoalsPage() {
  const user = await requireUser();
  const goals = await prisma.goal.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } });
  return (
    <>
      <PageHeader title="Goals" description="Short-term and long-term outcomes with weighted progress." />
      <QuickCreateForm endpoint="/api/goals" fields={[{ name: "title", placeholder: "Goal title", required: true }, { name: "dueDate", placeholder: "Due date", type: "date" }]} />
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {goals.length ? goals.map((goal) => (
          <Card key={goal.id}><CardContent className="space-y-3 p-4"><div className="flex justify-between gap-3"><h3 className="font-medium">{goal.title}</h3><Badge>{goal.priority}</Badge></div><Progress value={goal.progress} /><p className="text-sm text-muted-foreground">{goal.status} · {goal.progress}% complete</p></CardContent></Card>
        )) : <Empty text="No goals created yet." />}
      </div>
    </>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">{text}</div>;
}
