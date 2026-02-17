import { useAuth } from "@/_core/hooks/useAuth";
import ClassicLoader from "./ui/ClassicLoader";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ClassicLoader />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
