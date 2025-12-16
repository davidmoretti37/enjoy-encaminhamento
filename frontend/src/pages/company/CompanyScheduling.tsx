import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import ClassicLoader from "@/components/ui/ClassicLoader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import {
  Calendar,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function CompanyScheduling() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("visits");
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<any>(null);
  const [availabilityForm, setAvailabilityForm] = useState({
    date: '',
    time: '',
  });
  const [feedbackForm, setFeedbackForm] = useState({
    attended: 'yes',
    decision: '',
    reason: '',
    notes: '',
  });

  const utils = trpc.useUtils();

  const { data: visits, isLoading: visitsLoading } = trpc.company.getVisits.useQuery(
    undefined,
    { enabled: !!user && user.role === 'company' }
  );

  const { data: interviews, isLoading: interviewsLoading } = trpc.company.getInterviews.useQuery(
    undefined,
    { enabled: !!user && user.role === 'company' }
  );

  const { data: pendingFeedback, isLoading: feedbackLoading } = trpc.company.getPendingFeedback.useQuery(
    undefined,
    { enabled: !!user && user.role === 'company' }
  );

  const submitAvailabilityMutation = trpc.company.submitVisitAvailability.useMutation({
    onSuccess: () => {
      toast.success('Disponibilidade confirmada!');
      utils.company.getVisits.invalidate();
      setAvailabilityForm({ date: '', time: '' });
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao confirmar disponibilidade');
    },
  });

  const submitFeedbackMutation = trpc.company.submitInterviewFeedback.useMutation({
    onSuccess: () => {
      toast.success('Feedback enviado!');
      setFeedbackModalOpen(false);
      setSelectedInterview(null);
      setFeedbackForm({ attended: 'yes', decision: '', reason: '', notes: '' });
      utils.company.getPendingFeedback.invalidate();
      utils.company.getInterviews.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao enviar feedback');
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClassicLoader />
      </div>
    );
  }

  if (!user || user.role !== 'company') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Você precisa ser uma empresa para acessar esta página.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button>Voltar para Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleOpenFeedback = (interview: any) => {
    setSelectedInterview(interview);
    setFeedbackModalOpen(true);
  };

  const handleSubmitFeedback = () => {
    if (!feedbackForm.decision) {
      toast.error('Selecione uma decisão');
      return;
    }

    submitFeedbackMutation.mutate({
      applicationId: selectedInterview.id,
      candidateAttended: feedbackForm.attended === 'yes',
      decision: feedbackForm.decision as 'hire' | 'reject',
      rejectionReason: feedbackForm.reason || undefined,
      notes: feedbackForm.notes || undefined,
    });
  };

  const handleSubmitAvailability = (presentationId: string) => {
    if (!availabilityForm.date || !availabilityForm.time) {
      toast.error('Preencha data e horário');
      return;
    }

    const scheduledAt = new Date(`${availabilityForm.date}T${availabilityForm.time}`).toISOString();
    submitAvailabilityMutation.mutate({ presentationId, scheduledAt });
  };

  const scheduledVisits = visits?.filter((v: any) => v.status === 'scheduled') || [];
  const pendingAvailabilityVisits = visits?.filter((v: any) => v.status === 'pending_availability') || [];
  const completedVisits = visits?.filter((v: any) => v.status === 'completed') || [];

  const scheduledInterviews = interviews?.filter((i: any) => i.status === 'interview-scheduled') || [];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header - Centered */}
        <div className="text-center py-4">
          <h1 className="text-3xl font-bold text-gray-900">Agenda</h1>
          <p className="text-gray-500 mt-1">Gerencie visitas e entrevistas</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="visits">Visitas</TabsTrigger>
            <TabsTrigger value="interviews" className="relative">
              Entrevistas
              {pendingFeedback && pendingFeedback.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {pendingFeedback.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Visits Tab */}
          <TabsContent value="visits" className="space-y-6">
            {visitsLoading ? (
              <div className="text-center py-8"><ClassicLoader /></div>
            ) : (
              <>
                {/* Scheduled Visits */}
                {scheduledVisits.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Agendadas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {scheduledVisits.map((visit: any) => (
                        <div key={visit.id} className="border rounded-lg p-4 bg-green-50">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-purple-100 text-purple-700">
                              Visita de Apresentação
                            </Badge>
                          </div>
                          <h4 className="font-semibold text-gray-900">{visit.job?.title}</h4>
                          <p className="text-gray-600 mt-1">
                            <Calendar className="inline h-4 w-4 mr-1" />
                            {visit.scheduled_at && format(new Date(visit.scheduled_at), "EEEE, dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Pending Availability */}
                {pendingAvailabilityVisits.length > 0 && (
                  <Card className="border-amber-200">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
                        <Clock className="h-5 w-5" />
                        Aguardando Sua Disponibilidade
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {pendingAvailabilityVisits.map((visit: any) => (
                        <div key={visit.id} className="border rounded-lg p-4 bg-amber-50">
                          <h4 className="font-semibold text-gray-900">{visit.job?.title}</h4>
                          <p className="text-gray-600 mt-1">
                            Encontramos candidatos! Quando podemos visitar sua empresa para apresentá-los?
                          </p>
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                              <Label htmlFor={`date-${visit.id}`}>Data</Label>
                              <Input
                                id={`date-${visit.id}`}
                                type="date"
                                value={availabilityForm.date}
                                onChange={(e) => setAvailabilityForm(prev => ({ ...prev, date: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`time-${visit.id}`}>Horário</Label>
                              <Input
                                id={`time-${visit.id}`}
                                type="time"
                                value={availabilityForm.time}
                                onChange={(e) => setAvailabilityForm(prev => ({ ...prev, time: e.target.value }))}
                              />
                            </div>
                          </div>
                          <Button
                            className="mt-4 w-full"
                            onClick={() => handleSubmitAvailability(visit.id)}
                            disabled={submitAvailabilityMutation.isPending}
                          >
                            {submitAvailabilityMutation.isPending ? 'Confirmando...' : 'Confirmar Disponibilidade'}
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Completed Visits */}
                {completedVisits.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg text-gray-600">Realizadas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {completedVisits.map((visit: any) => (
                          <div key={visit.id} className="flex items-center justify-between py-2 text-sm text-gray-600">
                            <span>{visit.job?.title}</span>
                            <span>
                              {visit.completed_at && format(new Date(visit.completed_at), 'dd/MM/yyyy', { locale: ptBR })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {scheduledVisits.length === 0 && pendingAvailabilityVisits.length === 0 && completedVisits.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-20 h-24 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50 flex flex-col items-center justify-center gap-2 mb-6">
                      <Calendar className="h-8 w-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-500 mb-1">Nenhuma visita agendada</h3>
                    <p className="text-gray-400 text-sm">As visitas aparecerão aqui quando forem agendadas</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Interviews Tab */}
          <TabsContent value="interviews" className="space-y-6">
            {interviewsLoading || feedbackLoading ? (
              <div className="text-center py-8"><ClassicLoader /></div>
            ) : (
              <>
                {/* Scheduled Interviews */}
                {scheduledInterviews.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Próximas Entrevistas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {scheduledInterviews.map((interview: any) => (
                        <div key={interview.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{interview.candidate?.full_name}</p>
                              <p className="text-sm text-gray-500">{interview.job?.title}</p>
                              {interview.interview_scheduled_at && (
                                <p className="text-sm text-gray-600">
                                  <Clock className="inline h-4 w-4 mr-1" />
                                  {format(new Date(interview.interview_scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Pending Feedback */}
                {pendingFeedback && pendingFeedback.length > 0 && (
                  <Card className="border-amber-200">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
                        <AlertCircle className="h-5 w-5" />
                        Feedback Pendente
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {pendingFeedback.map((interview: any) => (
                        <div key={interview.id} className="border rounded-lg p-4 bg-amber-50 flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900">{interview.candidate?.full_name}</h4>
                            <p className="text-sm text-gray-600">
                              {interview.job?.title}
                              {interview.interview_scheduled_at && ` - Entrevistado em ${format(new Date(interview.interview_scheduled_at), 'dd/MM/yyyy', { locale: ptBR })}`}
                            </p>
                          </div>
                          <Button onClick={() => handleOpenFeedback(interview)}>
                            Dar Feedback
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {scheduledInterviews.length === 0 && (!pendingFeedback || pendingFeedback.length === 0) && (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-20 h-24 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50 flex flex-col items-center justify-center gap-2 mb-6">
                      <Users className="h-8 w-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-500 mb-1">Nenhuma entrevista agendada</h3>
                    <p className="text-gray-400 text-sm">As entrevistas aparecerão aqui após a seleção de candidatos</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Feedback Modal */}
        <Dialog open={feedbackModalOpen} onOpenChange={setFeedbackModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Feedback da Entrevista</DialogTitle>
              <DialogDescription>
                {selectedInterview?.candidate?.full_name} - {selectedInterview?.job?.title}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <Label>O candidato compareceu?</Label>
                <RadioGroup
                  value={feedbackForm.attended}
                  onValueChange={(value) => setFeedbackForm(prev => ({ ...prev, attended: value }))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="attended-yes" />
                    <Label htmlFor="attended-yes">Sim</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="attended-no" />
                    <Label htmlFor="attended-no">Não compareceu</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label>Resultado:</Label>
                <RadioGroup
                  value={feedbackForm.decision}
                  onValueChange={(value) => setFeedbackForm(prev => ({ ...prev, decision: value }))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="hire" id="decision-hire" />
                    <Label htmlFor="decision-hire" className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Contratar
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="reject" id="decision-reject" />
                    <Label htmlFor="decision-reject" className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      Não contratar
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {feedbackForm.decision === 'reject' && (
                <div className="space-y-2">
                  <Label htmlFor="reason">Motivo:</Label>
                  <Select
                    value={feedbackForm.reason}
                    onValueChange={(value) => setFeedbackForm(prev => ({ ...prev, reason: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="experience">Falta de experiência</SelectItem>
                      <SelectItem value="profile">Perfil não adequado</SelectItem>
                      <SelectItem value="communication">Comunicação inadequada</SelectItem>
                      <SelectItem value="availability">Disponibilidade incompatível</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Observações:</Label>
                <Textarea
                  id="notes"
                  placeholder="Adicione observações sobre a entrevista..."
                  rows={3}
                  value={feedbackForm.notes}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFeedbackModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmitFeedback} disabled={submitFeedbackMutation.isPending}>
                {submitFeedbackMutation.isPending ? 'Enviando...' : 'Enviar Feedback'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
