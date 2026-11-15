import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { QuickCreateForm } from "@/components/quick-create-form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function TestsPage() {
  const user = await requireUser();
  const tests = await prisma.test.findMany({ where: { userId: user.id }, orderBy: { date: "desc" }, include: { subject: true } });
  return (
    <>
      <PageHeader title="Tests" description="Track scores and improvement without manually calculating percentages." />
      <QuickCreateForm endpoint="/api/tests" fields={[{ name: "name", placeholder: "Test name", required: true }, { name: "date", placeholder: "Date", type: "date", required: true }, { name: "obtainedMarks", placeholder: "Obtained", type: "number", required: true }, { name: "totalMarks", placeholder: "Total", type: "number", required: true }]} />
      <div className="mt-5 grid gap-3">
        {tests.length ? tests.map((test) => <Card key={test.id}><CardContent className="flex items-center justify-between gap-3 p-4"><div><p className="font-medium">{test.name}</p><p className="text-sm text-muted-foreground">{format(test.date, "MMM d, yyyy")} · {test.subject?.name ?? "General"}</p></div><Badge tone={test.percentage >= 70 ? "positive" : "neutral"}>{Math.round(test.percentage)}%</Badge></CardContent></Card>) : <Empty text="No tests recorded yet." />}
      </div>
    </>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">{text}</div>;
}
