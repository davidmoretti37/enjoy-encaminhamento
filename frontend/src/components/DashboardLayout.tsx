import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Users, Building, Briefcase, FileCheck, DollarSign, Calendar, MapPin, UserCheck } from "lucide-react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import LumaBar from "./ui/LumaBar";
import AgencyFilterHeader from "./AgencyFilterHeader";
import { trpc } from "@/lib/trpc";
import { useEffect } from "react";

const getMenuItems = (userRole: string | undefined) => {
  // Admin menu
  if (userRole === 'admin') {
    return {
      homeHref: "/admin/dashboard",
      profileHref: "/settings",
      items: [
        { icon: Calendar, label: "Agenda", path: "/calendar" },
        { icon: Building, label: "Empresas", path: "/companies" },
        { icon: Users, label: "Candidatos", path: "/candidates" },
        { icon: DollarSign, label: "Pagamentos", path: "/payments" },
        { icon: MapPin, label: "Agências", path: "/admin/agencies" },
      ]
    };
  }

  // Agency menu
  if (userRole === 'agency') {
    return {
      homeHref: "/agency/dashboard",
      profileHref: "/settings",
      items: [
        { icon: Calendar, label: "Agenda", path: "/calendar" },
        { icon: Building, label: "Empresas", path: "/companies" },
        { icon: Users, label: "Candidatos", path: "/candidates" },
        { icon: DollarSign, label: "Pagamentos", path: "/payments" },
      ]
    };
  }

  // Company menu
  if (userRole === 'company') {
    return {
      homeHref: "/company/portal",
      profileHref: "/company/settings",
      items: [
        { icon: Briefcase, label: "Vagas", path: "/company/jobs" },
        { icon: UserCheck, label: "Candidatos", path: "/company/selection" },
        { icon: Calendar, label: "Agenda", path: "/company/scheduling" },
        { icon: Users, label: "Funcionários", path: "/company/employees" },
        { icon: DollarSign, label: "Pagamentos", path: "/company/payments" },
      ]
    };
  }

  // Candidate menu
  if (userRole === 'candidate') {
    return {
      homeHref: "/candidate",
      profileHref: "/candidate/perfil",
      items: [
        { icon: Briefcase, label: "Vagas", path: "/candidate/vagas" },
        { icon: FileCheck, label: "Candidaturas", path: "/candidate/candidaturas" },
      ]
    };
  }

  // Default empty menu
  return { homeHref: "/", profileHref: "/settings", items: [] };
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, user, logout } = useAuth();
  const [location] = useLocation();

  // Check onboarding status for companies
  const companyOnboardingQuery = trpc.company.checkOnboarding.useQuery(undefined, {
    enabled: !!user && user.role === 'company',
  });

  // Check onboarding status for candidates
  const candidateOnboardingQuery = trpc.candidate.checkOnboarding.useQuery(undefined, {
    enabled: !!user && user.role === 'candidate',
  });

  // Redirect to onboarding if needed
  useEffect(() => {
    if (!user) return;

    // Don't redirect if already on onboarding page
    if (location.includes('/onboarding')) return;

    if (user.role === 'company' && companyOnboardingQuery.data && !companyOnboardingQuery.data.completed) {
      window.location.href = '/company/onboarding';
    }

    if (user.role === 'candidate' && candidateOnboardingQuery.data && !candidateOnboardingQuery.data.completed) {
      window.location.href = '/candidate/onboarding';
    }
  }, [user, location, companyOnboardingQuery.data, candidateOnboardingQuery.data]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  // Show loading while checking onboarding
  if (user?.role === 'company' && companyOnboardingQuery.isLoading) {
    return <DashboardLayoutSkeleton />
  }

  if (user?.role === 'candidate' && candidateOnboardingQuery.isLoading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Welcome</h1>
            <p className="text-sm text-muted-foreground">
              Please sign in to continue
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  const { homeHref, profileHref, items } = getMenuItems(user?.role ?? undefined);
  const navItems = items.map(item => ({
    label: item.label,
    href: item.path,
    icon: item.icon,
  }));

  return (
    <div className="min-h-screen relative">
      {/* Background with corner gradients */}
      <div className="fixed inset-0 -z-10 bg-white">
        {/* Top-left corner gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(59,130,246,0.15),transparent_50%)]"></div>
        {/* Bottom-right corner gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(59,130,246,0.12),transparent_50%)]"></div>
      </div>

      {/* Agency filter dropdown for admins - floats top-left */}
      <AgencyFilterHeader />

      <main className="pt-6 pl-20 pr-4 pb-6 max-w-7xl mx-auto">
        {children}
      </main>

      <LumaBar
        items={navItems}
        homeHref={homeHref}
        profileHref={profileHref}
        activeHref={location}
        user={{
          name: user.name || undefined,
          email: user.email || undefined,
        }}
        onLogout={logout}
      />
    </div>
  );
}
