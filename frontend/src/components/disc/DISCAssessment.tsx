import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { discQuestions, DISCProfile } from "@/data/discQuestions";
import { motion, AnimatePresence } from "framer-motion";

interface DISCAssessmentProps {
  onComplete: (answers: Record<number, DISCProfile>) => void;
  onBack?: () => void;
}

export default function DISCAssessment({ onComplete, onBack }: DISCAssessmentProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, DISCProfile>>({});
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

  const question = discQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / discQuestions.length) * 100;
  const isLastQuestion = currentQuestion === discQuestions.length - 1;
  const canGoBack = currentQuestion > 0 || onBack;

  const handleSelect = (profile: DISCProfile) => {
    const newAnswers = { ...answers, [question.id]: profile };
    setAnswers(newAnswers);

    // Auto-advance after selection with a small delay
    setTimeout(() => {
      if (isLastQuestion) {
        onComplete(newAnswers);
      } else {
        setDirection(1);
        setCurrentQuestion(prev => prev + 1);
      }
    }, 300);
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setDirection(-1);
      setCurrentQuestion(prev => prev - 1);
    } else if (onBack) {
      onBack();
    }
  };

  const handleNext = () => {
    if (answers[question.id]) {
      if (isLastQuestion) {
        onComplete(answers);
      } else {
        setDirection(1);
        setCurrentQuestion(prev => prev + 1);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Pergunta {currentQuestion + 1} de {discQuestions.length}</span>
          <span>{Math.round(progress)}% completo</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question card with animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: direction * 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -50 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="shadow-lg">
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold text-center mb-8">
                {question.question}
              </h2>

              <div className="space-y-3">
                {question.options.map((option, index) => {
                  const isSelected = answers[question.id] === option.profile;
                  return (
                    <button
                      key={index}
                      onClick={() => handleSelect(option.profile)}
                      className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-200 ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <span className={isSelected ? "font-medium text-primary" : ""}>
                        {option.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={!canGoBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <Button
          type="button"
          onClick={handleNext}
          disabled={!answers[question.id]}
        >
          {isLastQuestion ? "Ver Resultado" : "Próximo"}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
