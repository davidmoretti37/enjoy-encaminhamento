import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { FunnelStep } from "./FunnelLayout";

interface FunnelStepIndicatorProps {
  steps: FunnelStep[];
  currentStep: number;
  viewingStep?: number;
  onStepClick?: (stepIndex: number) => void;
}

export default function FunnelStepIndicator({
  steps,
  currentStep,
  viewingStep,
  onStepClick,
}: FunnelStepIndicatorProps) {
  const activeStep = viewingStep ?? currentStep;

  return (
    <div
      className="bg-white rounded-xl border border-slate-200 p-5"
      style={{
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
      }}
    >
      {/* Steps list */}
      <div className="space-y-0">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === activeStep;
          const isCurrent = index === currentStep;
          const isClickable = index <= currentStep && onStepClick;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="relative">
              {/* Step item */}
              <motion.button
                onClick={() => isClickable && onStepClick?.(index)}
                disabled={!isClickable}
                className={`
                  relative flex items-center gap-3 w-full text-left py-3 px-2 -mx-2 rounded-lg
                  transition-colors duration-200
                  ${isClickable ? "cursor-pointer hover:bg-slate-50" : "cursor-default"}
                `}
                whileHover={isClickable ? { x: 2 } : undefined}
              >
                {/* Dot */}
                <div className="relative shrink-0">
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isActive ? 1.2 : 1,
                    }}
                    transition={{ duration: 0.3 }}
                    className={`
                      flex items-center justify-center rounded-full
                      ${isActive ? 'w-6 h-6' : 'w-5 h-5'}
                    `}
                    style={{
                      backgroundColor: isActive
                        ? '#FF6B35'
                        : isCompleted
                        ? '#0A2342'
                        : '#ffffff',
                      border: !isCompleted && !isActive ? '2px solid #e2e8f0' : 'none',
                      boxShadow: isActive ? '0 2px 8px rgba(255, 107, 53, 0.3)' : 'none'
                    }}
                  >
                    {/* Completed (not actively viewing): Checkmark */}
                    {isCompleted && !isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      >
                        <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                      </motion.div>
                    )}

                    {/* Active: Pulsing white dot */}
                    {isActive && (
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-white"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      />
                    )}
                  </motion.div>
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <motion.span
                    className={`
                      block text-sm
                      ${isActive ? "font-semibold" : "font-medium"}
                    `}
                    style={{
                      color: isActive ? '#FF6B35' : isCompleted ? '#0A2342' : '#64748b'
                    }}
                  >
                    {step.shortLabel || step.label}
                  </motion.span>

                  {/* "Atual" badge on the actual current step */}
                  {isCurrent && (
                    <span className="text-[10px] text-[#FF6B35] uppercase tracking-wider mt-0.5 block font-medium">
                      Atual
                    </span>
                  )}
                </div>
              </motion.button>

              {/* Connector line */}
              {!isLast && (
                <div
                  className="absolute w-0.5 h-8"
                  style={{
                    left: isActive ? '11px' : '10px', // Center under dot
                    top: isActive ? '36px' : '32px',
                    backgroundColor: isCompleted ? '#0A2342' : '#e2e8f0',
                    transition: 'background-color 0.4s ease-out'
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress summary */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-slate-500 font-medium">Progresso</span>
          <span className="text-[#0A2342] font-semibold">
            {currentStep + 1} de {steps.length}
          </span>
        </div>

        {/* Simple progress bar */}
        <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #1B4D7A 0%, #FF6B35 100%)'
            }}
          />
        </div>
      </div>
    </div>
  );
}
