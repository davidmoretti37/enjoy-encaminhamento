import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Users, Building, Briefcase, FileCheck, DollarSign, Calendar, MapPin, UserCheck, Bell, Home, Settings } from "lucide-react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import LumaBar from "./ui/LumaBar";
import AgencyFilterHeader from "./AgencyFilterHeader";
import { trpc } from "@/lib/trpc";
import { useEffect } from "react";

interface MenuItem {
  icon: any;
  label: string;
  path: string;
  badge?: number;
}

const getMenuItems = (userRole: string | undefined): { homeHref: string; profileHref: string; items: MenuItem[] } => {
  // Admin menu
  if (userRole === 'admin') {
    return {
      homeHref: "/agency/portal",
      profileHref: "/settings",
      items: [
        { icon: Calendar, label: "Agenda", path: "/calendar" },
        { icon: Briefcase, label: "Vagas", path: "/agency/portal?tab=job-description" },
        { icon: Building, label: "Gerenciamento", path: "/agency/portal?tab=management" },
        { icon: DollarSign, label: "Pagamentos", path: "/payments" },
        { icon: MapPin, label: "Agências", path: "/admin/agencies" },
        { icon: Bell, label: "Notificações", path: "/notifications" },
      ]
    };
  }

  // Agency menu
  if (userRole === 'agency') {
    return {
      homeHref: "/agency/portal",
      profileHref: "/settings",
      items: [
        { icon: Calendar, label: "Agenda", path: "/calendar" },
        { icon: Briefcase, label: "Vagas", path: "/agency/portal?tab=job-description" },
        { icon: Building, label: "Gerenciamento", path: "/agency/portal?tab=management" },
        { icon: DollarSign, label: "Pagamentos", path: "/payments" },
        { icon: Bell, label: "Notificações", path: "/notifications" },
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
        { icon: Bell, label: "Notificações", path: "/notifications" },
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
        { icon: Bell, label: "Notificações", path: "/notifications" },
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

  // Payment alert counts for admin/agency
  const paymentAlertsQuery = trpc.admin.getPaymentAlertCounts.useQuery(undefined, {
    enabled: !!user && (user.role === 'super_admin' || user.role === 'admin' || user.role === 'agency'),
    refetchInterval: 60000,
  });

  // Payment stats for company (to show overdue badge)
  const companyPaymentStatsQuery = trpc.company.getPaymentStats.useQuery(undefined, {
    enabled: !!user && user.role === 'company',
    refetchInterval: 60000,
  });

  // Notification count for badge
  const notificationCountQuery = trpc.notification.getUnreadCount.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
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
    return <DashboardLayoutSkeleton />;
  }

  // Show loading while checking onboarding
  if (user?.role === 'company' && companyOnboardingQuery.isLoading) {
    return <DashboardLayoutSkeleton />;
  }

  if (user?.role === 'candidate' && candidateOnboardingQuery.isLoading) {
    return <DashboardLayoutSkeleton />;
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

  // Compute payment badge based on role
  let paymentBadge = 0;
  if (user.role === 'super_admin' || user.role === 'admin' || user.role === 'agency') {
    paymentBadge = paymentAlertsQuery.data?.total || 0;
  } else if (user.role === 'company') {
    // Show badge if there's overdue amount
    const overdueAmount = companyPaymentStatsQuery.data?.overdue || 0;
    paymentBadge = overdueAmount > 0 ? 1 : 0;
  }

  // Notification badge
  const notificationBadge = notificationCountQuery.data || 0;

  const { homeHref, profileHref, items } = getMenuItems(user?.role ?? undefined);
  console.log('[DashboardLayout] User role:', user?.role, 'Menu items:', items.map(i => ({ label: i.label, path: i.path })));

  const navItems = items.map(item => ({
    label: item.label,
    href: item.path,
    icon: item.icon,
    badge: item.path.includes('payment') ? paymentBadge :
           item.path.includes('notification') ? notificationBadge : undefined,
  }));

  return (
    <div className="min-h-screen relative">
      {/* Background with corner gradients */}
      <div className="fixed inset-0 -z-10 bg-white">
        {/* Top-left corner gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(255,107,53,0.15),transparent_50%)]"></div>
        {/* Bottom-right corner gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(255,107,53,0.12),transparent_50%)]"></div>
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
