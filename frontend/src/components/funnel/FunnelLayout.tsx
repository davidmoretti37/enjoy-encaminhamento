import { ReactNode } from "react";
import { motion } from "framer-motion";
import FunnelHeader from "./FunnelHeader";
import FunnelStepIndicator from "./FunnelStepIndicator";
import FunnelTransition from "./FunnelTransition";

export interface FunnelStep {
  id: string;
  label: string;
  shortLabel?: string;
}

interface FunnelLayoutProps {
  children: ReactNode;
  // Header
  onMenuClick?: () => void;
  onBackClick?: () => void;
  // Tabs
  tabs: Array<{ id: string; label: string }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  // Steps (optional - only show when in funnel mode)
  steps?: FunnelStep[];
  currentStep?: number;
  viewingStep?: number;
  onStepClick?: (stepIndex: number) => void;
  // Selector (job or application)
  selectorLabel?: string;
  selectorValue?: string;
  selectorOptions?: Array<{ id: string; label: string; sublabel?: string }>;
  onSelectorChange?: (id: string) => void;
  onAddJob?: () => void; // NEW: callback for add job button
  // Content direction for animations
  stepDirection?: number;
  // Loading state
  isLoading?: boolean;
}

export default function FunnelLayout({
  children,
  onMenuClick,
  onBackClick,
  tabs,
  activeTab,
  onTabChange,
  steps,
  currentStep = 0,
  viewingStep,
  onStepClick,
  selectorLabel,
  selectorValue,
  selectorOptions,
  onSelectorChange,
  onAddJob,
  stepDirection = 1,
  isLoading = false,
}: FunnelLayoutProps) {
  const showTimeline = steps && steps.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 text-[#0A2342] overflow-x-hidden">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 bg-[#0A2342]/5 pointer-events-none" />

      {/* Main container */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <FunnelHeader
          onMenuClick={onMenuClick}
          onBackClick={onBackClick}
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={onTabChange}
          selectorOptions={selectorOptions}
          selectorValue={selectorValue}
          onSelectorChange={onSelectorChange}
          onAddJob={onAddJob}
        />


        {/* Main content area - Better spacing */}
        <div className="flex-1 flex px-6 py-6 gap-4 max-w-[1600px] mx-auto w-full">
          {/* Vertical Timeline (left side) */}
          {showTimeline && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="w-64 shrink-0"
            >
              <FunnelStepIndicator
                steps={steps}
                currentStep={currentStep}
                viewingStep={viewingStep}
                onStepClick={onStepClick}
              />
            </motion.div>
          )}

          {/* Content area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Step content with transitions */}
            <div className="flex-1 relative">
              {isLoading ? (
                <LoadingState />
              ) : (
                <FunnelTransition stepKey={viewingStep ?? currentStep} direction={stepDirection}>
                  {children}
                </FunnelTransition>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// Loading State Component
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 border-slate-200" />
        <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-[#FF6B35] animate-spin" />
      </div>
      <p className="mt-4 text-slate-500 text-sm">Carregando...</p>
    </div>
  );
}

