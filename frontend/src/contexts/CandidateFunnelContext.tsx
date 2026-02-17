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

// Step configuration
export const CANDIDATE_STEPS = [
  { id: "candidatura_enviada", label: "Candidatura Enviada", shortLabel: "Enviada" },
  { id: "pre_selecao", label: "Pré-seleção", shortLabel: "Pré-seleção" },
  { id: "entrevista", label: "Entrevista", shortLabel: "Entrevista" },
  { id: "resultado", label: "Resultado", shortLabel: "Resultado" },
  { id: "contrato", label: "Contrato", shortLabel: "Contrato" },
  { id: "contratado", label: "Contratado", shortLabel: "Contratado" },
] as const;

// Map application status to funnel step
export function getStepFromApplicationStatus(status: string | undefined): number {
  switch (status) {
    case "applied":
      return 0; // Candidatura Enviada
    case "screening":
      return 1; // Pré-seleção
    case "interview-scheduled":
      return 2; // Entrevista
    case "interviewed":
    case "rejected":
      return 3; // Resultado
    case "selected":
      return 4; // Contrato (company initiated hiring, candidate can sign)
    case "contract_pending":
    case "contract_signed":
      return 4; // Contrato
    default:
      return 0;
  }
}

type Tab = "vagas" | "candidaturas";

interface CandidateFunnelContextType {
  // Tab state
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;

  // Application selection
  selectedApplicationId: string | null;
  setSelectedApplicationId: (id: string | null) => void;
  applications: any[];
  selectedApplication: any | null;

  // Step state (derived from application status)
  currentStep: number;
  viewingStep: number;
  setViewingStep: (step: number) => void;
  stepDirection: number;

  // Data
  candidateProfile: any | null;
  availableJobs: any[];
  interviews: any[];
  hiringProcesses: any[];

  // Loading states
  isLoading: boolean;
  isApplicationsLoading: boolean;
  isJobsLoading: boolean;

  // Notification count
  notificationCount: number;

  // Actions
  refreshData: () => void;

  // Interview helpers
  pendingInterviews: any[];
  confirmedInterviews: any[];
  waitingResultInterviews: any[];

  // Local storage for started sessions
  startedSessions: Set<string>;
  markSessionStarted: (sessionId: string) => void;
}

const CandidateFunnelContext = createContext<CandidateFunnelContextType | null>(null);

