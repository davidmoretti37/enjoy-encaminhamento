import React, { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

interface Agency {
  id: string;
  name: string;
  city: string | null;
}

interface AgencyContextType {
  currentAgency: Agency | null;
  availableAgencies: Agency[];
  isLoading: boolean;
  isAllAgenciesMode: boolean;
  setCurrentAgency: (agencyId: string | null) => void;
}

const AgencyContext = createContext<AgencyContextType | undefined>(undefined);

export function AgencyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // Only fetch for admin users
  const isAdmin = user?.role === "admin";

  // Local state for optimistic updates
  const [optimisticAgency, setOptimisticAgency] = useState<Agency | null | undefined>(undefined);

  // Get current agency context
  const { data: serverAgency, isLoading: isLoadingCurrent } =
    trpc.agencyContext.getCurrent.useQuery(undefined, {
      enabled: isAdmin,
    });

  // Get available agencies
  const { data: availableAgencies = [], isLoading: isLoadingAgencies } =
    trpc.agencyContext.getAvailable.useQuery(undefined, {
      enabled: isAdmin,
    });

  // Sync optimistic state with server state when server data changes
  useEffect(() => {
    if (!isLoadingCurrent) {
      setOptimisticAgency(undefined); // Clear optimistic state when server responds
    }
  }, [serverAgency, isLoadingCurrent]);

  // Mutation to set current agency
  const setCurrentMutation = trpc.agencyContext.setCurrent.useMutation({
    onSuccess: () => {
      // Invalidate all queries that depend on agency context
      utils.agencyContext.getCurrent.invalidate();

      // Outreach queries
      utils.outreach.getAvailability.invalidate();
      utils.outreach.getMeetings.invalidate();
      utils.outreach.getAdminSettings.invalidate();
      utils.outreach.getAllCompanyForms.invalidate();

      // Affiliate data queries
      utils.affiliate.getAgencies.invalidate();
      utils.affiliate.getCandidates.invalidate();
      utils.affiliate.getCompanies.invalidate();
      utils.affiliate.getJobs.invalidate();
      utils.affiliate.getContracts.invalidate();
      utils.affiliate.getPayments.invalidate();
      utils.affiliate.getApplications.invalidate();
      utils.affiliate.getDashboardStats.invalidate();

      // Agency queries (used by SettingsPage + agency views)
      utils.agency.getDocumentTemplates.invalidate();
      utils.agency.getContract.invalidate();

      // Admin queries (used by admin role)
      utils.candidate.getAllForAdmin.invalidate();
      utils.admin.getAllApplications.invalidate();
      utils.admin.getAllContracts.invalidate();
      utils.admin.getAllPayments.invalidate();
    },
    onError: (error) => {
      // Revert optimistic update on error
      console.error('Failed to set agency context:', error);
      setOptimisticAgency(undefined);
    },
  });

  const setCurrentAgency = (agencyId: string | null) => {
    // Optimistic update - immediately show the new agency
    if (agencyId === null) {
      setOptimisticAgency(null);
    } else {
      const agency = availableAgencies.find(s => s.id === agencyId);
      if (agency) {
        setOptimisticAgency(agency);
      }
    }
    setCurrentMutation.mutate({ agencyId });
  };

  // Use optimistic state if set, otherwise use server state
  const currentAgency = optimisticAgency !== undefined ? optimisticAgency : (serverAgency || null);

  const value: AgencyContextType = {
    currentAgency,
    availableAgencies,
    isLoading: isLoadingCurrent || isLoadingAgencies,
    isAllAgenciesMode: currentAgency === null,
    setCurrentAgency,
  };

  return (
    <AgencyContext.Provider value={value}>{children}</AgencyContext.Provider>
  );
}

export function useAgencyContext() {
  const context = useContext(AgencyContext);
  if (context === undefined) {
    throw new Error("useAgencyContext must be used within an AgencyProvider");
  }
  return context;
}
