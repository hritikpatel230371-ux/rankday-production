import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AppLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-150">
      {/* Page Header Skeleton */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44 rounded-md" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      {/* Hero Metric & Stat Cards Skeleton */}
      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <Card className="overflow-hidden border border-border/60">
          <CardHeader className="space-y-3 pb-4">
            <Skeleton className="h-5 w-32 rounded-md" />
            <Skeleton className="h-12 w-28 rounded-lg" />
          </CardHeader>
          <CardContent className="space-y-2.5">
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-4/5 rounded-md" />
          </CardContent>
        </Card>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
          <Card className="border border-border/60">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-28 rounded-md" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2 rounded-md" />
              <Skeleton className="h-3 w-36 rounded-md" />
            </CardContent>
          </Card>
          <Card className="border border-border/60">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-28 rounded-md" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2 rounded-md" />
              <Skeleton className="h-3 w-36 rounded-md" />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts & Interactive Panels Skeleton */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border border-border/60">
          <CardHeader>
            <Skeleton className="h-5 w-36 rounded-md" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-48 w-full rounded-lg" />
          </CardContent>
        </Card>

        <Card className="border border-border/60">
          <CardHeader>
            <Skeleton className="h-5 w-40 rounded-md" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Lists Skeleton */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="border border-border/60">
          <CardHeader>
            <Skeleton className="h-4 w-32 rounded-md" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </CardContent>
        </Card>
        <Card className="border border-border/60">
          <CardHeader>
            <Skeleton className="h-4 w-32 rounded-md" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </CardContent>
        </Card>
        <Card className="border border-border/60">
          <CardHeader>
            <Skeleton className="h-4 w-32 rounded-md" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
