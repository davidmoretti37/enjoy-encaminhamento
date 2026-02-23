import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  AgencyFunnelProvider,
  useAgencyFunnel,
} from "@/contexts/AgencyFunnelContext";
import ContentTransition from "@/components/ui/ContentTransition";
import { ListSkeleton, SearchBarSkeleton } from "@/components/ui/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardContent from "@/components/agency-steps/DashboardContent";
import JobDescriptionTab from "@/components/agency-steps/JobDescriptionTab";
import ManagementTab from "@/components/agency-steps/ManagementTab";
import DashboardLayout from "@/components/DashboardLayout";

function AgencyPortalContent() {
  const {
    activeTab,
    isLoading,
  } = useAgencyFunnel();

  console.log('[AgencyPortalContent] Rendering, activeTab:', activeTab, 'isLoading:', isLoading);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="py-4">
          <SearchBarSkeleton />
          <ListSkeleton count={5} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {activeTab === "dashboard" ? (
        <DashboardContent />
      ) : activeTab === "job-description" ? (
        <JobDescriptionTab />
      ) : (
        <ManagementTab />
      )}
    </DashboardLayout>
  );
}

export default function AgencyPortal() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Not logged in
  if (!user) {
    setLocation("/login");
    return null;
  }

  // Both admin and agency users see the new portal
  if (user.role === "admin" || user.role === "agency") {
    console.log('[AgencyPortal] User detected:', user.role, '- rendering new portal');
    return (
      <AgencyFunnelProvider>
        <AgencyPortalContent />
      </AgencyFunnelProvider>
    );
  }

  // Other roles not authorized
  setLocation("/login");
  return null;
}
