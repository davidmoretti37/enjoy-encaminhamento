import { useAuth } from "@/_core/hooks/useAuth";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