export function CandidateFunnelProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();

  // Parse URL params
  const urlParams = useMemo(() => {
    const params = new URLSearchParams(searchParams);
    return {
      tab: (params.get("tab") as Tab) || "vagas",
      appId: params.get("app") || null,
    };
  }, [searchParams]);

  // State
  const [activeTab, setActiveTabState] = useState<Tab>(urlParams.tab);
  const [selectedApplicationId, setSelectedApplicationIdState] = useState<string | null>(urlParams.appId);
  const [previousStep, setPreviousStep] = useState(0);

  // Started sessions (persisted in localStorage)
  const [startedSessions, setStartedSessions] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("startedCandidateInterviews");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });

  // Save started sessions to localStorage
  useEffect(() => {
    localStorage.setItem("startedCandidateInterviews", JSON.stringify(Array.from(startedSessions)));
  }, [startedSessions]);

  const markSessionStarted = useCallback((sessionId: string) => {
    setStartedSessions((prev) => new Set([...Array.from(prev), sessionId]));
  }, []);

  // tRPC queries
  const utils = trpc.useUtils();

  const { data: candidateProfile } = trpc.candidate.getProfile.useQuery(
    undefined,
    { staleTime: 60000 }
  );

  const { data: applications = [], isLoading: isApplicationsLoading } = trpc.application.getByCandidate.useQuery(
    undefined,
    { staleTime: 30000, refetchInterval: 30000 }
  );

  const { data: availableJobs = [], isLoading: isJobsLoading } = trpc.job.getOpenJobsForCandidates.useQuery(
    undefined,
    { staleTime: 30000 }
  );

  const { data: interviews = [] } = trpc.interview.getMyInterviews.useQuery(
    undefined,
    { staleTime: 30000 }
  );

  const { data: hiringProcesses = [] } = trpc.hiring.getCandidateHiringProcesses.useQuery(
    undefined,
    { staleTime: 30000, refetchInterval: 30000 }
  );

  const { data: notificationData } = trpc.notification.getUnreadCount.useQuery(
    undefined,
    { staleTime: 10000 }
  );

  // Auto-select first application if on candidaturas tab and none selected
  useEffect(() => {
    if (activeTab === "candidaturas" && !selectedApplicationId && applications.length > 0) {
      setSelectedApplicationIdState(applications[0].id);
    }
  }, [applications, selectedApplicationId, activeTab]);

  // Get selected application
  const selectedApplication = useMemo(() => {
    if (!selectedApplicationId) return null;
    return applications.find((a: any) => a.id === selectedApplicationId) || null;
  }, [applications, selectedApplicationId]);

  // Calculate current step from application status + hiring process
  const currentStep = useMemo(() => {
    if (!selectedApplication) return 0;
    const baseStep = getStepFromApplicationStatus(selectedApplication.status);
    // If at contract step, check if hiring process is active (all signatures done + payment)
    if (baseStep === 4 && hiringProcesses.length > 0) {
      const hp = (hiringProcesses as any[]).find(
        (p: any) => p.application_id === selectedApplication.id
      );
      if (hp && hp.status === "active") {
        return 5; // Contratado
      }
    }
    return baseStep;
  }, [selectedApplication, hiringProcesses]);

  // Viewing step: user can click completed steps to view them
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

  // Categorize interviews
  const { pendingInterviews, confirmedInterviews, waitingResultInterviews } = useMemo(() => {
    const now = new Date();
    const pending: any[] = [];
    const confirmed: any[] = [];
    const waiting: any[] = [];

    interviews.forEach((interview: any) => {
      const scheduledAt = interview.session?.scheduled_at
        ? new Date(interview.session.scheduled_at)
        : null;
      const isPast = scheduledAt ? scheduledAt <= now : false;
      const wasStarted = interview.session?.id && startedSessions.has(interview.session.id);

      if (interview.status === "pending") {
        pending.push(interview);
      } else if (interview.status === "confirmed") {
        if (isPast || wasStarted) {
          waiting.push(interview);
        } else {
          confirmed.push(interview);
        }
      }
    });

    return { pendingInterviews: pending, confirmedInterviews: confirmed, waitingResultInterviews: waiting };
  }, [interviews, startedSessions]);

  // URL sync
  const setActiveTab = useCallback(
    (tab: Tab) => {
      setActiveTabState(tab);
      const params = new URLSearchParams();
      params.set("tab", tab);
      if (selectedApplicationId && tab === "candidaturas") {
        params.set("app", selectedApplicationId);
      }
      setLocation(`/candidato?${params.toString()}`, { replace: true });
    },
    [setLocation, selectedApplicationId]
  );

  const setSelectedApplicationId = useCallback(
    (id: string | null) => {
      setSelectedApplicationIdState(id);
      if (id && activeTab === "candidaturas") {
        const params = new URLSearchParams();
        params.set("tab", activeTab);
        params.set("app", id);
        setLocation(`/candidato?${params.toString()}`, { replace: true });
      }
    },
    [setLocation, activeTab]
  );

  // Refresh all data
  const refreshData = useCallback(() => {
    utils.candidate.getProfile.invalidate();
    utils.application.getByCandidate.invalidate();
    utils.job.getOpenJobsForCandidates.invalidate();
    utils.interview.getMyInterviews.invalidate();
    utils.hiring.getCandidateHiringProcesses.invalidate();
    utils.notification.getUnreadCount.invalidate();
  }, [utils]);

  const isLoading = isApplicationsLoading || isJobsLoading;
  const notificationCount = (notificationData as number) || 0;

  const value: CandidateFunnelContextType = {
    activeTab,
    setActiveTab,
    selectedApplicationId,
    setSelectedApplicationId,
    applications,
    selectedApplication,
    currentStep,
    viewingStep,
    setViewingStep,
    stepDirection,
    candidateProfile,
    availableJobs,
    interviews,
    hiringProcesses,
    isLoading,
    isApplicationsLoading,
    isJobsLoading,
    notificationCount,
    refreshData,
    pendingInterviews,
    confirmedInterviews,
    waitingResultInterviews,
    startedSessions,
    markSessionStarted,
  };

  return (
    <CandidateFunnelContext.Provider value={value}>
      {children}
    </CandidateFunnelContext.Provider>
  );
}

export function useCandidateFunnel() {
  const context = useContext(CandidateFunnelContext);
  if (!context) {
    throw new Error("useCandidateFunnel must be used within a CandidateFunnelProvider");
  }
  return context;
}
