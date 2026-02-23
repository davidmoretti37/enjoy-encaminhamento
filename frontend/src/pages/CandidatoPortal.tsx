import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { FunnelLayout, type FunnelStep } from "@/components/funnel";
import {
  CandidateFunnelProvider,
  useCandidateFunnel,
  CANDIDATE_STEPS,
} from "@/contexts/CandidateFunnelContext";
import { Skeleton } from "@/components/ui/skeleton";
import { FunnelContentSkeleton } from "@/components/ui/skeletons";
import { AnimatePresence, motion } from "framer-motion";
import {
  User,
  GraduationCap,
  Briefcase,
  Settings,
  LogOut,
  X,
  ChevronRight,
  FileText,
} from "lucide-react";

// Step Components
import VagasSection from "@/components/candidate-steps/VagasSection";
import StepCandidaturaEnviada from "@/components/candidate-steps/StepCandidaturaEnviada";
import StepPreSelecao from "@/components/candidate-steps/StepPreSelecao";
import StepEntrevista from "@/components/candidate-steps/StepEntrevista";
import StepResultado from "@/components/candidate-steps/StepResultado";
import StepContrato from "@/components/candidate-steps/StepContrato";
import StepContratado from "@/components/candidate-steps/StepContratado";

// Step components map
const STEP_COMPONENTS = [
  StepCandidaturaEnviada,
  StepPreSelecao,
  StepEntrevista,
  StepResultado,
  StepContrato,
  StepContratado,
];

const MENU_ITEMS = [
  { id: "personal", label: "Dados Pessoais", icon: User, description: "Informações de perfil" },
  { id: "education", label: "Formação", icon: GraduationCap, description: "Escolaridade e habilidades" },
  { id: "experience", label: "Experiência", icon: Briefcase, description: "Histórico profissional" },
  { id: "preferences", label: "Preferências", icon: Settings, description: "Tipo de trabalho" },
  { id: "documents", label: "Documentos", icon: FileText, description: "Contratos assinados" },
];

function CandidateSidebarMenu({ open, onClose, onNavigate, onLogout, candidateName }: {
  open: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
  candidateName?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Sidebar panel */}
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-0 left-0 bottom-0 w-80 bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0A2342] flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">
                    {candidateName?.charAt(0)?.toUpperCase() || "C"}
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0A2342]">{candidateName || "Candidato"}</h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider -mt-0.5">Menu</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </motion.button>
            </div>

            {/* Menu items */}
            <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
              {MENU_ITEMS.map((item, index) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    onNavigate(item.id);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl
                    hover:bg-slate-50 transition-all group text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center
                    group-hover:bg-[#FF6B35]/20 transition-colors shrink-0">
                    <item.icon className="w-5 h-5 text-[#FF6B35]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0A2342]">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#FF6B35] transition-colors shrink-0" />
                </motion.button>
              ))}
            </div>

            {/* Logout */}
            <div className="px-3 pb-4 pt-2 border-t border-slate-200">
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl
                  hover:bg-red-50 transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center
                  group-hover:bg-red-500/20 transition-colors shrink-0">
                  <LogOut className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-600">Sair da conta</p>
                  <p className="text-xs text-slate-500">Encerrar sessão</p>
                </div>
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function CandidatoPortalContent() {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const {
    activeTab,
    setActiveTab,
    selectedApplicationId,
    setSelectedApplicationId,
    applications,
    currentStep,
    viewingStep,
    setViewingStep,
    stepDirection,
    isLoading,
    candidateProfile,
  } = useCandidateFunnel();

  // Convert applications to selector options
  const applicationOptions = applications.map((app: any) => ({
    id: app.id,
    label: app.job?.title || "Candidatura",
  }));

  // Get the step component based on what the user is viewing
  const StepComponent = STEP_COMPONENTS[viewingStep] || StepCandidaturaEnviada;

  // Tabs configuration
  const tabs = [
    { id: "vagas", label: "Vagas" },
    { id: "candidaturas", label: "Minhas Candidaturas", badge: applications.length },
  ];

  // Convert steps to FunnelStep format
  const funnelSteps: FunnelStep[] = CANDIDATE_STEPS.map((step) => ({
    id: step.id,
    label: step.label,
    shortLabel: step.shortLabel,
  }));

  const handleMenuNavigate = (tab: string) => {
    setLocation(`/candidate/settings?tab=${tab}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <FunnelContentSkeleton />
      </div>
    );
  }

  return (
    <>
      <CandidateSidebarMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={handleMenuNavigate}
        onLogout={logout}
        candidateName={candidateProfile?.full_name}
      />

      <FunnelLayout
        onMenuClick={() => setMenuOpen(true)}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as "vagas" | "candidaturas")}
        steps={activeTab === "candidaturas" && applications.length > 0 ? funnelSteps : undefined}
        currentStep={currentStep}
        viewingStep={viewingStep}
        onStepClick={setViewingStep}
        selectorLabel={activeTab === "candidaturas" ? "Candidatura" : undefined}
        selectorValue={selectedApplicationId || undefined}
        selectorOptions={activeTab === "candidaturas" ? applicationOptions : undefined}
        onSelectorChange={setSelectedApplicationId}
        stepDirection={stepDirection}
      >
        {activeTab === "vagas" ? (
          <VagasSection />
        ) : applications.length === 0 ? (
          <EmptyApplicationsState onBrowseJobs={() => setActiveTab("vagas")} />
        ) : (
          <StepComponent />
        )}
      </FunnelLayout>
    </>
  );
}

function EmptyApplicationsState({ onBrowseJobs }: { onBrowseJobs: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center mb-6 shadow-sm">
        <svg
          className="w-10 h-10 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-[#0A2342] mb-2">
        Nenhuma candidatura ainda
      </h3>
      <p className="text-slate-600 max-w-sm mb-6">
        Comece a se candidatar às vagas disponíveis para acompanhar seu progresso aqui
      </p>
      <button
        onClick={onBrowseJobs}
        className="px-6 py-3 rounded-full bg-[#FF6B35] text-white font-medium shadow-lg shadow-[#FF6B35]/25 hover:bg-[#FF6B35]/90 hover:scale-105 transition-all"
      >
        Explorar Vagas
      </button>
    </div>
  );
}

export default function CandidatoPortal() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Auth loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <FunnelContentSkeleton />
      </div>
    );
  }

  // Not logged in or not a candidate
  if (!user || user.role !== "candidate") {
    setLocation("/login");
    return null;
  }

  return (
    <CandidateFunnelProvider>
      <CandidatoPortalContent />
    </CandidateFunnelProvider>
  );
}
