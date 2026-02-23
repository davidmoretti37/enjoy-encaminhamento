// @ts-nocheck
import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import ContentTransition from "@/components/ui/ContentTransition";
import { PageHeaderSkeleton, ListSkeleton } from "@/components/ui/skeletons";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Building2,
  MapPin,
  ChevronRight,
  PartyPopper,
  Video,
  CalendarCheck,
  AlertCircle,
  Loader2
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

// Application status configuration
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; step: number }> = {
  'applied': { label: 'Candidatura Enviada', color: 'bg-blue-100 text-blue-800', icon: FileText, step: 1 },
  'screening': { label: 'Pré-selecionado', color: 'bg-yellow-100 text-yellow-800', icon: Clock, step: 2 },
  'interview-scheduled': { label: 'Entrevista Agendada', color: 'bg-purple-100 text-purple-800', icon: Calendar, step: 3 },
  'interviewed': { label: 'Entrevista Realizada', color: 'bg-indigo-100 text-indigo-800', icon: CheckCircle, step: 3 },
  'selected': { label: 'Contratado', color: 'bg-green-100 text-green-800', icon: PartyPopper, step: 4 },
  'rejected': { label: 'Não Selecionado', color: 'bg-red-100 text-red-800', icon: XCircle, step: 4 },
};

const TIMELINE_STEPS = [
  { step: 1, label: 'Candidatura' },
  { step: 2, label: 'Pré-seleção' },
  { step: 3, label: 'Entrevista' },
  { step: 4, label: 'Resultado' },
];

