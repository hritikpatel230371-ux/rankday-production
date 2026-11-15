import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { QuickCreateForm } from "@/components/quick-create-form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function TasksPage() {
  const user = await requireUser();
  const tasks = await prisma.task.findMany({ where: { userId: user.id }, orderBy: [{ status: "asc" }, { dueDate: "asc" }] });
  return (
    <>
      <PageHeader title="To-Do" description="Daily tasks with priority, due dates, and rank pressure." />
      <QuickCreateForm endpoint="/api/tasks" fields={[{ name: "title", placeholder: "Task title", required: true }, { name: "dueDate", placeholder: "Due date", type: "date" }, { name: "estimatedMinutes", placeholder: "Minutes", type: "number" }]} />
      <div className="mt-5 grid gap-3">
        {tasks.length ? tasks.map((task) => (
          <Card key={task.id}><CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{task.title}</p><p className="text-sm text-muted-foreground">{task.dueDate ? format(task.dueDate, "MMM d") : "No due date"}</p></div><div className="flex gap-2"><Badge>{task.priority}</Badge><Badge tone={task.status === "COMPLETED" ? "positive" : "neutral"}>{task.status}</Badge></div></CardContent></Card>
        )) : <Empty text="No tasks yet." />}
      </div>
    </>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">{text}</div>;
}
