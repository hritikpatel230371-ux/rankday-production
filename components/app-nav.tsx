"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  BarChart3,
  BookOpen,
  Brain,
  CalendarDays,
  ClipboardCheck,
  Gauge,
  Home,
  Layers3,
  LineChart,
  ListTodo,
  NotebookPen,
  Settings,
  Trophy
} from "lucide-react";

export const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/daily-log", label: "Daily Log", icon: NotebookPen },
  { href: "/activities", label: "Activities", icon: ClipboardCheck },
  { href: "/planner", label: "Planner", icon: CalendarDays },
  { href: "/goals", label: "Goals", icon: Trophy },
  { href: "/tasks", label: "To-Do", icon: ListTodo },
  { href: "/exams", label: "Exams", icon: BookOpen },
  { href: "/syllabus", label: "Syllabus", icon: Layers3 },
  { href: "/tests", label: "Tests", icon: Gauge },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/insights", label: "AI Insights", icon: Brain },
  { href: "/rank", label: "Rank", icon: LineChart },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function DesktopNav() {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  return (
    <nav className="space-y-1 p-3">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const isPending = pendingHref === item.href && !isActive;

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            onClick={() => {
              if (pathname !== item.href) {
                setPendingHref(item.href);
              }
            }}
            className={`group flex items-center justify-between rounded-md px-3 py-2 text-sm transition-all duration-150 ${
              isActive
                ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
                : isPending
                ? "bg-secondary/90 text-foreground font-medium animate-pulse"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-3">
              <item.icon
                className={`h-4 w-4 transition-colors ${
                  isActive
                    ? "text-primary"
                    : isPending
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground"
                }`}
              />
              <span>{item.label}</span>
            </div>

            {isActive ? (
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            ) : isPending ? (
              <div className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-ping" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const mobileItems = [
    navItems[0], // Dashboard
    navItems[1], // Daily Log
    navItems[5], // To-Do
    navItems[10], // AI Insights
    { href: "/settings", label: "More", icon: Settings }
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card/95 p-1 backdrop-blur xl:hidden">
      {mobileItems.map((item) => {
        const isActive = pathname === item.href;
        const isPending = pendingHref === item.href && !isActive;

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            onClick={() => {
              if (pathname !== item.href) {
                setPendingHref(item.href);
              }
            }}
            className={`flex flex-col items-center gap-1 rounded-md px-2 py-2 text-[11px] transition-colors ${
              isActive
                ? "text-primary font-semibold"
                : isPending
                ? "text-primary font-medium animate-pulse"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <item.icon
              className={`h-4 w-4 ${isActive ? "text-primary" : isPending ? "text-primary" : ""}`}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
