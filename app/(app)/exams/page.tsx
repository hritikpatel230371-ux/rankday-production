import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { QuickCreateForm } from "@/components/quick-create-form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ExamsPage() {
  const user = await requireUser();
  const exams = await prisma.exam.findMany({ where: { userId: user.id }, orderBy: { examDate: "asc" }, include: { subject: true } });
  return (
    <>
      <PageHeader title="Exams" description="Countdowns and urgency signals for preparedness." />
      <QuickCreateForm endpoint="/api/exams" fields={[{ name: "name", placeholder: "Exam name", required: true }, { name: "examDate", placeholder: "Exam date", type: "date", required: true }, { name: "totalMarks", placeholder: "Total marks", type: "number" }, { name: "targetMarks", placeholder: "Target marks", type: "number" }]} />
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {exams.length ? exams.map((exam) => {
          const days = Math.ceil((exam.examDate.getTime() - Date.now()) / 86_400_000);
          return <Card key={exam.id}><CardContent className="flex items-center justify-between gap-3 p-4"><div><p className="font-medium">{exam.name}</p><p className="text-sm text-muted-foreground">{format(exam.examDate, "MMM d, yyyy")} · {exam.subject?.name ?? "General"}</p></div><Badge tone={days <= 7 ? "negative" : "neutral"}>{Math.max(0, days)} days</Badge></CardContent></Card>;
        }) : <Empty text="No exams added yet." />}
      </div>
    </>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">{text}</div>;
}
