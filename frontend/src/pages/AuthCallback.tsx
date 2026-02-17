import { useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import ClassicLoader from "@/components/ui/ClassicLoader";

export default function AuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleCallback = async () => {
      // Supabase will automatically pick up the tokens from the URL hash
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error("[AuthCallback] Error:", error);
        setLocation("/login");
        return;
      }

      if (session) {
        // Give the backend a moment to auto-create the profile
        await new Promise((r) => setTimeout(r, 500));

        // Fetch the user's role to redirect properly
        try {
          const res = await fetch("/api/trpc/auth.me", {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          const json = await res.json();
          const role = json?.result?.data?.role;

          if (role === "admin") {
            setLocation("/admin/dashboard");
          } else if (role === "agency") {
            setLocation("/agency/portal");
          } else if (role === "company") {
            setLocation("/company/portal");
          } else if (role === "candidate") {
            setLocation("/candidate");
          } else {
            setLocation("/candidate/onboarding");
          }
        } catch {
          setLocation("/candidate/onboarding");
        }
      } else {
        setLocation("/login");
      }
    };

    handleCallback();
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-4">
        <ClassicLoader />
        <p className="text-slate-600">Autenticando...</p>
      </div>
    </div>
  );
}
