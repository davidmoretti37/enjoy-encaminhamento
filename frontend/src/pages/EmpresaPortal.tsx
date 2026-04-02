import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { FunnelLayout, type FunnelStep, CardEntrance } from "@/components/funnel";
import {
  CompanyFunnelProvider,
  useCompanyFunnel,
  COMPANY_STEPS,
} from "@/contexts/CompanyFunnelContext";

// Step Components
import StepPreferencia from "@/components/company-steps/StepPreferencia";
import StepEntrevista from "@/components/company-steps/StepEntrevista";
import StepContratacao from "@/components/company-steps/StepContratacao";
import StepFuncionarioAtivo from "@/components/company-steps/StepFuncionarioAtivo";
import { Skeleton } from "@/components/ui/skeleton";
import { FunnelContentSkeleton } from "@/components/ui/skeletons";
import { WorkSchedulePicker } from "@/components/ui/WorkSchedulePicker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  Briefcase,
  Plus,
  Building2,
  Users,
  Bell,
  FileText,
  UserCheck,
  DollarSign,
  LogOut,
  X,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

// Step Components
import FinanceiroTab from "@/components/company-steps/FinanceiroTab";

function EmptyJobsState({ onCreateJob }: { onCreateJob: () => void }) {
  return (
    <CardEntrance>
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center mb-6 shadow-sm">
          <Briefcase className="w-10 h-10 text-slate-400" />
        </div>
        <h3 className="text-xl font-semibold text-[#0A2342] mb-2">
          Nenhuma vaga criada
        </h3>
        <p className="text-slate-600 max-w-sm mb-6">
          Crie sua primeira vaga para começar a recrutar candidatos
        </p>
        <button
          onClick={onCreateJob}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#1B4D7A] to-[#FF6B35] text-white font-medium shadow-lg shadow-[#FF6B35]/25 hover:shadow-[#FF6B35]/40 hover:scale-105 transition-all"
        >
          <Plus className="w-5 h-5" />
          Criar Nova Vaga
        </button>
      </div>
    </CardEntrance>
  );
}

const MENU_ITEMS = [
  { id: "company", label: "Empresa", icon: Building2, description: "Dados cadastrais" },
  { id: "users", label: "Usuários", icon: Users, description: "Gerenciar acessos" },
  { id: "notifications", label: "Notificações", icon: Bell, description: "Preferências de aviso" },
  { id: "documents", label: "Documentos", icon: FileText, description: "Contratos assinados" },
  { id: "payments", label: "Pagamentos", icon: DollarSign, description: "Pagamentos pendentes" },
  { id: "employees", label: "Funcionários Ativos", icon: UserCheck, description: "Todos os contratados" },
];

