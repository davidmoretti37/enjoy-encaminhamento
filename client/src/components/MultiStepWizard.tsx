import React, { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: string;
  title: string;
  description?: string;
  content: ReactNode;
}

interface MultiStepWizardProps {
  steps: Step[];
  currentStep: number;
  onNext: () => void;
  onPrevious: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  className?: string;
}

export function MultiStepWizard({
  steps,
  currentStep,
  onNext,
  onPrevious,
  onSubmit,
  isSubmitting = false,
  canGoNext = true,
  canGoPrevious = true,
  className,
}: MultiStepWizardProps) {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const currentStepData = steps[currentStep];

  return (
    <div className={cn('w-full', className)}>
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center relative">
                  <div
                    className={cn(
                      'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
                      isCompleted && 'bg-green-500 border-green-500 text-white',
                      isCurrent && 'bg-slate-900 border-slate-900 text-white',
                      !isCompleted && !isCurrent && 'bg-white border-slate-300 text-slate-400'
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-semibold">{index + 1}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      'absolute -bottom-6 text-xs text-center whitespace-nowrap',
                      isCurrent ? 'text-slate-900 font-semibold' : 'text-slate-500'
                    )}
                  >
                    {step.title}
                  </span>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mx-2 transition-all',
                      index < currentStep ? 'bg-green-500' : 'bg-slate-300'
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <Card className="shadow-lg mt-12 overflow-hidden">
        <CardHeader className="bg-slate-900 text-white">
          <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
          {currentStepData.description && (
            <CardDescription className="text-slate-300">
              {currentStepData.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-6">
          {currentStepData.content}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onPrevious}
              disabled={isFirstStep || !canGoPrevious || isSubmitting}
              className={cn(isFirstStep && 'invisible')}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>

            {isLastStep ? (
              <Button
                type="button"
                onClick={onSubmit}
                disabled={!canGoNext || isSubmitting}
              >
                {isSubmitting ? 'Enviando...' : 'Finalizar Cadastro'}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={onNext}
                disabled={!canGoNext || isSubmitting}
              >
                Próximo
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
