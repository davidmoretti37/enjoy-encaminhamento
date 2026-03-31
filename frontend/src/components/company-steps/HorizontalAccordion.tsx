import { motion } from "framer-motion";
import { Check, Clock, CalendarCheck, FileSignature } from "lucide-react";
import { useCompanyFunnel } from "@/contexts/CompanyFunnelContext";

import StepPreferencia from "./StepPreferencia";
import StepEntrevista from "./StepEntrevista";
import StepContratacao from "./StepContratacao";
import StepFuncionarioAtivo from "./StepFuncionarioAtivo";

interface HorizontalAccordionProps {
  currentStep: number; // 0, 1, or 2
  allComplete: boolean; // true when all 3 done
}

const PANEL_CONFIG = [
  {
    id: "preferencia",
    title: "Preferencia",
    icon: CalendarCheck,
    summaryKey: "preference",
  },
  {
    id: "entrevista",
    title: "Entrevista",
    icon: Clock,
    summaryKey: "interview",
  },
  {
    id: "contratacao",
    title: "Contrato",
    icon: FileSignature,
    summaryKey: "contract",
  },
] as const;

function PanelContent({ stepIndex }: { stepIndex: number }) {
  switch (stepIndex) {
    case 0:
      return <StepPreferencia />;
    case 1:
      return <StepEntrevista />;
    case 2:
      return <StepContratacao />;
    default:
      return null;
  }
}

function CompletedSummary({
  stepIndex,
}: {
  stepIndex: number;
}) {
  const { selectedJob, hiringProcesses, selectedJobId } = useCompanyFunnel();

  if (stepIndex === 0) {
    // Preference summary
    const type = selectedJob?.preferred_interview_type || "Online";
    return (
      <div className="text-xs text-green-700 mt-2 leading-tight">
        <p className="font-medium truncate">{type}</p>
      </div>
    );
  }

  if (stepIndex === 1) {
    // Interview summary
    return (
      <div className="text-xs text-green-700 mt-2 leading-tight">
        <p className="font-medium">Concluida</p>
      </div>
    );
  }

  if (stepIndex === 2) {
    // Contract summary
    const active = hiringProcesses.some(
      (hp: any) => hp.job?.id === selectedJobId && hp.status === "active"
    );
    return (
      <div className="text-xs text-green-700 mt-2 leading-tight">
        <p className="font-medium">{active ? "Ativo" : "Assinado"}</p>
      </div>
    );
  }

  return null;
}

export default function HorizontalAccordion({
  currentStep,
  allComplete,
}: HorizontalAccordionProps) {
  const { viewingStep, setViewingStep } = useCompanyFunnel();

  // When allComplete, show all panels as completed + StepFuncionarioAtivo below
  if (allComplete) {
    return (
      <div className="space-y-6">
        {/* All 3 completed panels */}
        <div className="flex flex-col md:flex-row gap-3">
          {PANEL_CONFIG.map((panel, index) => (
            <motion.div
              key={panel.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="flex-1 bg-green-50 border-2 border-green-200 rounded-2xl p-4 cursor-pointer hover:border-green-300 transition-colors"
              onClick={() => setViewingStep(index)}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                </div>
                <span className="text-sm font-semibold text-green-800">
                  {index + 1}. {panel.title}
                </span>
              </div>
              <CompletedSummary stepIndex={index} />
            </motion.div>
          ))}
        </div>

        {/* Active employee section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <StepFuncionarioAtivo />
        </motion.div>
      </div>
    );
  }

  // Determine which panel is expanded
  // If user clicked a completed step, show that; otherwise show currentStep
  const expandedIndex =
    viewingStep !== undefined && viewingStep <= currentStep
      ? viewingStep
      : currentStep;

  return (
    <div className="flex flex-col md:flex-row gap-3 min-h-[400px]">
      {PANEL_CONFIG.map((panel, index) => {
        const isExpanded = expandedIndex === index;
        const isCompleted = index < currentStep;
        const isFuture = index > currentStep;
        const IconComponent = panel.icon;

        return (
          <motion.div
            key={panel.id}
            layout
            initial={false}
            animate={{
              flex: isExpanded ? 3 : 1,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            className={`
              relative rounded-2xl border-2 overflow-hidden transition-colors
              ${
                isExpanded
                  ? "bg-white border-[#FF6B35]/30 shadow-lg shadow-[#FF6B35]/10"
                  : isCompleted
                  ? "bg-green-50 border-green-200 cursor-pointer hover:border-green-300"
                  : "bg-slate-50 border-slate-200"
              }
            `}
            onClick={() => {
              if (!isExpanded && isCompleted) {
                setViewingStep(index);
              }
            }}
          >
            {/* Collapsed: completed */}
            {!isExpanded && isCompleted && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full p-4 text-center"
              >
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center mb-2">
                  <Check className="w-5 h-5 text-white" strokeWidth={3} />
                </div>
                <span className="text-sm font-semibold text-green-800 leading-tight">
                  {panel.title}
                </span>
                <CompletedSummary stepIndex={index} />
              </motion.div>
            )}

            {/* Collapsed: future */}
            {!isExpanded && isFuture && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full p-4 text-center"
              >
                <div className="w-10 h-10 rounded-full border-2 border-slate-300 flex items-center justify-center mb-2">
                  <span className="text-sm font-bold text-slate-400">
                    {index + 1}
                  </span>
                </div>
                <span className="text-sm font-semibold text-slate-400 leading-tight">
                  {panel.title}
                </span>
                <p className="text-xs text-slate-400 mt-2">Aguardando</p>
              </motion.div>
            )}

            {/* Expanded: active panel */}
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="p-5 h-full flex flex-col"
              >
                {/* Panel header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-full bg-[#FF6B35] flex items-center justify-center shrink-0">
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-[#0A2342]">
                    {index + 1}. {panel.title}
                  </h3>
                </div>

                {/* Step content */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <PanelContent stepIndex={index} />
                </div>
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
