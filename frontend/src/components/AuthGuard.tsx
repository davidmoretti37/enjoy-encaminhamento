import { useAuth } from "@/_core/hooks/useAuth";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) return null;

  return <>{children}</>;
}
