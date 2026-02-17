import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";

// Step configuration (5 steps)
export const COMPANY_STEPS = [
  { id: "vaga_criada", label: "Vaga Criada", shortLabel: "Vaga" },
  { id: "preferencia", label: "Preferência", shortLabel: "Preferência" },
  { id: "entrevista", label: "Entrevista", shortLabel: "Entrevista" },
  { id: "contratacao", label: "Contratação", shortLabel: "Contrato" },
  { id: "funcionario_ativo", label: "Funcionário Ativo", shortLabel: "Ativo" },
] as const;

// Map job status to funnel step (5-step flow)
export function getStepFromJobStatus(status: string | undefined): number {
  switch (status) {
    case "pending_review":
    case "searching":
      return 1; // Preferência (job exists = step 0 done)
    case "list_sent":
    case "candidates_found":
    case "in_selection":
    case "meeting_scheduled":
    case "interview_scheduled":
    case "interview_completed":
      return 2; // Entrevista
    case "pending_signatures":
    case "hiring_in_progress":
      return 3; // Contratação
    case "filled":
    case "active":
      return 4; // Funcionário Ativo
    default:
      return 1;
  }
}

type Tab = "recrutamento" | "financeiro";

interface CompanyFunnelContextType {
  // Tab state
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;

  // Job selection
  selectedJobId: string | null;
  setSelectedJobId: (id: string | null) => void;
  jobs: any[];
  selectedJob: any | null;

  // Step state (derived from job status)
  currentStep: number;
  viewingStep: number;
  setViewingStep: (step: number) => void;
  stepDirection: number;

  // Data
  companyProfile: any | null;
  batches: any[];
  interviews: any[];
  hiringProcesses: any[];
  contracts: any[];

  // Loading states
  isLoading: boolean;
  isJobsLoading: boolean;

  // Notification count
  notificationCount: number;

  // Actions
  refreshData: () => void;
}

const CompanyFunnelContext = createContext<CompanyFunnelContextType | null>(null);

