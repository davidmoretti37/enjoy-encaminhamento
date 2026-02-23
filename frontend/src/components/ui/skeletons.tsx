import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";
import { Card, CardContent, CardHeader } from "./card";

// ─── Page Header ──────────────────────────────────────────

export function PageHeaderSkeleton({ centered = false }: { centered?: boolean }) {
  return (
    <div className={cn("space-y-3 mb-6", centered && "flex flex-col items-center")}>
      <Skeleton className="h-8 w-52" />
      <Skeleton className="h-4 w-80" />
    </div>
  );
}

// ─── Search Bar ───────────────────────────────────────────

export function SearchBarSkeleton() {
  return (
    <div className="flex items-center gap-3 mb-6">
      <Skeleton className="h-10 flex-1 rounded-lg" />
      <Skeleton className="h-10 w-10 rounded-lg" />
    </div>
  );
}

// ─── Stats Cards ──────────────────────────────────────────

export function StatsCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={cn(
      "grid gap-4 mb-6",
      count <= 3 ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-4"
    )}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="py-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </CardHeader>
          <CardContent className="px-4">
            <Skeleton className="h-7 w-16 mb-2" />
            <Skeleton className="h-3 w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Table ────────────────────────────────────────────────

export function TableSkeleton({ columns = 5, rows = 6 }: { columns?: number; rows?: number }) {
  return (
    <Card className="py-0 overflow-hidden">
      <div className="overflow-x-auto">
        {/* Header */}
        <div className="flex items-center gap-4 px-5 py-3.5 border-b bg-muted/30">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-3.5 flex-1 max-w-28" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex items-center gap-4 px-5 py-4 border-b last:border-0">
            {Array.from({ length: columns }).map((_, colIdx) => (
              <Skeleton
                key={colIdx}
                className={cn(
                  "h-4 flex-1",
                  colIdx === 0 && "max-w-36",
                  colIdx === columns - 1 && "max-w-20"
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Card Grid ────────────────────────────────────────────

export function CardGridSkeleton({
  count = 6,
  columns = 3,
}: { count?: number; columns?: 2 | 3 | 4 }) {
  const colClass = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-2 lg:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid grid-cols-1 gap-4", colClass[columns])}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="py-5">
          <CardContent className="space-y-3 px-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── List ─────────────────────────────────────────────────

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="py-4">
          <CardContent className="px-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full shrink-0" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Form / Settings ──────────────────────────────────────

export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-6">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
        <Skeleton className="h-10 w-32 rounded-lg" />
      </CardContent>
    </Card>
  );
}

// ─── Calendar ─────────────────────────────────────────────

export function CalendarSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-[300px_1fr]">
      <Card className="p-5">
        <Skeleton className="h-64 w-full rounded-lg" />
      </Card>
      <Card className="p-5">
        <div className="space-y-4">
          <Skeleton className="h-6 w-36" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Profile / Detail ─────────────────────────────────────

export function ProfileSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <Skeleton className="h-20 w-20 rounded-full shrink-0" />
          <div className="flex-1 space-y-3 text-center sm:text-left">
            <Skeleton className="h-6 w-44 mx-auto sm:mx-0" />
            <Skeleton className="h-4 w-56 mx-auto sm:mx-0" />
            <div className="flex gap-2 justify-center sm:justify-start">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Funnel Content ───────────────────────────────────────

export function FunnelContentSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-48 mb-2" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="py-4">
            <CardContent className="px-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
