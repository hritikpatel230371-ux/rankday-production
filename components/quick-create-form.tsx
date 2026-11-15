"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function QuickCreateForm({ endpoint, fields }: { endpoint: string; fields: Array<{ name: string; placeholder: string; type?: string; required?: boolean }> }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(formData: FormData) {
    setError("");
    setSaving(true);
    const payload: Record<string, string | number> = {};
    for (const [key, value] of formData.entries()) {
      if (value !== "") payload[key] = typeof value === "string" && /^\d+(\.\d+)?$/.test(value) ? Number(value) : String(value);
    }
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setError(result.error || "Could not save this item.");
        return;
      }
      formRef.current?.reset();
      router.refresh();
    } catch {
      setError("Could not reach RankDay. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form ref={formRef} action={submit} className="space-y-3 rounded-lg border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((field) => <Input key={field.name} name={field.name} type={field.type || "text"} placeholder={field.placeholder} required={field.required} disabled={saving} />)}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button size="sm" disabled={saving}>{saving ? "Saving..." : <><Plus className="h-4 w-4" /> Add</>}</Button>
    </form>
  );
}
