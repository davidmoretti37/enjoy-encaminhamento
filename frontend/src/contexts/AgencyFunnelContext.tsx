import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  ReactNode,
} from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useAgencyContext } from "./AgencyContext";

type Tab = "dashboard" | "job-description" | "management";
type ManagementFilter = "companies" | "candidates";

interface AgencyFunnelContextType {
  // Tab state
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;

  // Management filter
  managementFilter: ManagementFilter;
  setManagementFilter: (filter: ManagementFilter) => void;

  // Job Description tab - company selection
  selectedCompanyId: string | null;
  setSelectedCompanyId: (id: string | null) => void;
  companies: any[];
  selectedCompany: any | null;

  // Management tab - entity selection
  selectedEntityId: string | null;
  setSelectedEntityId: (id: string | null) => void;

  // Data
  candidates: any[];
  agencyProfile: any | null;

  // Loading states
  isLoading: boolean;
  isCompaniesLoading: boolean;
  isCandidatesLoading: boolean;

  // Notification count
  notificationCount: number;

  // Actions
  refreshData: () => void;
}

const AgencyFunnelContext = createContext<AgencyFunnelContextType | null>(null);

export function AgencyFunnelProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();

  // Parse URL params
  const urlParams = useMemo(() => {
    const params = new URLSearchParams(searchParams);
    return {
      tab: (params.get("tab") as Tab) || "dashboard",
      filter: (params.get("filter") as ManagementFilter) || "companies",
      companyId: params.get("company") || null,
      entityId: params.get("entity") || null,
    };
  }, [searchParams]);

  // State
  const [activeTab, setActiveTabState] = useState<Tab>(urlParams.tab);
  const [managementFilter, setManagementFilterState] = useState<ManagementFilter>(urlParams.filter);
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string | null>(urlParams.companyId);
  const [selectedEntityId, setSelectedEntityIdState] = useState<string | null>(urlParams.entityId);

  // Sync URL params to state when URL changes (from sidebar navigation)
  useEffect(() => {
    setActiveTabState(urlParams.tab);
    setManagementFilterState(urlParams.filter);
    setSelectedCompanyIdState(urlParams.companyId);
    setSelectedEntityIdState(urlParams.entityId);
  }, [urlParams.tab, urlParams.filter, urlParams.companyId, urlParams.entityId]);

  // tRPC queries
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const { isAllAgenciesMode } = useAgencyContext();

  // Admin in "Todas as Agências" mode uses affiliate-level endpoints
  const isTodasMode = user?.role === 'admin' && isAllAgenciesMode;

  // === Agency-specific queries (disabled in Todas mode) ===
  const { data: agencyProfile } = trpc.agency.getProfile.useQuery(
    undefined,
    { staleTime: 60000, enabled: !isTodasMode }
  );

  const { data: agencyDirectCompanies = [], isLoading: isAgencyCompaniesLoading } = trpc.agency.getCompanies.useQuery(
    undefined,
    { staleTime: 30000, enabled: !isTodasMode }
  );

  const { data: agencyMeetings = [], isLoading: isAgencyMeetingsLoading } = trpc.agency.getMeetings.useQuery(
    undefined,
    { staleTime: 30000, enabled: !isTodasMode }
  );

  const { data: agencyCandidates = [], isLoading: isAgencyCandidatesLoading } = trpc.agency.getCandidates.useQuery(
    undefined,
    { staleTime: 30000, enabled: !isTodasMode }
  );

  // === Affiliate-level queries (enabled only in Todas mode) ===
  const { data: affiliateCompanies = [], isLoading: isAffiliateCompaniesLoading } = trpc.affiliate.getCompanies.useQuery(
    { agencyId: null },
    { staleTime: 30000, enabled: isTodasMode }
  );

  const { data: affiliateMeetings = [], isLoading: isAffiliateMeetingsLoading } = trpc.outreach.getMeetings.useQuery(
    { agencyId: null },
    { staleTime: 30000, enabled: isTodasMode }
  );

  const { data: affiliateCandidates = [], isLoading: isAffiliateCandidatesLoading } = trpc.affiliate.getCandidates.useQuery(
    { agencyId: null },
    { staleTime: 30000, enabled: isTodasMode }
  );

  // Select the right data source based on mode
  const directCompanies = isTodasMode ? affiliateCompanies : agencyDirectCompanies;
  const meetings = isTodasMode ? affiliateMeetings : agencyMeetings;

  // Combine direct signups and outreach companies
  const companies = useMemo(() => {
    const completedMeetings = meetings.filter((m: any) => m.contract_signed_at);

    // Convert direct companies to meeting-like format
    const directAsMeetings = directCompanies
      .filter((c: any) => c.status === 'active' || c.status === 'pending')
      .filter((c: any) => {
        // Exclude companies that already have a meeting record
        const hasOutreachRecord = meetings?.some((m: any) =>
          m.company_email === c.email || m.company_name === c.company_name
        );
        return !hasOutreachRecord;
      })
      .map((c: any) => ({
        id: c.id,
        company_name: c.company_name || c.business_name,
        company_email: c.email || '',
        contact_name: c.contact_name || null,
        contact_phone: c.phone || null,
        status: 'active',
        _isDirectSignup: true,
        agency_id: c.agency_id || null,
      }));

    return [...completedMeetings, ...directAsMeetings];
  }, [directCompanies, meetings]);

  const isCompaniesLoading = isTodasMode
    ? (isAffiliateCompaniesLoading || isAffiliateMeetingsLoading)
    : (isAgencyCompaniesLoading || isAgencyMeetingsLoading);

  // Get candidates
  const candidates = isTodasMode ? affiliateCandidates : agencyCandidates;
  const isCandidatesLoading = isTodasMode ? isAffiliateCandidatesLoading : isAgencyCandidatesLoading;

  const { data: notificationData } = trpc.notification.getUnreadCount.useQuery(
    undefined,
    { staleTime: 10000 }
  );

  // Get selected company
  const selectedCompany = useMemo(() => {
    if (!selectedCompanyId) return null;
    return companies.find((c: any) => c.id === selectedCompanyId) || null;
  }, [companies, selectedCompanyId]);

  // URL sync
  const setActiveTab = useCallback(
    (tab: Tab) => {
      setActiveTabState(tab);
      const params = new URLSearchParams();
      params.set("tab", tab);
      if (tab === "management") {
        params.set("filter", managementFilter);
        if (selectedEntityId) {
          params.set("entity", selectedEntityId);
        }
      } else if (tab === "job-description" && selectedCompanyId) {
        params.set("company", selectedCompanyId);
      }
      setLocation(`/agency/portal?${params.toString()}`, { replace: true });
    },
    [setLocation, managementFilter, selectedEntityId, selectedCompanyId]
  );

  const setManagementFilter = useCallback(
    (filter: ManagementFilter) => {
      setManagementFilterState(filter);
      setSelectedEntityIdState(null); // Clear selection when changing filter
      const params = new URLSearchParams();
      params.set("tab", "management");
      params.set("filter", filter);
      setLocation(`/agency/portal?${params.toString()}`, { replace: true });
    },
    [setLocation]
  );

  const setSelectedCompanyId = useCallback(
    (id: string | null) => {
      setSelectedCompanyIdState(id);
      if (activeTab === "job-description") {
        const params = new URLSearchParams();
        params.set("tab", "job-description");
        if (id) {
          params.set("company", id);
        }
        // If id is null, company param won't be set, effectively clearing it
        setLocation(`/agency/portal?${params.toString()}`, { replace: true });
      }
    },
    [setLocation, activeTab]
  );

  const setSelectedEntityId = useCallback(
    (id: string | null) => {
      setSelectedEntityIdState(id);
      if (id && activeTab === "management") {
        const params = new URLSearchParams();
        params.set("tab", "management");
        params.set("filter", managementFilter);
        params.set("entity", id);
        setLocation(`/agency/portal?${params.toString()}`, { replace: true });
      }
    },
    [setLocation, activeTab, managementFilter]
  );

  // Refresh all data
  const refreshData = useCallback(() => {
    if (isTodasMode) {
      utils.affiliate.getCompanies.invalidate();
      utils.outreach.getMeetings.invalidate();
      utils.affiliate.getCandidates.invalidate();
    } else {
      utils.agency.getProfile.invalidate();
      utils.agency.getCompanies.invalidate();
      utils.agency.getMeetings.invalidate();
      utils.agency.getCandidates.invalidate();
    }
    utils.notification.getUnreadCount.invalidate();
  }, [utils, isTodasMode]);

  const isLoading = isCompaniesLoading || isCandidatesLoading;
  const notificationCount = (notificationData as any)?.count || 0;

  const value: AgencyFunnelContextType = {
    activeTab,
    setActiveTab,
    managementFilter,
    setManagementFilter,
    selectedCompanyId,
    setSelectedCompanyId,
    companies,
    selectedCompany,
    selectedEntityId,
    setSelectedEntityId,
    candidates,
    agencyProfile,
    isLoading,
    isCompaniesLoading,
    isCandidatesLoading,
    notificationCount,
    refreshData,
  };

  return (
    <AgencyFunnelContext.Provider value={value}>
      {children}
    </AgencyFunnelContext.Provider>
  );
}

export function useAgencyFunnel() {
  const context = useContext(AgencyFunnelContext);
  if (!context) {
    throw new Error("useAgencyFunnel must be used within an AgencyFunnelProvider");
  }
  return context;
}
