"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type ExtractedActivity = {
  title: string;
  category: string;
  subject?: string | null;
  durationMinutes?: number | null;
  plannedMinutes?: number | null;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  importance: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence?: number;
  needsConfirmation?: boolean;
};

type Analysis = {
  activities: ExtractedActivity[];
  timeWaste: ExtractedActivity[];
  tests: Array<{ name: string; subject?: string | null; obtainedMarks: number; totalMarks: number; difficulty: number }>;
  pendingItems: string[];
  summary: Record<string, unknown>;
};

const sample = "Today I planned to study DBMS for 5 hours but studied for 3 hours. I completed Unit 2, solved 15 SQL questions, scored 78 in the maths test, worked on my project for 2 hours, and wasted around 1.5 hours watching reels. I still have OS Unit 4 pending.";

export function DailyLogClient() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState<"idle" | "analyzing" | "saving">("idle");
  const [error, setError] = useState("");
  const [rank, setRank] = useState<{ delta: number; score: number; reasons: Array<{ label: string; delta: number; tone: string }> } | null>(null);

  const activities = useMemo(() => analysis ? [...analysis.activities, ...analysis.timeWaste] : [], [analysis]);

  async function analyze() {
    setLoading("analyzing");
    setError("");
    setRank(null);
    setAnalysis(null);
    try {
      const response = await fetch("/api/daily-log/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setError(result.error || "AI analysis is temporarily unavailable. You can add activities manually.");
        return;
      }
      setAnalysis(result.data);
    } catch {
      setError("Could not reach RankDay. Check your connection and try again.");
    } finally {
      setLoading("idle");
    }
  }

  function updateActivity(index: number, patch: Partial<ExtractedActivity>) {
    if (!analysis) return;
    const combined = [...analysis.activities, ...analysis.timeWaste];
    combined[index] = { ...combined[index], ...patch };
    setAnalysis({ ...analysis, activities: combined.filter((item) => item.sentiment !== "NEGATIVE"), timeWaste: combined.filter((item) => item.sentiment === "NEGATIVE") });
  }

  function removeActivity(index: number) {
    if (!analysis) return;
    const combined = activities.filter((_, i) => i !== index);
    setAnalysis({ ...analysis, activities: combined.filter((item) => item.sentiment !== "NEGATIVE"), timeWaste: combined.filter((item) => item.sentiment === "NEGATIVE") });
  }

  async function save() {
    if (!analysis) return;
    setLoading("saving");
    setError("");
    try {
      const response = await fetch("/api/daily-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: text, activities, tests: analysis.tests, pendingItems: analysis.pendingItems, summary: analysis.summary })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setError(result.error || "Something went wrong while saving your data. Please try again.");
        return;
      }
      setRank(result.data.rank);
      router.refresh();
    } catch {
      setError("Could not reach RankDay. Check your connection and try again.");
    } finally {
      setLoading("idle");
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
      <Card>
        <CardHeader><CardTitle>Tell me about your day</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Textarea value={text} onChange={(event) => { setText(event.target.value); setAnalysis(null); setRank(null); }} rows={12} placeholder={sample} className="min-h-56 resize-y text-base" />
          {error ? <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
          <div className="flex flex-wrap gap-2">
            <Button onClick={analyze} disabled={loading !== "idle" || text.length < 10}>
              {loading === "analyzing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {loading === "analyzing" ? "Understanding your day..." : "Analyze My Day"}
            </Button>
            <Button variant="outline" onClick={() => setText(sample)}>Use example</Button>
            <Button variant="ghost" onClick={() => { setText(""); setAnalysis(null); setRank(null); }}>Clear</Button>
          </div>
          {loading === "analyzing" ? <p className="text-sm text-muted-foreground">Extracting activities, calculating progress signals, and preparing confirmation.</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Confirm extracted facts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!analysis ? <Empty text="No analysis yet. Write your log and run AI analysis." /> : null}
          {activities.map((activity, index) => (
            <div key={`${activity.title}-${index}`} className="space-y-3 rounded-md border p-3">
              <div className="flex items-start justify-between gap-3">
                <Input value={activity.title} onChange={(event) => updateActivity(index, { title: event.target.value })} />
                <Button variant="ghost" size="icon" aria-label="Delete activity" onClick={() => removeActivity(index)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input value={activity.category} onChange={(event) => updateActivity(index, { category: event.target.value })} aria-label="Category" />
                <Input value={activity.subject || ""} onChange={(event) => updateActivity(index, { subject: event.target.value })} aria-label="Subject" placeholder="Subject" />
                <Input type="number" value={activity.durationMinutes ?? ""} onChange={(event) => updateActivity(index, { durationMinutes: event.target.value ? Number(event.target.value) : null })} aria-label="Duration minutes" placeholder="Minutes" />
                <select className="rounded-md border bg-background px-3 text-sm" value={activity.importance} onChange={(event) => updateActivity(index, { importance: event.target.value as ExtractedActivity["importance"] })}>
                  <option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={activity.sentiment === "POSITIVE" ? "positive" : activity.sentiment === "NEGATIVE" ? "negative" : "neutral"}>{activity.sentiment}</Badge>
                {activity.needsConfirmation ? <Badge tone="negative">needs confirmation</Badge> : null}
              </div>
            </div>
          ))}
          {analysis ? (
            <Button onClick={save} disabled={loading !== "idle" || !activities.length} className="w-full">
              {loading === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Confirm and Update Rank
            </Button>
          ) : null}
          {rank ? (
            <div className="rounded-md border border-primary/30 bg-primary/10 p-4">
              <p className="text-lg font-semibold">Rank changed {rank.delta >= 0 ? "+" : ""}{rank.delta} to {rank.score}</p>
              <div className="mt-3 space-y-2">
                {rank.reasons.slice(0, 5).map((reason) => <div key={reason.label} className="flex justify-between text-sm"><span>{reason.label}</span><span>{reason.delta >= 0 ? "+" : ""}{reason.delta}</span></div>)}
              </div>
            </div>
          ) : null}
          {analysis ? <Button variant="outline" onClick={() => setAnalysis({ ...analysis, activities: [...activities, { title: "New activity", category: "Other", sentiment: "NEUTRAL", importance: "MEDIUM" }], timeWaste: [] })}><Plus className="h-4 w-4" /> Add item</Button> : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{text}</div>;
}
