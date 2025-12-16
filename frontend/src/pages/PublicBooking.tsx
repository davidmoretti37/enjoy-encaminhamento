import { useState, useEffect } from "react";
import { useParams, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Calendar as CalendarIcon, Clock, CheckCircle, Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type BookingStep = 'date' | 'time' | 'info' | 'confirmation';

export default function PublicBooking() {
  const params = useParams<{ adminId: string }>();
  const adminId = params.adminId;

  // Get email and schoolId from URL query params
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const emailFromUrl = urlParams.get('email') || "";
  const schoolIdFromUrl = urlParams.get('school') || undefined;

  const [step, setStep] = useState<BookingStep>('date');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [formData, setFormData] = useState({
    companyEmail: emailFromUrl,
    companyName: "",
    contactName: "",
    notes: "",
  });
  const [bookingResult, setBookingResult] = useState<any>(null);

  // Update email if URL changes
  useEffect(() => {
    if (emailFromUrl) {
      setFormData(prev => ({ ...prev, companyEmail: emailFromUrl }));
    }
  }, [emailFromUrl]);

  const { data: slots, isLoading: loadingSlots } = trpc.outreach.getAvailableSlots.useQuery(
    { adminId: adminId!, date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '' },
    { enabled: !!selectedDate && !!adminId }
  );

  const createBookingMutation = trpc.outreach.createBooking.useMutation({
    onSuccess: (data) => {
      setBookingResult(data);
      setStep('confirmation');
      toast.success("Reunião agendada com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao agendar: ${error.message}`);
    },
  });

  const handleDateSelect = (date: Date | undefined) => {
    if (date && !isBefore(date, startOfDay(new Date()))) {
      setSelectedDate(date);
      setSelectedSlot(null);
    }
  };

  const handleSlotSelect = (slot: { start: string; end: string }) => {
    setSelectedSlot(slot);
  };

  const handleSubmit = () => {
    if (!selectedSlot || !formData.companyName || !formData.contactName || !formData.companyEmail) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    createBookingMutation.mutate({
      adminId: adminId!,
      schoolId: schoolIdFromUrl,
      scheduledAt: selectedSlot.start,
      companyEmail: formData.companyEmail,
      companyName: formData.companyName,
      contactName: formData.contactName,
      notes: formData.notes || undefined,
    });
  };

  const goToNextStep = () => {
    if (step === 'date' && selectedDate) {
      setStep('time');
    } else if (step === 'time' && selectedSlot) {
      setStep('info');
    }
  };

  const goToPrevStep = () => {
    if (step === 'time') {
      setStep('date');
    } else if (step === 'info') {
      setStep('time');
    }
  };

  // Confirmation step
  if (step === 'confirmation' && bookingResult) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-lg w-full shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Reunião Agendada!</CardTitle>
            <CardDescription>
              Sua reunião foi agendada com sucesso. Você receberá um email de confirmação.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-slate-600" />
                <span className="font-medium">
                  {format(new Date(bookingResult.scheduled_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-600" />
                <span className="font-medium">
                  {format(new Date(bookingResult.scheduled_at), "HH:mm")}
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Guarde esta página ou verifique seu email para detalhes da reunião.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-slate-900 text-white py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <CalendarIcon className="h-8 w-8" />
            Agendar Reunião
          </h1>
          <p className="text-slate-300 mt-2">
            Selecione uma data e horário disponível para nossa conversa
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center gap-4 mb-8">
          {['date', 'time', 'info'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                  step === s
                    ? 'bg-blue-600 text-white'
                    : ['date', 'time', 'info'].indexOf(step) > i
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {['date', 'time', 'info'].indexOf(step) > i ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 2 && (
                <div
                  className={`w-16 h-1 mx-2 ${
                    ['date', 'time', 'info'].indexOf(step) > i ? 'bg-green-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card className="shadow-lg">
          {step === 'date' && (
            <>
              <CardHeader>
                <CardTitle>Escolha uma Data</CardTitle>
                <CardDescription>
                  Selecione o dia em que deseja agendar a reunião
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  locale={ptBR}
                  disabled={(date) => isBefore(date, startOfDay(new Date()))}
                  className="rounded-md border"
                />
              </CardContent>
            </>
          )}

          {step === 'time' && (
            <>
              <CardHeader>
                <CardTitle>
                  Escolha um Horário - {selectedDate && format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                </CardTitle>
                <CardDescription>
                  Selecione um dos horários disponíveis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSlots ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : slots && slots.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {slots.map((slot: any) => (
                      <Button
                        key={slot.start}
                        variant={
                          slot.blocked
                            ? "ghost"
                            : selectedSlot?.start === slot.start
                            ? "default"
                            : "outline"
                        }
                        className={`h-12 ${slot.blocked ? "opacity-40 cursor-not-allowed line-through text-muted-foreground" : ""}`}
                        onClick={() => !slot.blocked && handleSlotSelect(slot)}
                        disabled={slot.blocked}
                      >
                        {format(new Date(slot.start), "HH:mm")}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum horário disponível nesta data</p>
                    <p className="text-sm">Tente selecionar outro dia</p>
                  </div>
                )}
              </CardContent>
            </>
          )}

          {step === 'info' && (
            <>
              <CardHeader>
                <CardTitle>Suas Informações</CardTitle>
                <CardDescription>
                  Reunião em {selectedDate && format(selectedDate, "dd/MM/yyyy")} às{" "}
                  {selectedSlot && format(new Date(selectedSlot.start), "HH:mm")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Only show email field if not provided via URL */}
                {!emailFromUrl && (
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email da Empresa *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="empresa@exemplo.com"
                      value={formData.companyEmail}
                      onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                      required
                    />
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="companyName">Nome da Empresa *</Label>
                  <Input
                    id="companyName"
                    placeholder="Nome da sua empresa"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="contactName">Nome do Contato *</Label>
                  <Input
                    id="contactName"
                    placeholder="Seu nome"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Observações (opcional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Conte-nos sobre suas necessidades de contratação..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </CardContent>
            </>
          )}

          {/* Navigation */}
          <div className="flex justify-between p-6 border-t">
            {step !== 'date' ? (
              <Button variant="outline" onClick={goToPrevStep}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            ) : (
              <div />
            )}

            {step === 'date' && (
              <Button onClick={goToNextStep} disabled={!selectedDate}>
                Continuar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}

            {step === 'time' && (
              <Button onClick={goToNextStep} disabled={!selectedSlot}>
                Continuar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}

            {step === 'info' && (
              <Button
                onClick={handleSubmit}
                disabled={!formData.companyName || !formData.contactName || !formData.companyEmail || createBookingMutation.isPending}
              >
                {createBookingMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Agendando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmar Agendamento
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
