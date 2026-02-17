import { cn } from "@/lib/utils";

interface JobProgressBarProps {
  currentStep: number;
  className?: string;
  compact?: boolean;
}

const steps = [
  { id: 1, label: 'Buscando candidatos', shortLabel: 'Busca' },
  { id: 2, label: 'Candidatos encontrados', shortLabel: 'Encontrados' },
  { id: 3, label: 'Pré-seleção em andamento', shortLabel: 'Pré-seleção' },
  { id: 4, label: 'Lista enviada', shortLabel: 'Enviado' },
];

// Map job status to step number
export const statusToStep: Record<string, number> = {
  pending_review: 1,
  searching: 1,
  candidates_found: 2,
  in_selection: 3,
  list_sent: 4,
  filled: 4,
  paused: 1,
};

export default function JobProgressBar({ currentStep, className, compact = false }: JobProgressBarProps) {
  return (
    <div className={cn("", className)}>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(17, 24, 39, 0.4); }
          50% { transform: scale(1.15); box-shadow: 0 0 0 8px rgba(17, 24, 39, 0); }
        }
      `}</style>

      {/* Progress steps with tapered lines */}
      <div className="relative flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            {/* Dot */}
            <div
              className={cn(
                "relative z-10 rounded-full border-2 transition-all flex-shrink-0",
                compact ? "w-5 h-5" : "w-6 h-6",
                step.id < currentStep
                  ? 'bg-gray-900 border-gray-900'
                  : step.id === currentStep
                    ? 'bg-gray-900 border-gray-900'
                    : 'bg-white border-gray-300'
              )}
              style={step.id === currentStep ? {
                animation: 'pulse-dot 2s ease-in-out infinite',
              } : undefined}
            >
              {step.id < currentStep && (
                <svg className="w-full h-full text-white p-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>

            {/* Tapered connector line - needle point at end */}
            {index < steps.length - 1 && (
              <div className="flex-1 mx-0.5 h-6 flex items-center">
                <div
                  className="w-full"
                  style={{
                    height: compact ? '4px' : '6px',
                    background: step.id < currentStep ? '#111827' : '#d1d5db',
                    clipPath: 'polygon(0% 10%, 100% 48%, 100% 52%, 0% 90%)',
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Step labels */}
      <div className="flex justify-between mt-3">
        {steps.map((step) => (
          <div key={step.id} className="flex-1 text-center first:text-left last:text-right">
            <span className={cn(
              "text-xs",
              step.id <= currentStep ? 'text-gray-900 font-medium' : 'text-gray-400'
            )}>
              <span className="hidden sm:inline">{step.label}</span>
              <span className="sm:hidden">{step.shortLabel}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
