import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { pdpCompetencies } from "@/data/pdpQuestions";
import { Check } from "lucide-react";

interface PDPTopCompetenciesProps {
  selectedCompetencies: number[]; // All competencies user has
  topCompetencies: number[]; // Top 10 selected
  onChange: (competencies: number[]) => void;
}

export default function PDPTopCompetencies({
  selectedCompetencies,
  topCompetencies,
  onChange,
}: PDPTopCompetenciesProps) {
  const handleToggle = (competencyId: number) => {
    if (topCompetencies.includes(competencyId)) {
      onChange(topCompetencies.filter(id => id !== competencyId));
    } else if (topCompetencies.length < 10) {
      onChange([...topCompetencies, competencyId]);
    }
  };

  // Only show competencies that were selected in the previous step
  const availableCompetencies = pdpCompetencies.filter(c =>
    selectedCompetencies.includes(c.id)
  );

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Suas Maiores Competências</h2>
        <p className="text-muted-foreground mt-2">
          Das competências que você selecionou, escolha as 10 que você tem com MAIOR intensidade
        </p>
        <Badge
          variant={topCompetencies.length === 10 ? "default" : "secondary"}
          className="mt-3"
        >
          {topCompetencies.length} / 10 selecionadas
        </Badge>
      </div>

      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableCompetencies.map((competency) => {
              const isSelected = topCompetencies.includes(competency.id);
              const canSelect = topCompetencies.length < 10 || isSelected;
              return (
                <button
                  key={competency.id}
                  onClick={() => canSelect && handleToggle(competency.id)}
                  disabled={!canSelect}
                  className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 ring-2 ring-primary/20"
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
                    <Check className="h-5 w-5 text-primary flex-shrink-0 ml-2" />
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
