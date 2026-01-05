import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { pdpInterpersonalQuestions } from "@/data/pdpQuestions";

interface PDPInterpersonalProps {
  answers: Record<number, string>;
  onChange: (questionId: number, value: string) => void;
}

export default function PDPInterpersonal({ answers, onChange }: PDPInterpersonalProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Relacionamento Interpessoal</h2>
        <p className="text-muted-foreground mt-2">
          Como você se relaciona com outras pessoas no ambiente de trabalho
        </p>
      </div>

      {pdpInterpersonalQuestions.map((question) => (
        <Card key={question.id} className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              {question.id}. {question.question}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {'type' in question && question.type === 'multiple_choice' ? (
              <RadioGroup
                value={answers[question.id] || ""}
                onValueChange={(value) => onChange(question.id, value)}
                className="space-y-3"
              >
                {question.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <RadioGroupItem value={option} id={`q${question.id}-opt${index}`} />
                    <Label
                      htmlFor={`q${question.id}-opt${index}`}
                      className="font-normal cursor-pointer"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <div className="space-y-2">
                <Textarea
                  id={`question-${question.id}`}
                  placeholder={'placeholder' in question ? question.placeholder : ''}
                  value={answers[question.id] || ""}
                  onChange={(e) => onChange(question.id, e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                {'minLength' in question && question.minLength && answers[question.id] && (
                  <p className={`text-xs ${
                    answers[question.id].length >= question.minLength
                      ? "text-green-600"
                      : "text-muted-foreground"
                  }`}>
                    {answers[question.id].length} / {question.minLength} caracteres minimos
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
