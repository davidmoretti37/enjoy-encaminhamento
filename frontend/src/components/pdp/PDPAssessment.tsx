import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PDPResults as PDPResultsType } from "@/data/pdpQuestions";
import PDPIntrapersonal from "./PDPIntrapersonal";
import PDPInterpersonal from "./PDPInterpersonal";
import PDPSkills from "./PDPSkills";
import PDPCompetencies from "./PDPCompetencies";
import PDPTopCompetencies from "./PDPTopCompetencies";
import PDPDevelopCompetencies from "./PDPDevelopCompetencies";
import PDPActionPlans from "./PDPActionPlans";

type PDPStep =
  | "intrapersonal"
  | "interpersonal"
  | "skills"
  | "competencies"
  | "top_competencies"
  | "develop_competencies"
  | "action_plans";

const STEPS: PDPStep[] = [
  "intrapersonal",
  "interpersonal",
  "skills",
  "competencies",
  "top_competencies",
  "develop_competencies",
  "action_plans",
];

const STEP_TITLES: Record<PDPStep, string> = {
  intrapersonal: "Autoconhecimento",
  interpersonal: "Relacionamento",
  skills: "Habilidades",
  competencies: "Competências",
  top_competencies: "Top 10",
  develop_competencies: "Desenvolver",
  action_plans: "Plano de Ação",
};

interface PDPAssessmentProps {
  onComplete: (results: PDPResultsType) => void;
  onBack?: () => void;
}

export default function PDPAssessment({ onComplete, onBack }: PDPAssessmentProps) {
  const [currentStep, setCurrentStep] = useState<PDPStep>("intrapersonal");
  const [direction, setDirection] = useState(1);

  // Form state
  const [intrapersonalAnswers, setIntrapersonalAnswers] = useState<Record<number, string>>({});
  const [interpersonalAnswers, setInterpersonalAnswers] = useState<Record<number, string>>({});
  const [skills, setSkills] = useState<Record<string, string[]>>({});
  const [competencies, setCompetencies] = useState<number[]>([]);
  const [topCompetencies, setTopCompetencies] = useState<number[]>([]);
  const [developCompetencies, setDevelopCompetencies] = useState<number[]>([]);
  const [actionPlans, setActionPlans] = useState<Record<number, string[]>>({});

  const currentStepIndex = STEPS.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const canProceed = (): boolean => {
    switch (currentStep) {
      case "intrapersonal":
        // At least some answers provided
        return Object.keys(intrapersonalAnswers).length >= 5;
      case "interpersonal":
        return Object.keys(interpersonalAnswers).length >= 7;
      case "skills":
        return true; // Skills are optional
      case "competencies":
        return competencies.length >= 5; // At least 5 competencies
      case "top_competencies":
        return topCompetencies.length === 10;
      case "develop_competencies":
        return developCompetencies.length === 5;
      case "action_plans":
        // At least 1 action per competency
        return developCompetencies.every(id => {
          const actions = actionPlans[id] || [];
          return actions.filter(a => a.trim()).length >= 1;
        });
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canProceed()) return;

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setDirection(1);
      setCurrentStep(STEPS[nextIndex]);
    } else {
      // Complete the assessment
      onComplete({
        intrapersonal: intrapersonalAnswers,
        interpersonal: interpersonalAnswers,
        skills,
        competencies,
        topCompetencies,
        developCompetencies,
        actionPlans,
      });
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setDirection(-1);
      setCurrentStep(STEPS[prevIndex]);
    } else if (onBack) {
      onBack();
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case "intrapersonal":
        return (
          <PDPIntrapersonal
            answers={intrapersonalAnswers}
            onChange={(id, value) =>
              setIntrapersonalAnswers(prev => ({ ...prev, [id]: value }))
            }
          />
        );
      case "interpersonal":
        return (
          <PDPInterpersonal
            answers={interpersonalAnswers}
            onChange={(id, value) =>
              setInterpersonalAnswers(prev => ({ ...prev, [id]: value }))
            }
          />
        );
      case "skills":
        return (
          <PDPSkills
            skills={skills}
            onChange={(categoryId, categorySkills) =>
              setSkills(prev => ({ ...prev, [categoryId]: categorySkills }))
            }
          />
        );
      case "competencies":
        return (
          <PDPCompetencies
            selectedCompetencies={competencies}
            onChange={setCompetencies}
          />
        );
      case "top_competencies":
        return (
          <PDPTopCompetencies
            selectedCompetencies={competencies}
            topCompetencies={topCompetencies}
            onChange={setTopCompetencies}
          />
        );
      case "develop_competencies":
        return (
          <PDPDevelopCompetencies
            developCompetencies={developCompetencies}
            onChange={setDevelopCompetencies}
          />
        );
      case "action_plans":
        return (
          <PDPActionPlans
            developCompetencies={developCompetencies}
            actionPlans={actionPlans}
            onChange={(id, actions) =>
              setActionPlans(prev => ({ ...prev, [id]: actions }))
            }
          />
        );
      default:
        return null;
    }
  };

  const isLastStep = currentStepIndex === STEPS.length - 1;

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{STEP_TITLES[currentStep]}</span>
          <span>Etapa {currentStepIndex + 1} de {STEPS.length}</span>
        </div>
        <Progress value={progress} className="h-2" />
        {/* Step indicators */}
        <div className="flex justify-between mt-2">
          {STEPS.map((step, index) => (
            <div
              key={step}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                index < currentStepIndex
                  ? "bg-primary text-primary-foreground"
                  : index === currentStepIndex
                  ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {index + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Step content with animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: direction * 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -50 }}
          transition={{ duration: 0.2 }}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={currentStepIndex === 0 && !onBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <Button
          type="button"
          onClick={handleNext}
          disabled={!canProceed()}
        >
          {isLastStep ? "Concluir PDP" : "Próximo"}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
