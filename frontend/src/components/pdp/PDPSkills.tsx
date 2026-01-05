import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { pdpSkillCategories } from "@/data/pdpQuestions";

interface PDPSkillsProps {
  skills: Record<string, string[]>;
  onChange: (categoryId: string, skills: string[]) => void;
}

export default function PDPSkills({ skills, onChange }: PDPSkillsProps) {
  const handleSkillToggle = (categoryId: string, skill: string, checked: boolean) => {
    const currentSkills = skills[categoryId] || [];
    if (checked) {
      onChange(categoryId, [...currentSkills, skill]);
    } else {
      onChange(categoryId, currentSkills.filter(s => s !== skill));
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Habilidades Digitais</h2>
        <p className="text-muted-foreground mt-2">
          Selecione as ferramentas e habilidades que você domina
        </p>
      </div>

      {pdpSkillCategories.map((category) => (
        <Card key={category.id} className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{category.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {category.skills.map((skill) => {
                const isChecked = (skills[category.id] || []).includes(skill);
                return (
                  <div key={skill} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${category.id}-${skill}`}
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        handleSkillToggle(category.id, skill, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`${category.id}-${skill}`}
                      className="font-normal cursor-pointer"
                    >
                      {skill}
                    </Label>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
