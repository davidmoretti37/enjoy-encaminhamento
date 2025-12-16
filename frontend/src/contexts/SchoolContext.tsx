import React, { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

interface School {
  id: string;
  name: string;
  city: string | null;
}

interface SchoolContextType {
  currentSchool: School | null;
  availableSchools: School[];
  isLoading: boolean;
  isAllSchoolsMode: boolean;
  setCurrentSchool: (schoolId: string | null) => void;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export function SchoolProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // Only fetch for affiliate (admin) users
  const isAdmin = user?.role === "affiliate";

  // Local state for optimistic updates
  const [optimisticSchool, setOptimisticSchool] = useState<School | null | undefined>(undefined);

  // Get current school context
  const { data: serverSchool, isLoading: isLoadingCurrent } =
    trpc.schoolContext.getCurrent.useQuery(undefined, {
      enabled: isAdmin,
    });

  // Get available schools
  const { data: availableSchools = [], isLoading: isLoadingSchools } =
    trpc.schoolContext.getAvailable.useQuery(undefined, {
      enabled: isAdmin,
    });

  // Sync optimistic state with server state when server data changes
  useEffect(() => {
    if (!isLoadingCurrent) {
      setOptimisticSchool(undefined); // Clear optimistic state when server responds
    }
  }, [serverSchool, isLoadingCurrent]);

  // Mutation to set current school
  const setCurrentMutation = trpc.schoolContext.setCurrent.useMutation({
    onSuccess: () => {
      // Invalidate all queries that depend on school context
      utils.schoolContext.getCurrent.invalidate();

      // Outreach queries
      utils.outreach.getAvailability.invalidate();
      utils.outreach.getMeetings.invalidate();
      utils.outreach.getAdminSettings.invalidate();
      utils.outreach.getAllCompanyForms.invalidate();

      // Affiliate data queries
      utils.affiliate.getCandidates.invalidate();
      utils.affiliate.getCompanies.invalidate();
      utils.affiliate.getJobs.invalidate();
      utils.affiliate.getContracts.invalidate();
      utils.affiliate.getPayments.invalidate();
      utils.affiliate.getApplications.invalidate();
      utils.affiliate.getDashboardStats.invalidate();

      // Admin queries (used by affiliate role)
      utils.candidate.getAllForAdmin.invalidate();
      utils.admin.getAllApplications.invalidate();
      utils.admin.getAllContracts.invalidate();
      utils.admin.getAllPayments.invalidate();
    },
    onError: (error) => {
      // Revert optimistic update on error
      console.error('Failed to set school context:', error);
      setOptimisticSchool(undefined);
    },
  });

  const setCurrentSchool = (schoolId: string | null) => {
    // Optimistic update - immediately show the new school
    if (schoolId === null) {
      setOptimisticSchool(null);
    } else {
      const school = availableSchools.find(s => s.id === schoolId);
      if (school) {
        setOptimisticSchool(school);
      }
    }
    setCurrentMutation.mutate({ schoolId });
  };

  // Use optimistic state if set, otherwise use server state
  const currentSchool = optimisticSchool !== undefined ? optimisticSchool : (serverSchool || null);

  const value: SchoolContextType = {
    currentSchool,
    availableSchools,
    isLoading: isLoadingCurrent || isLoadingSchools,
    isAllSchoolsMode: currentSchool === null,
    setCurrentSchool,
  };

  return (
    <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>
  );
}

export function useSchoolContext() {
  const context = useContext(SchoolContext);
  if (context === undefined) {
    throw new Error("useSchoolContext must be used within a SchoolProvider");
  }
  return context;
}
