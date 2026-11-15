import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function StatCard({ title, value, detail, tone = "neutral" }: { title: string; value: string | number; detail?: string; tone?: "positive" | "negative" | "neutral" }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {detail ? <Badge className="mt-3" tone={tone}>{detail}</Badge> : null}
      </CardContent>
    </Card>
  );
}
