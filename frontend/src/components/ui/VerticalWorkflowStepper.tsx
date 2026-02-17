import { Check } from "lucide-react";

export interface WorkflowStep {
  id: string;
  label: string;
  status: 'completed' | 'current' | 'upcoming';
  sectionId: string;
}

interface VerticalWorkflowStepperProps {
  steps: WorkflowStep[];
  onStepClick: (stepId: string) => void;
}

export default function VerticalWorkflowStepper({ steps, onStepClick }: VerticalWorkflowStepperProps) {
  return (
    <div className="fixed top-1/2 -translate-y-1/2 right-6 z-20">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/60 px-3 py-4">
        <div className="flex flex-col items-center">
          {steps.map((step, index) => {
            const isCompleted = step.status === 'completed';
            const isCurrent = step.status === 'current';
            const isLast = index === steps.length - 1;

            return (
              <div key={step.id} className="flex flex-col items-center">
                {/* Step circle */}
                <button
                  onClick={() => onStepClick(step.id)}
                  className="relative group transition-transform hover:scale-110 active:scale-95"
                  title={step.label}
                >
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${
                      isCompleted
                        ? 'bg-green-500 shadow-md shadow-green-500/30'
                        : isCurrent
                        ? 'bg-[#FF6B35] shadow-md shadow-orange-500/30'
                        : 'bg-white border-2 border-slate-200 group-hover:border-orange-300 group-hover:shadow-sm'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                    ) : (
                      <span
                        className={`text-sm font-bold ${
                          isCurrent ? 'text-white' : 'text-slate-400 group-hover:text-orange-400'
                        }`}
                      >
                        {index + 1}
                      </span>
                    )}
                  </div>
                </button>

                {/* Connecting line */}
                {!isLast && (
                  <div
                    className={`w-0.5 h-5 rounded-full transition-colors duration-300 ${
                      isCompleted ? 'bg-green-400' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
