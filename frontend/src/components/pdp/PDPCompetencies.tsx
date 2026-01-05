import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { pdpCompetencies } from "@/data/pdpQuestions";

interface PDPCompetenciesProps {
  selectedCompetencies: number[];
  onChange: (competencies: number[]) => void;
}

export default function PDPCompetencies({ selectedCompetencies, onChange }: PDPCompetenciesProps) {
  const handleToggle = (competencyId: number, checked: boolean) => {
    if (checked) {
      onChange([...selectedCompetencies, competencyId]);
    } else {
      onChange(selectedCompetencies.filter(id => id !== competencyId));
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Competências</h2>
        <p className="text-muted-foreground mt-2">
          Selecione todas as competências que você possui
        </p>
        <Badge variant="secondary" className="mt-3">
          {selectedCompetencies.length} competências selecionadas
        </Badge>
      </div>

      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pdpCompetencies.map((competency) => {
              const isChecked = selectedCompetencies.includes(competency.id);
              return (
                <div
                  key={competency.id}
                  className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                    isChecked
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Checkbox
                    id={`competency-${competency.id}`}
                    checked={isChecked}
                    onCheckedChange={(checked) =>
                      handleToggle(competency.id, checked as boolean)
                    }
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={`competency-${competency.id}`}
                      className="font-medium cursor-pointer block"
                    >
                      {competency.name}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {competency.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
