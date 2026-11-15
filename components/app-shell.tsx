import { redirect } from "next/navigation";
import { Gauge } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { clearSession } from "@/lib/auth";
import { appConfig } from "@/lib/config";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { DesktopNav, MobileNav } from "@/components/app-nav";
import { SectionTransition } from "@/components/section-transition";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-card/80 backdrop-blur xl:block">
        <div className="flex h-16 items-center gap-3 border-b px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-xs">
            <Gauge className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">{appConfig.name}</div>
            <div className="text-xs text-muted-foreground">Command center</div>
          </div>
        </div>

        {/* Interactive desktop navigation with active state & click feedback */}
        <DesktopNav />
      </aside>

      <div className="xl:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/85 px-4 backdrop-blur md:px-8">
          <div className="min-w-0">
            <p className="truncate text-sm text-muted-foreground">Signed in as {user.name}</p>
            <h1 className="truncate text-base font-semibold">Build the day. Move the rank.</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <form action={async () => {
              "use server";
              await clearSession();
              redirect("/login");
            }}>
              <Button variant="outline" size="sm">Sign out</Button>
            </form>
          </div>
        </header>

        <main className="px-4 pt-6 pb-24 md:px-8 md:pt-8 md:pb-24 xl:pb-8">
          <SectionTransition>{children}</SectionTransition>
        </main>
      </div>

      {/* Interactive mobile bottom navigation */}
      <MobileNav />
    </div>
  );
}
