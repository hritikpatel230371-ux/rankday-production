import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QuickCreateForm } from "@/components/quick-create-form";
import { formatMinutes } from "@/lib/utils";

export default async function ActivitiesPage() {
  const user = await requireUser();
  const activities = await prisma.activity.findMany({ where: { userId: user.id }, orderBy: { date: "desc" }, include: { category: true, subject: true }, take: 100 });
  return (
    <>
      <PageHeader title="Activities" description="A confirmed ledger of what happened. These records feed rank and analytics." />
      <QuickCreateForm endpoint="/api/activities" fields={[{ name: "title", placeholder: "Activity title", required: true }, { name: "durationMinutes", placeholder: "Minutes", type: "number" }]} />
      <div className="mt-5 grid gap-3">
        {activities.length ? activities.map((activity) => (
          <Card key={activity.id}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-medium">{activity.title}</p><p className="text-sm text-muted-foreground">{format(activity.date, "MMM d, yyyy")} · {activity.subject?.name ?? activity.category?.name ?? "Other"}</p></div>
              <div className="flex gap-2"><Badge tone={activity.sentiment === "POSITIVE" ? "positive" : activity.sentiment === "NEGATIVE" ? "negative" : "neutral"}>{activity.sentiment}</Badge><Badge>{formatMinutes(activity.durationMinutes)}</Badge></div>
            </CardContent>
          </Card>
        )) : <Empty text="No activities recorded yet." />}
      </div>
    </>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">{text}</div>;
}
