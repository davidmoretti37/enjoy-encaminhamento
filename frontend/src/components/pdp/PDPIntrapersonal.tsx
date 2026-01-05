import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { pdpIntrapersonalQuestions } from "@/data/pdpQuestions";

interface PDPIntrapersonalProps {
  answers: Record<number, string>;
  onChange: (questionId: number, value: string) => void;
}

export default function PDPIntrapersonal({ answers, onChange }: PDPIntrapersonalProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Autoconhecimento</h2>
        <p className="text-muted-foreground mt-2">
          Responda as perguntas abaixo para nos ajudar a conhecer você melhor
        </p>
      </div>

      {pdpIntrapersonalQuestions.map((question) => (
        <Card key={question.id} className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              {question.id}. {question.question}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Textarea
                id={`question-${question.id}`}
                placeholder={question.placeholder}
                value={answers[question.id] || ""}
                onChange={(e) => onChange(question.id, e.target.value)}
                rows={4}
                className="resize-none"
              />
              {question.minLength && answers[question.id] && (
                <p className={`text-xs ${
                  answers[question.id].length >= question.minLength
                    ? "text-green-600"
                    : "text-muted-foreground"
                }`}>
                  {answers[question.id].length} / {question.minLength} caracteres minimos
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