export function CompanyFunnelProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();

  // Parse URL params
  const urlParams = useMemo(() => {
    const params = new URLSearchParams(searchParams);
    return {
      tab: (params.get("tab") as Tab) || "recrutamento",
      jobId: params.get("job") || null,
    };
  }, [searchParams]);

  // State
  const [activeTab, setActiveTabState] = useState<Tab>(urlParams.tab);
  const [selectedJobId, setSelectedJobIdState] = useState<string | null>(urlParams.jobId);
  const [previousStep, setPreviousStep] = useState(0);

  // tRPC queries
  const utils = trpc.useUtils();

  const { data: jobs = [], isLoading: isJobsLoading } = trpc.company.getJobs.useQuery(
    undefined,
    { staleTime: 30000 }
  );

  const { data: companyProfile } = trpc.company.getProfile.useQuery(
    undefined,
    { staleTime: 60000 }
  );

  const { data: batches = [] } = trpc.batch.getUnlockedBatches.useQuery(
    undefined,
    { staleTime: 30000 }
  );

  const { data: interviews = [] } = trpc.interview.getCompanyInterviews.useQuery(
    undefined,
    { staleTime: 30000 }
  );

  const { data: hiringProcesses = [] } = trpc.hiring.getCompanyHiringProcesses.useQuery(
    undefined,
    { staleTime: 30000, refetchInterval: 30000 }
  );

  const { data: notificationData } = trpc.notification.getUnreadCount.useQuery(
    undefined,
    { staleTime: 10000 }
  );

  // Auto-select first job if none selected
  useEffect(() => {
    if (!selectedJobId && jobs.length > 0) {
      setSelectedJobIdState(jobs[0].id);
    }
  }, [jobs, selectedJobId]);

  // Get selected job
  const selectedJob = useMemo(() => {
    if (!selectedJobId) return null;
    return jobs.find((j: any) => j.id === selectedJobId) || null;
  }, [jobs, selectedJobId]);

  // Calculate current step from job status (5-step flow)
  const currentStep = useMemo(() => {
    if (!selectedJob) return 0;

    // Step 0 (Vaga Criada) is always done if a job exists — minimum is step 1

    // Check for active contracts (step 4 - Funcionário Ativo)
    const hasActiveContract = hiringProcesses.some(
      (hp: any) => hp.job?.id === selectedJobId && hp.status === "active"
    );
    if (hasActiveContract) return 4;

    // Check for pending contracts (step 3 - Contratação)
    const hasPendingContract = hiringProcesses.some(
      (hp: any) => hp.job?.id === selectedJobId &&
        (hp.status === "pending_signatures" || hp.status === "pending_payment")
    );
    if (hasPendingContract) return 3;

    // Check for interviews or forwarded batches (step 2 - Entrevista)
    const hasInterview = interviews.some(
      (i: any) =>
        i.job?.id === selectedJobId &&
        (i.status === "scheduled" || i.status === "in_progress" || i.status === "completed")
    );
    if (hasInterview) return 2;

    const hasForwardedCandidates = batches.some(
      (b: any) => b.job?.id === selectedJobId && b.candidates?.length > 0
    );
    if (hasForwardedCandidates) return 2;

    // Agency is working on it — step 2 (Entrevista waiting)
    if (
      selectedJob.status === "candidates_found" ||
      selectedJob.status === "in_selection" ||
      selectedJob.status === "list_sent" ||
      selectedJob.status === "meeting_scheduled" ||
      selectedJob.status === "interview_scheduled"
    ) {
      return 2;
    }

    // If interview preference is set, advance to step 2 (Entrevista waiting)
    if ((selectedJob as any).preferred_interview_type) {
      return 2;
    }

    // Job exists but no preference set → step 1 (Preferência)
    return 1;
  }, [selectedJob, selectedJobId, batches, interviews, hiringProcesses]);

  // Viewing step: user can click completed steps to view them
  // null = follow currentStep automatically, number = user override
  const [userSelectedStep, setUserSelectedStep] = useState<number | null>(null);

  // Reset user selection when currentStep changes (progress advanced)
  const prevCurrentStepRef = useRef(currentStep);
  if (prevCurrentStepRef.current !== currentStep) {
    prevCurrentStepRef.current = currentStep;
    if (userSelectedStep !== null) {
      setUserSelectedStep(null);
    }
  }

  // Derive viewingStep: user selection if valid, otherwise currentStep
  const viewingStep = (userSelectedStep !== null && userSelectedStep <= currentStep)
    ? userSelectedStep
    : currentStep;

  const setViewingStep = useCallback(
    (step: number) => {
      setUserSelectedStep(step);
    },
    []
  );

  // Calculate step direction for animation
  const stepDirection = viewingStep > previousStep ? 1 : -1;

  // Update previous step when viewing step changes
  useEffect(() => {
    setPreviousStep(viewingStep);
  }, [viewingStep]);

  // URL sync
  const setActiveTab = useCallback(
    (tab: Tab) => {
      setActiveTabState(tab);
      const params = new URLSearchParams();
      params.set("tab", tab);
      if (selectedJobId && tab === "recrutamento") {
        params.set("job", selectedJobId);
      }
      setLocation(`/empresa?${params.toString()}`, { replace: true });
    },
    [setLocation, selectedJobId]
  );

  const setSelectedJobId = useCallback(
    (id: string | null) => {
      setSelectedJobIdState(id);
      if (id && activeTab === "recrutamento") {
        const params = new URLSearchParams();
        params.set("tab", activeTab);
        params.set("job", id);
        setLocation(`/empresa?${params.toString()}`, { replace: true });
      }
    },
    [setLocation, activeTab]
  );

  // Refresh all data
  const refreshData = useCallback(() => {
    utils.company.getJobs.invalidate();
    utils.company.getProfile.invalidate();
    utils.batch.getUnlockedBatches.invalidate();
    utils.interview.getCompanyInterviews.invalidate();
    utils.hiring.getCompanyHiringProcesses.invalidate();
    utils.notification.getUnreadCount.invalidate();
  }, [utils]);

  const isLoading = isJobsLoading;
  const notificationCount = (notificationData as number) || 0;

  const value: CompanyFunnelContextType = {
    activeTab,
    setActiveTab,
    selectedJobId,
    setSelectedJobId,
    jobs,
    selectedJob,
    currentStep,
    viewingStep,
    setViewingStep,
    stepDirection,
    companyProfile,
    batches,
    interviews,
    hiringProcesses,
    contracts: [], // Will add contracts query when needed
    isLoading,
    isJobsLoading,
    notificationCount,
    refreshData,
  };

  return (
    <CompanyFunnelContext.Provider value={value}>
      {children}
    </CompanyFunnelContext.Provider>
  );
}

export function useCompanyFunnel() {
  const context = useContext(CompanyFunnelContext);
  if (!context) {
    throw new Error("useCompanyFunnel must be used within a CompanyFunnelProvider");
  }
  return context;
}
