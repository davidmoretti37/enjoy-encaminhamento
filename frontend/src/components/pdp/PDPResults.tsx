import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Star, Target, Zap } from "lucide-react";
import { pdpCompetencies, pdpSkillCategories } from "@/data/pdpQuestions";

interface PDPResultsProps {
  skills: Record<string, string[]>;
  competencies: number[];
  topCompetencies: number[];
  developCompetencies: number[];
  actionPlans: Record<number, string[]>;
  onContinue: () => void;
  isSubmitting?: boolean;
}

export default function PDPResults({
  skills,
  competencies,
  topCompetencies,
  developCompetencies,
  actionPlans,
  onContinue,
  isSubmitting,
}: PDPResultsProps) {
  // Group competencies by category for visualization
  const competencyStats = useMemo(() => {
    const total = pdpCompetencies.length;
    const selected = competencies.length;
    const percentage = Math.round((selected / total) * 100);
    return { total, selected, percentage };
  }, [competencies]);

  // Get competency names
  const getCompetencyName = (id: number) =>
    pdpCompetencies.find(c => c.id === id)?.name || "";

  // Count total skills
  const totalSkills = Object.values(skills).flat().length;

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Seu Perfil de Desenvolvimento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Skills Summary */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Habilidades Digitais ({totalSkills})
            </h3>
            <div className="flex flex-wrap gap-2">
              {pdpSkillCategories.map((category) => {
                const categorySkills = skills[category.id] || [];
                return categorySkills.map((skill) => (
                  <Badge key={`${category.id}-${skill}`} variant="secondary">
                    {skill}
                  </Badge>
                ));
              })}
              {totalSkills === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma habilidade selecionada</p>
              )}
            </div>
          </div>

          {/* Competencies Overview */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Competências ({competencyStats.selected} de {competencyStats.total})
            </h3>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{ width: `${competencyStats.percentage}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Você possui {competencyStats.percentage}% das competências listadas
            </p>
          </div>

          {/* Top 10 Competencies */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Suas 10 Maiores Competências
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {topCompetencies.map((id, index) => (
                <div
                  key={id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-yellow-50 border border-yellow-200"
                >
                  <span className="w-6 h-6 rounded-full bg-yellow-500 text-white flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium">{getCompetencyName(id)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Development Areas */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-500" />
              Áreas de Desenvolvimento
            </h3>
            <div className="space-y-3">
              {developCompetencies.map((id) => {
                const actions = actionPlans[id] || [];
                const filledActions = actions.filter(a => a.trim());
                return (
                  <div
                    key={id}
                    className="p-3 rounded-lg bg-orange-50 border border-orange-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{getCompetencyName(id)}</span>
                      <Badge variant="outline" className="text-orange-600 border-orange-300">
                        {filledActions.length} ações
                      </Badge>
                    </div>
                    {filledActions.length > 0 && (
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {filledActions.map((action, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-orange-500">•</span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button
          onClick={onContinue}
          disabled={isSubmitting}
          size="lg"
          className="w-full max-w-md"
        >
          {isSubmitting ? (
            "Finalizando..."
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Concluir Cadastro
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
