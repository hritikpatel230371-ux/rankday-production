"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Loader2, Gauge } from "lucide-react";

const SECTION_NAMES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/daily-log": "Daily Log",
  "/activities": "Activities",
  "/planner": "Planner",
  "/goals": "Goals",
  "/tasks": "To-Do List",
  "/exams": "Exams",
  "/syllabus": "Syllabus",
  "/tests": "Tests",
  "/analytics": "Analytics",
  "/insights": "AI Insights",
  "/rank": "Rank",
  "/settings": "Settings"
};

export function SectionTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, setIsPending] = useState(false);
  const [targetName, setTargetName] = useState<string>("");

  // When pathname or searchParams change, the navigation has completed
  useEffect(() => {
    setIsPending(false);
  }, [pathname, searchParams]);

  // Intercept clicks on any internal navigation link for instant 0ms feedback
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http") || target.target === "_blank") {
        return;
      }

      const currentPath = window.location.pathname;
      // Strip query parameters if any to compare base path
      const targetPath = href.split("?")[0];

      if (targetPath === currentPath) return;

      const sectionTitle = SECTION_NAMES[targetPath] || "Section";
      setTargetName(sectionTitle);
      setIsPending(true);
    }

    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, []);

  return (
    <div className="relative min-h-[70vh]">
      {/* Instant 0ms loading animation overlay on section click */}
      {isPending ? (
        <div className="absolute inset-0 z-40 flex min-h-[50vh] flex-col items-center justify-center animate-in fade-in-50 duration-100">
          {/* Glassmorphic backdrop over the old section */}
          <div className="absolute inset-0 bg-background/70 backdrop-blur-xs rounded-xl" />

          {/* Centered Modern Loading Animation Card */}
          <div className="relative z-10 flex flex-col items-center gap-4 rounded-2xl border border-border/80 bg-card/95 px-8 py-6 shadow-xl backdrop-blur-md animate-in zoom-in-95 duration-150">
            <div className="relative flex h-14 w-14 items-center justify-center">
              {/* Outer spinning gradient ring */}
              <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              {/* Inner ambient glow */}
              <div className="absolute inset-1 rounded-full bg-primary/10 blur-sm animate-pulse" />
              {/* Icon */}
              <Gauge className="h-6 w-6 text-primary animate-pulse" />
            </div>

            <div className="flex flex-col items-center gap-1 text-center">
              <span className="text-sm font-semibold tracking-tight text-foreground">
                Loading {targetName}...
              </span>
              <span className="text-xs text-muted-foreground">
                Fetching real-time metrics
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Main page content */}
      <div className={`transition-opacity duration-150 ${isPending ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
        {children}
      </div>
    </div>
  );
}