export default function CandidateApplications() {
  const { user, loading: authLoading } = useAuth();
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'finished'>('all');
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [rescheduleParticipantId, setRescheduleParticipantId] = useState<string | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Track sessions where meeting was started (persisted in localStorage)
  const [startedSessions, setStartedSessions] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('startedCandidateInterviews');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });

  // Save started sessions to localStorage
  useEffect(() => {
    localStorage.setItem('startedCandidateInterviews', JSON.stringify([...startedSessions]));
  }, [startedSessions]);

  const markSessionStarted = (sessionId: string) => {
    setStartedSessions(prev => new Set([...prev, sessionId]));
  };

  const utils = trpc.useUtils();

  // Fetch candidate applications
  const applicationsQuery = trpc.application.getByCandidate.useQuery(undefined, {
    enabled: !!user,
  });

  // Fetch candidate interviews
  const interviewsQuery = trpc.interview.getMyInterviews.useQuery(undefined, {
    enabled: !!user,
  });

  // Confirm interview mutation
  const confirmInterviewMutation = trpc.interview.confirmAttendance.useMutation({
    onSuccess: () => {
      toast.success('Presença confirmada!');
      utils.interview.getMyInterviews.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao confirmar presença');
    },
  });

  // Request reschedule mutation
  const rescheduleInterviewMutation = trpc.interview.requestReschedule.useMutation({
    onSuccess: () => {
      toast.success('Solicitação de reagendamento enviada');
      setRescheduleDialogOpen(false);
      setRescheduleParticipantId(null);
      setRescheduleReason('');
      utils.interview.getMyInterviews.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao solicitar reagendamento');
    },
  });

  const isLoading = applicationsQuery.isLoading;
  const applications = applicationsQuery.data || [];
  const interviews = interviewsQuery.data || [];

  // Filter pending interviews (status = pending)
  const pendingInterviews = interviews.filter((i: any) => i.status === 'pending');
  const confirmedInterviews = interviews.filter((i: any) => i.status === 'confirmed');

  // Filter applications
  const filteredApplications = applications.filter((app: any) => {
    if (filter === 'all') return true;
    if (filter === 'active') return !['selected', 'rejected'].includes(app.status);
    if (filter === 'finished') return ['selected', 'rejected'].includes(app.status);
    return true;
  });

  const handleViewDetails = (app: any) => {
    setSelectedApplication(app);
    setShowDetailDialog(true);
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: FileText, step: 1 };
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd 'de' MMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  if (!authLoading && (!user || user.role !== 'candidate')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Esta página é exclusiva para candidatos.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <ContentTransition isLoading={isLoading} skeleton={<><PageHeaderSkeleton /><ListSkeleton count={5} /></>}>
      <div className="space-y-6">
        {/* Header - Centered */}
        <div className="text-center py-4">
          <h1 className="text-3xl font-bold text-gray-900">Minhas Candidaturas</h1>
          <p className="text-gray-500 mt-1">Acompanhe o status de suas candidaturas</p>
        </div>

        {/* Pending Interviews Section */}
        {pendingInterviews.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-lg">Entrevistas Pendentes</CardTitle>
              </div>
              <CardDescription>
                Confirme sua presença nas entrevistas agendadas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingInterviews.map((interview: any) => {
                const session = interview.session;
                const isOnline = session?.interview_type === 'online';

                return (
                  <div key={interview.id} className="bg-white rounded-lg p-4 border border-amber-200">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold">{session?.job?.title || 'Vaga'}</h4>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {session?.scheduled_at && format(new Date(session.scheduled_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {session?.duration_minutes || 30} min
                          </span>
                          <Badge variant={isOnline ? "secondary" : "outline"} className="flex items-center gap-1">
                            {isOnline ? <Video className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                            {isOnline ? 'Online' : 'Presencial'}
                          </Badge>
                        </div>

                        {/* Location/Link info */}
                        {isOnline && session?.meeting_link && (
                          <a
                            href={session.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Video className="h-4 w-4" />
                            Acessar reunião
                          </a>
                        )}
                        {!isOnline && session?.location_address && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {session.location_address}, {session.location_city} - {session.location_state}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRescheduleParticipantId(interview.id);
                            setRescheduleDialogOpen(true);
                          }}
                        >
                          Solicitar Reagendamento
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => confirmInterviewMutation.mutate({ participantId: interview.id })}
                          disabled={confirmInterviewMutation.isPending}
                        >
                          {confirmInterviewMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CalendarCheck className="h-4 w-4 mr-2" />
                              Confirmar Presença
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Confirmed Interviews Section */}
        {confirmedInterviews.length > 0 && (() => {
          // Separate past/started and upcoming interviews
          const now = new Date();
          const upcomingInterviews = confirmedInterviews.filter((i: any) => {
            const isPast = new Date(i.session?.scheduled_at) <= now;
            const wasStarted = startedSessions.has(i.session?.id);
            return !isPast && !wasStarted;
          });
          const waitingInterviews = confirmedInterviews.filter((i: any) => {
            const isPast = new Date(i.session?.scheduled_at) <= now;
            const wasStarted = startedSessions.has(i.session?.id);
            return isPast || wasStarted;
          });

          return (
            <>
              {/* Upcoming Interviews - Green */}
              {upcomingInterviews.length > 0 && (
                <Card className="border-green-200 bg-green-50/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="h-5 w-5 text-green-600" />
                      <CardTitle className="text-lg">Entrevistas Confirmadas</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {upcomingInterviews.map((interview: any) => {
                      const session = interview.session;
                      const isOnline = session?.interview_type === 'online';

                      return (
                        <div key={interview.id} className="bg-white rounded-lg p-4 border border-green-200">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div className="space-y-1">
                              <h4 className="font-semibold">{session?.job?.title || 'Vaga'}</h4>
                              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {session?.scheduled_at && format(new Date(session.scheduled_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                                </span>
                                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                  Confirmado
                                </Badge>
                              </div>
                            </div>
                            {isOnline && session?.meeting_link && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  markSessionStarted(session.id);
                                  window.open(session.meeting_link, '_blank');
                                }}
                              >
                                <Video className="h-4 w-4 mr-2" />
                                Acessar Reunião
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Waiting for Result - after meeting started or time passed */}
              {waitingInterviews.length > 0 && (
                <Card className="border-amber-200 bg-amber-50/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-amber-600" />
                      <CardTitle className="text-lg">Aguardando Resultado</CardTitle>
                    </div>
                    <p className="text-sm text-amber-600">A empresa está avaliando os candidatos</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {waitingInterviews.map((interview: any) => {
                      const session = interview.session;

                      return (
                        <div key={interview.id} className="bg-white rounded-lg p-4 border border-amber-200">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div className="space-y-1">
                              <h4 className="font-semibold">{session?.job?.title || 'Vaga'}</h4>
                              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  Entrevista realizada em {session?.scheduled_at && format(new Date(session.scheduled_at), "dd 'de' MMMM", { locale: ptBR })}
                                </span>
                                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Aguardando
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </>
          );
        })()}

        {/* Filter Tabs */}
        <div className="flex justify-center">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="all">
                Todas ({applications.length})
              </TabsTrigger>
              <TabsTrigger value="active">
                Em Andamento ({applications.filter((a: any) => !['selected', 'rejected'].includes(a.status)).length})
              </TabsTrigger>
              <TabsTrigger value="finished">
                Finalizadas ({applications.filter((a: any) => ['selected', 'rejected'].includes(a.status)).length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Applications List */}
        {filteredApplications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-24 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50 flex flex-col items-center justify-center gap-2 mb-6">
              <FileText className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-500 mb-1">
              {filter === 'all' ? 'Nenhuma candidatura ainda' :
               filter === 'active' ? 'Nenhuma candidatura em andamento' :
               'Nenhuma candidatura finalizada'}
            </h3>
            <p className="text-gray-400 text-sm">
              {filter === 'all' ? 'Explore as vagas disponíveis e candidate-se!' :
               'Suas candidaturas aparecerão aqui'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((app: any) => {
              const statusConfig = getStatusConfig(app.status);
              const StatusIcon = statusConfig.icon;
              const isHired = app.status === 'selected';

              return (
                <Card
                  key={app.id}
                  className={`hover:shadow-md transition-shadow cursor-pointer ${
                    isHired ? 'border-green-200 bg-green-50/50' : ''
                  }`}
                  onClick={() => handleViewDetails(app)}
                >
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Job Info */}
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                            isHired ? 'bg-green-100' : 'bg-slate-100'
                          }`}>
                            <StatusIcon className={`h-5 w-5 ${isHired ? 'text-green-600' : 'text-slate-600'}`} />
                          </div>
                          <div>
                            <h3 className="font-semibold">{app.jobs?.title || 'Vaga'}</h3>
                            <div className="flex flex-wrap gap-2 mt-1 text-sm text-muted-foreground">
                              {/* Only show company name if hired */}
                              {isHired && app.jobs?.companies?.name && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-4 w-4" />
                                  {app.jobs.companies.name}
                                </span>
                              )}
                              {app.jobs?.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {app.jobs.location}
                                </span>
                              )}
                              {app.jobs?.contract_type && (
                                <Badge variant="outline" className="text-xs">
                                  {app.jobs.contract_type === 'clt' ? 'CLT' :
                                   app.jobs.contract_type === 'estagio' ? 'Estágio' :
                                   app.jobs.contract_type === 'menor-aprendiz' ? 'Menor Aprendiz' :
                                   app.jobs.contract_type}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Timeline Progress */}
                      <div className="hidden md:flex items-center gap-1 px-4">
                        {TIMELINE_STEPS.map((step, i) => {
                          const isCompleted = statusConfig.step > step.step;
                          const isCurrent = statusConfig.step === step.step;
                          const isRejected = app.status === 'rejected' && step.step === 4;

                          return (
                            <div key={step.step} className="flex items-center">
                              <div
                                className={`h-3 w-3 rounded-full ${
                                  isRejected ? 'bg-red-500' :
                                  isCompleted || isCurrent ? 'bg-green-500' : 'bg-gray-200'
                                }`}
                                title={step.label}
                              />
                              {i < TIMELINE_STEPS.length - 1 && (
                                <div className={`w-8 h-0.5 ${
                                  isCompleted ? 'bg-green-500' : 'bg-gray-200'
                                }`} />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center gap-2">
                        <Badge className={statusConfig.color}>
                          {statusConfig.label}
                        </Badge>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>

                    {/* Mobile Timeline */}
                    <div className="md:hidden mt-4 flex items-center gap-1">
                      {TIMELINE_STEPS.map((step, i) => {
                        const isCompleted = statusConfig.step > step.step;
                        const isCurrent = statusConfig.step === step.step;
                        const isRejected = app.status === 'rejected' && step.step === 4;

                        return (
                          <div key={step.step} className="flex items-center flex-1">
                            <div className="flex flex-col items-center flex-1">
                              <div
                                className={`h-3 w-3 rounded-full ${
                                  isRejected ? 'bg-red-500' :
                                  isCompleted || isCurrent ? 'bg-green-500' : 'bg-gray-200'
                                }`}
                              />
                              <span className="text-xs text-muted-foreground mt-1">{step.label}</span>
                            </div>
                            {i < TIMELINE_STEPS.length - 1 && (
                              <div className={`flex-1 h-0.5 -mt-4 ${
                                isCompleted ? 'bg-green-500' : 'bg-gray-200'
                              }`} />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Applied Date */}
                    <p className="text-xs text-muted-foreground mt-4">
                      Candidatura enviada em {formatDate(app.created_at)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-lg">
            {selectedApplication && (() => {
              const statusConfig = getStatusConfig(selectedApplication.status);
              const StatusIcon = statusConfig.icon;
              const isHired = selectedApplication.status === 'selected';

              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <StatusIcon className="h-5 w-5" />
                      {selectedApplication.jobs?.title || 'Vaga'}
                    </DialogTitle>
                    <DialogDescription>
                      Detalhes da sua candidatura
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6 py-4">
                    {/* Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status atual</span>
                      <Badge className={statusConfig.color}>
                        {statusConfig.label}
                      </Badge>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-3">
                      <span className="text-sm font-medium">Linha do tempo</span>
                      <div className="space-y-2">
                        {TIMELINE_STEPS.map((step) => {
                          const isCompleted = statusConfig.step > step.step;
                          const isCurrent = statusConfig.step === step.step;
                          const isRejected = selectedApplication.status === 'rejected' && step.step === 4;

                          return (
                            <div key={step.step} className="flex items-center gap-3">
                              <div
                                className={`h-4 w-4 rounded-full flex items-center justify-center ${
                                  isRejected ? 'bg-red-500' :
                                  isCompleted || isCurrent ? 'bg-green-500' : 'bg-gray-200'
                                }`}
                              >
                                {(isCompleted || isCurrent) && !isRejected && (
                                  <CheckCircle className="h-3 w-3 text-white" />
                                )}
                                {isRejected && (
                                  <XCircle className="h-3 w-3 text-white" />
                                )}
                              </div>
                              <span className={`text-sm ${
                                isCurrent ? 'font-medium' :
                                isCompleted ? 'text-muted-foreground' : 'text-muted-foreground/50'
                              }`}>
                                {step.label}
                                {isCurrent && ' (atual)'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Job Details */}
                    <div className="space-y-2 border-t pt-4">
                      <span className="text-sm font-medium">Detalhes da vaga</span>
                      <div className="space-y-2 text-sm">
                        {/* Only show company if hired */}
                        {isHired && selectedApplication.jobs?.companies?.name && (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedApplication.jobs.companies.name}</span>
                          </div>
                        )}
                        {selectedApplication.jobs?.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedApplication.jobs.location}</span>
                          </div>
                        )}
                        {selectedApplication.jobs?.contract_type && (
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {selectedApplication.jobs.contract_type === 'clt' ? 'CLT' :
                               selectedApplication.jobs.contract_type === 'estagio' ? 'Estágio' :
                               selectedApplication.jobs.contract_type === 'menor-aprendiz' ? 'Menor Aprendiz' :
                               selectedApplication.jobs.contract_type}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Interview Details (if scheduled) */}
                    {selectedApplication.status === 'interview-scheduled' && selectedApplication.interview_date && (
                      <div className="space-y-2 border-t pt-4">
                        <span className="text-sm font-medium">Entrevista Agendada</span>
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <div className="flex items-center gap-2 text-purple-900">
                            <Calendar className="h-5 w-5" />
                            <span className="font-medium">
                              {formatDate(selectedApplication.interview_date)}
                            </span>
                          </div>
                          {selectedApplication.interview_notes && (
                            <p className="text-sm text-purple-700 mt-2">
                              {selectedApplication.interview_notes}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Hired Message */}
                    {isHired && (
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 text-green-900">
                          <PartyPopper className="h-5 w-5" />
                          <span className="font-medium">Parabéns! Você foi contratado!</span>
                        </div>
                        <p className="text-sm text-green-700 mt-2">
                          Em breve você receberá mais informações sobre os próximos passos.
                        </p>
                      </div>
                    )}

                    {/* Rejected Message */}
                    {selectedApplication.status === 'rejected' && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          Infelizmente você não foi selecionado para esta vaga.
                          Continue se candidatando a outras oportunidades!
                        </p>
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                      Fechar
                    </Button>
                  </DialogFooter>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Reschedule Request Dialog */}
        <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Reagendamento</DialogTitle>
              <DialogDescription>
                Explique o motivo pelo qual você não pode comparecer na data agendada.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="Ex: Tenho um compromisso inadiável neste horário. Estou disponível na parte da tarde ou em outro dia desta semana."
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Mínimo de 10 caracteres
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setRescheduleDialogOpen(false);
                  setRescheduleReason('');
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (rescheduleParticipantId) {
                    rescheduleInterviewMutation.mutate({
                      participantId: rescheduleParticipantId,
                      reason: rescheduleReason,
                    });
                  }
                }}
                disabled={rescheduleReason.length < 10 || rescheduleInterviewMutation.isPending}
              >
                {rescheduleInterviewMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Enviar Solicitação'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </ContentTransition>
    </DashboardLayout>
  );
}
