import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="Settings" description="Profile, theme, AI preferences, rank preferences, export, and account controls." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Profile</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>{user.name}</p><p className="text-muted-foreground">{user.email}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>AI preferences</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Set GEMINI_API_KEY and AI_PROVIDER=gemini to use Gemini. For local development without a key, explicitly set AI_PROVIDER=mock; mock output is labelled and is never presented as Gemini.</CardContent></Card>
        <Card><CardHeader><CardTitle>Data export</CardTitle></CardHeader><CardContent><Button asChild><Link href="/api/export">Export JSON</Link></Button></CardContent></Card>
        <Card><CardHeader><CardTitle>Rank preferences</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Weights are stored in Profile.rankWeights and can be customized from the database/API layer.</CardContent></Card>
      </div>
    </>
  );
}
