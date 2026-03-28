import { useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";

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
            // Check if company onboarding is complete
            try {
              const onbRes = await fetch("/api/trpc/company.checkOnboarding", {
                headers: { Authorization: `Bearer ${session.access_token}` },
              });
              const onbJson = await onbRes.json();
              if (onbJson?.result?.data?.json?.completed === false) {
                setLocation("/company/onboarding");
              } else {
                setLocation("/company/portal");
              }
            } catch {
              setLocation("/company/portal");
            }
          } else if (role === "candidate") {
            // Check if candidate onboarding is complete
            try {
              const onbRes = await fetch("/api/trpc/candidate.checkOnboarding", {
                headers: { Authorization: `Bearer ${session.access_token}` },
              });
              const onbJson = await onbRes.json();
              if (onbJson?.result?.data?.json?.completed === false) {
                setLocation("/candidate/onboarding");
              } else {
                setLocation("/candidate");
              }
            } catch {
              setLocation("/candidate");
            }
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

  return <DashboardLayoutSkeleton />;
}
