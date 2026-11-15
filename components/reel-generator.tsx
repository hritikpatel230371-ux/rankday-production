"use client";

import { useState } from "react";
import { Check, Clapperboard, Copy, Download, FileText, Loader2, Sparkles, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const TONES = [
  { id: "natural", label: "Natural Vlog", desc: "Aesthetic, authentic day-in-the-life style" },
  { id: "funny", label: "Relatable & Meme", desc: "Humorous, student/dev grind reality" },
  { id: "emotional", label: "Cinematic & Inspiring", desc: "Disciplined, motivational comeback energy" },
  { id: "professional", label: "High-Performance", desc: "Clean metrics, deep work & systems audit" }
] as const;

export function ReelGenerator() {
  const [script, setScript] = useState("");
  const [provider, setProvider] = useState<"gemini" | "groq" | "mock" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedTone, setSelectedTone] = useState<"natural" | "funny" | "emotional" | "professional">("natural");
  const [selectedRange, setSelectedRange] = useState<"Today" | "Past 7 Days">("Today");
  const [copied, setCopied] = useState(false);

  async function generate(tone = selectedTone, range = selectedRange) {
    setLoading(true);
    setError("");
    setScript("");
    setProvider(null);
    setCopied(false);
    try {
      const response = await fetch("/api/reel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rangeLabel: range, tone })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setError(result.error || "Could not generate a script.");
        return;
      }
      setScript(result.data.script);
      setProvider(result.data.provider);
    } catch {
      setError("Could not reach RankDay. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!script) return;
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!script) return;
    const blob = new Blob([script], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rankday-reel-script-${selectedRange.toLowerCase().replace(/\s+/g, "-")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const wordCount = script ? script.trim().split(/\s+/).filter(Boolean).length : 0;
  // Estimated spoken voiceover time assuming standard conversational speed of ~130 wpm
  const estimatedSeconds = Math.max(15, Math.round((wordCount / 2.5)));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clapperboard className="h-5 w-5 text-primary" />
              Generate My Reel
            </CardTitle>
            <CardDescription className="mt-1">
              Turn your real activities and stats into a ready-to-record 30-45s short-form video script.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {error ? (
          <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            1. Select Time Range
          </label>
          <div className="flex gap-2">
            {(["Today", "Past 7 Days"] as const).map((range) => (
              <Button
                key={range}
                type="button"
                size="sm"
                variant={selectedRange === range ? "default" : "outline"}
                onClick={() => setSelectedRange(range)}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            2. Choose Reel Vibe & Tone
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {TONES.map((tone) => (
              <button
                key={tone.id}
                type="button"
                onClick={() => setSelectedTone(tone.id)}
                className={`flex flex-col items-start rounded-lg border p-3 text-left transition-all ${
                  selectedTone === tone.id
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border hover:bg-secondary/50"
                }`}
              >
                <span className="text-sm font-medium">{tone.label}</span>
                <span className="text-xs text-muted-foreground">{tone.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <Button
          type="button"
          onClick={() => generate(selectedTone, selectedRange)}
          disabled={loading}
          className="w-full gap-2 py-5 text-sm font-semibold sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Crafting Your Script...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate {selectedRange} Reel ({TONES.find((t) => t.id === selectedTone)?.label})
            </>
          )}
        </Button>

        {script ? (
          <div className="space-y-3 pt-3 border-t">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" />
                  Production Blueprint & Storyboard
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
                  <Timer className="h-3 w-3" />
                  ~{wordCount} words ({estimatedSeconds}s spoken VO)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleDownload} className="gap-1.5 h-8 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  Download .txt
                </Button>
                <Button size="sm" variant="default" onClick={handleCopy} className="gap-1.5 h-8 text-xs">
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied to Clipboard!" : "Copy Full Script"}
                </Button>
              </div>
            </div>

            <pre className="max-h-[600px] overflow-y-auto whitespace-pre-wrap rounded-lg border bg-secondary/30 p-4 font-mono text-xs leading-relaxed text-foreground shadow-inner sm:text-sm">
              {script}
            </pre>

            {provider ? (
              <p className="text-xs text-muted-foreground flex items-center justify-between">
                <span>
                  {provider === "mock"
                    ? "Generated in development mock mode. To use live AI, configure GEMINI_API_KEY or GROQ_API_KEY in .env.local."
                    : provider === "groq"
                    ? "Generated with Groq (Llama 3.1 8B Instant) in maximum-detail storyboard mode."
                    : "Generated with Gemini 3 Flash in maximum-detail storyboard mode."}
                </span>
                <span className="text-[11px] text-muted-foreground/70">
                  Ready for Instagram Reels, Shorts & TikTok
                </span>
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