function SidebarMenu({ open, onClose, onNavigate, onLogout }: {
  open: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
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
                  <span className="text-white font-bold text-lg">A</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0A2342]">ANEC</h2>
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
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl
                  hover:bg-red-50 transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center
                  group-hover:bg-red-500/20 transition-colors shrink-0">
                  <LogOut className="w-5 h-5 text-red-500" />
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

function EmpresaPortalContent() {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  const {
    activeTab,
    setActiveTab,
    selectedJobId,
    setSelectedJobId,
    jobs,
    currentStep,
    allComplete,
    viewingStep,
    setViewingStep,
    stepDirection,
    isLoading,
  } = useCompanyFunnel();

  // Sidebar menu state
  const [menuOpen, setMenuOpen] = useState(false);

  // Job creation modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    contract_type: '',
    salary: '',
    description: '',
    requirements: '',
    work_schedule: '',
  });

  const utils = trpc.useUtils();
  const createJobMutation = trpc.company.createJobRequest.useMutation({
    onSuccess: () => {
      toast.success('Vaga solicitada com sucesso!');
      setIsModalOpen(false);
      setFormData({
        title: '',
        contract_type: '',
        salary: '',
        description: '',
        requirements: '',
        work_schedule: '',
      });
      utils.company.getJobs.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao solicitar vaga');
    },
  });

  const handleSubmit = () => {
    if (!formData.title || !formData.contract_type || !formData.description) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    createJobMutation.mutate({
      title: formData.title,
      description: formData.description,
      contract_type: formData.contract_type as 'estagio' | 'clt' | 'menor-aprendiz' | 'pj',
      salary_min: formData.salary ? parseFloat(formData.salary) : undefined,
      salary_max: formData.salary ? parseFloat(formData.salary) : undefined,
      work_schedule: formData.work_schedule || undefined,
      requirements: formData.requirements || undefined,
    });
  };

  // Convert jobs to selector options
  const jobOptions = jobs.map((job: any) => ({
    id: job.id,
    label: job.title || "Vaga sem título",
    sublabel: job.contract_type || "",
  }));

  // Step components (3 steps + active employee view)
  const STEP_COMPONENTS = [
    StepPreferencia,      // Step 0: Preferência
    StepEntrevista,       // Step 1: Entrevista
    StepContratacao,      // Step 2: Contratação
  ];

  // Get step component — if allComplete, show employee view
  const StepComponent = allComplete ? StepFuncionarioAtivo : (STEP_COMPONENTS[viewingStep] || StepPreferencia);

  // Convert steps to FunnelStep format
  const funnelSteps: FunnelStep[] = COMPANY_STEPS.map((step) => ({
    id: step.id,
    label: step.label,
    shortLabel: step.shortLabel,
  }));

  // Tabs configuration
  const tabs = [
    { id: "recrutamento", label: "Recrutamento" },
    { id: "financeiro", label: "Financeiro" },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <FunnelContentSkeleton />
      </div>
    );
  }

  const handleMenuNavigate = (tab: string) => {
    setLocation(`/company/settings?tab=${tab}`);
  };

  return (
    <>
      <SidebarMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={handleMenuNavigate}
        onLogout={logout}
      />

      <FunnelLayout
        onMenuClick={() => setMenuOpen(true)}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as "recrutamento" | "financeiro")}
        steps={activeTab === "recrutamento" && !allComplete ? funnelSteps : undefined}
        currentStep={currentStep}
        viewingStep={viewingStep}
        onStepClick={setViewingStep}
        selectorLabel={activeTab === "recrutamento" ? "Vaga" : undefined}
        selectorValue={selectedJobId || undefined}
        selectorOptions={activeTab === "recrutamento" ? jobOptions : undefined}
        onSelectorChange={setSelectedJobId}
        onAddJob={() => setIsModalOpen(true)}
        stepDirection={stepDirection}
      >
        {activeTab === "recrutamento" ? (
          jobs.length === 0 ? (
            <EmptyJobsState onCreateJob={() => setIsModalOpen(true)} />
          ) : (
            <StepComponent />
          )
        ) : (
          <FinanceiroTab />
        )}
      </FunnelLayout>

      {/* Job Creation Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Solicitar Nova Vaga</DialogTitle>
            <DialogDescription>
              Preencha os detalhes da vaga que você precisa. Nossa equipe irá analisar e buscar os melhores candidatos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Título da vaga *</Label>
              <Input
                id="title"
                placeholder="Ex: Auxiliar Administrativo"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="contract_type">Tipo de contrato *</Label>
                <Select
                  value={formData.contract_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, contract_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estagio">Estágio</SelectItem>
                    <SelectItem value="clt">CLT</SelectItem>
                    <SelectItem value="pj">PJ</SelectItem>
                    <SelectItem value="menor-aprendiz">Menor Aprendiz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="salary">Salario (R$)</Label>
                <Input
                  id="salary"
                  type="number"
                  placeholder="1500"
                  value={formData.salary}
                  onChange={(e) => setFormData(prev => ({ ...prev, salary: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="work_schedule">Horario de trabalho</Label>
              <WorkSchedulePicker
                value={formData.work_schedule}
                onChange={(value) => setFormData(prev => ({ ...prev, work_schedule: value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição das atividades *</Label>
              <Textarea
                id="description"
                placeholder="Descreva as principais atividades e responsabilidades..."
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="requirements">Requisitos</Label>
              <Textarea
                id="requirements"
                placeholder="Descreva os requisitos necessários..."
                rows={3}
                value={formData.requirements}
                onChange={(e) => setFormData(prev => ({ ...prev, requirements: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-white border-2 border-slate-200 hover:border-[#FF6B35]/50 hover:bg-slate-50 transition-all text-[#0A2342] font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={createJobMutation.isPending}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#1B4D7A] to-[#FF6B35] text-white font-medium shadow-lg shadow-[#FF6B35]/25 hover:shadow-[#FF6B35]/40 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createJobMutation.isPending ? 'Enviando...' : 'Solicitar Vaga'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function EmpresaPortal() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Check onboarding status
  const { data: onboardingStatus, isLoading: onboardingLoading } = trpc.company.checkOnboarding.useQuery(
    undefined,
    { enabled: !!user && user.role === "company" }
  );

  // Auth loading
  if (authLoading || onboardingLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <FunnelContentSkeleton />
      </div>
    );
  }

  // Not logged in or not a company
  if (!user || user.role !== "company") {
    setLocation("/login");
    return null;
  }

  // Company hasn't completed onboarding — redirect
  if (onboardingStatus && !onboardingStatus.completed) {
    setLocation("/company/onboarding");
    return null;
  }

  return (
    <CompanyFunnelProvider>
      <EmpresaPortalContent />
    </CompanyFunnelProvider>
  );
}
