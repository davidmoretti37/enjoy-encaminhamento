import { Skeleton } from './ui/skeleton';

export function DashboardLayoutSkeleton() {
  return (
    <div className="min-h-screen relative">
      {/* Background matching DashboardLayout */}
      <div className="fixed inset-0 -z-10 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(255,107,53,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(255,107,53,0.12),transparent_50%)]" />
      </div>

      {/* Sidebar skeleton (matches LumaBar position) */}
      <div className="fixed left-2 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col items-center gap-2 py-3 px-1.5 rounded-2xl bg-white/80 border border-border/50 shadow-sm backdrop-blur-sm">
        <Skeleton className="h-8 w-8 rounded-lg mb-2" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-9 rounded-xl" />
        ))}
        <div className="mt-auto pt-4">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>

      {/* Main content skeleton */}
      <main className="pt-6 pl-20 pr-4 pb-6 max-w-7xl mx-auto">
        {/* Page title */}
        <div className="space-y-3 mb-8">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-80" />
        </div>

        {/* Stats cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl border py-4 px-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>

        {/* Content area */}
        <div className="bg-card rounded-xl border shadow-sm p-5 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-2">
              <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
