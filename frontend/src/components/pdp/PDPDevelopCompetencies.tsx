import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { pdpCompetencies } from "@/data/pdpQuestions";
import { Check } from "lucide-react";

interface PDPDevelopCompetenciesProps {
  developCompetencies: number[];
  onChange: (competencies: number[]) => void;
}

export default function PDPDevelopCompetencies({
  developCompetencies,
  onChange,
}: PDPDevelopCompetenciesProps) {
  const handleToggle = (competencyId: number) => {
    if (developCompetencies.includes(competencyId)) {
      onChange(developCompetencies.filter(id => id !== competencyId));
    } else if (developCompetencies.length < 5) {
      onChange([...developCompetencies, competencyId]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Competências a Desenvolver</h2>
        <p className="text-muted-foreground mt-2">
          Escolha 5 competências que você precisa desenvolver ou melhorar
        </p>
        <Badge
          variant={developCompetencies.length === 5 ? "default" : "secondary"}
          className="mt-3"
        >
          {developCompetencies.length} / 5 selecionadas
        </Badge>
      </div>

      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pdpCompetencies.map((competency) => {
              const isSelected = developCompetencies.includes(competency.id);
              const canSelect = developCompetencies.length < 5 || isSelected;
              return (
                <button
                  key={competency.id}
                  onClick={() => canSelect && handleToggle(competency.id)}
                  disabled={!canSelect}
                  className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "border-orange-500 bg-orange-50 ring-2 ring-orange-200"
                      : canSelect
                      ? "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      : "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div>
                    <span className="font-medium">{competency.name}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {competency.description}
                    </p>
                  </div>
                  {isSelected && (
                    <Check className="h-5 w-5 text-orange-500 flex-shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
