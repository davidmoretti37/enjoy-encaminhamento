import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pdpCompetencies } from "@/data/pdpQuestions";

interface PDPActionPlansProps {
  developCompetencies: number[];
  actionPlans: Record<number, string[]>;
  onChange: (competencyId: number, actions: string[]) => void;
}

export default function PDPActionPlans({
  developCompetencies,
  actionPlans,
  onChange,
}: PDPActionPlansProps) {
  const handleActionChange = (competencyId: number, index: number, value: string) => {
    const currentActions = actionPlans[competencyId] || ["", "", ""];
    const newActions = [...currentActions];
    newActions[index] = value;
    onChange(competencyId, newActions);
  };

  const selectedCompetencies = pdpCompetencies.filter(c =>
    developCompetencies.includes(c.id)
  );

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Plano de Ação</h2>
        <p className="text-muted-foreground mt-2">
          Para cada competência a desenvolver, liste 3 ações concretas que você pode tomar
        </p>
      </div>

      {selectedCompetencies.map((competency) => {
        const actions = actionPlans[competency.id] || ["", "", ""];
        return (
          <Card key={competency.id} className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold">
                  {competency.id}
                </span>
                {competency.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{competency.description}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {[0, 1, 2].map((index) => (
                <div key={index} className="space-y-1">
                  <Label htmlFor={`action-${competency.id}-${index}`} className="text-sm">
                    Ação {index + 1}
                  </Label>
                  <Input
                    id={`action-${competency.id}-${index}`}
                    placeholder={`O que você vai fazer para desenvolver ${competency.name.toLowerCase()}?`}
                    value={actions[index] || ""}
                    onChange={(e) =>
                      handleActionChange(competency.id, index, e.target.value)
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
