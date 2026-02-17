import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import ClassicLoader from "@/components/ui/ClassicLoader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import {
  UserCheck,
  Users,
  Calendar,
  GraduationCap,
  Clock,
  FileText,
  Eye,
  Video,
  MapPin,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  ClipboardCheck,
  UserPlus,
  XCircle,
  Loader2
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { InterviewScheduleModal } from "@/components/InterviewScheduleModal";
import { HiringModal } from "@/components/HiringModal";

export default function CompanySelection() {
  const { user, loading: authLoading } = useAuth();
  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, string[]>>({});
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [selectedBatchCandidates, setSelectedBatchCandidates] = useState<string[]>([]);
  const [contractsModalOpen, setContractsModalOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  // Interview scheduling modal state
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [interviewBatchId, setInterviewBatchId] = useState<string | null>(null);
  const [interviewJobId, setInterviewJobId] = useState<string | null>(null);
  const [interviewCandidateIds, setInterviewCandidateIds] = useState<string[]>([]);

  // Attendance marking state
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [attendanceSessionId, setAttendanceSessionId] = useState<string | null>(null);
  const [attendanceParticipants, setAttendanceParticipants] = useState<any[]>([]);
  const [attendanceMarks, setAttendanceMarks] = useState<Record<string, boolean>>({});

  // Hiring modal state
  const [hiringModalOpen, setHiringModalOpen] = useState(false);
  const [hiringApplicationId, setHiringApplicationId] = useState<string | null>(null);
  const [hiringBatchId, setHiringBatchId] = useState<string | null>(null);

  // Track sessions where meeting was started (persisted in localStorage)
  const [startedSessions, setStartedSessions] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('startedInterviewSessions');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });

  // Save started sessions to localStorage
  useEffect(() => {
    localStorage.setItem('startedInterviewSessions', JSON.stringify(Array.from(startedSessions)));
  }, [startedSessions]);

  const markSessionStarted = (sessionId: string) => {
    setStartedSessions(prev => new Set([...Array.from(prev), sessionId]));
  };

  const utils = trpc.useUtils();

  // Existing presentations query
  const { data: presentations, isLoading } = trpc.company.getPresentedCandidates.useQuery(
    undefined,
    { enabled: !!user && user.role === 'company' }
  );

  // Batch query - get unlocked batches with candidates
  const { data: unlockedBatches, isLoading: unlockedLoading } = trpc.batch.getUnlockedBatches.useQuery(
    undefined,
    { enabled: !!user && user.role === 'company' }
  );

  const { data: batchContracts, isLoading: contractsLoading } = trpc.batch.getBatchContracts.useQuery(
    { batchId: selectedBatchId! },
    { enabled: !!selectedBatchId && contractsModalOpen }
  );

  const { data: candidateProfile, isLoading: profileLoading } = trpc.company.getCandidateProfile.useQuery(
    { candidateId: selectedCandidateId! },
    { enabled: !!selectedCandidateId && profileModalOpen }
  );

  // Company profile for address
  const { data: companyProfile } = trpc.company.getProfile.useQuery(undefined, {
    enabled: !!user && user.role === 'company'
  });

  const selectCandidatesMutation = trpc.company.selectCandidatesForInterview.useMutation({
    onSuccess: () => {
      toast.success('Seleção confirmada! Entraremos em contato para agendar as entrevistas.');
      utils.company.getPresentedCandidates.invalidate();
      setSelectedCandidates({});
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao confirmar seleção');
    },
  });

  const selectBatchCandidatesMutation = trpc.batch.selectCandidatesForInterview.useMutation({
    onSuccess: () => {
      toast.success('Candidatos selecionados com sucesso!');
      utils.batch.getUnlockedBatches.invalidate();
      setSelectedBatchCandidates([]);
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao selecionar candidatos');
    },
  });

  // Mark attendance mutation
  const markAttendanceMutation = trpc.interview.markAttendance.useMutation({
    onSuccess: (data) => {
      toast.success(`Presença marcada! ${data.attendedCount} candidato(s) compareceu(ram).`);
      utils.batch.getUnlockedBatches.invalidate();
      setAttendanceModalOpen(false);
      setAttendanceSessionId(null);
      setAttendanceParticipants([]);
      setAttendanceMarks({});
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao marcar presença');
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

  const handleToggleCandidate = (presentationId: string, candidateId: string) => {
    setSelectedCandidates(prev => {
      const current = prev[presentationId] || [];
      if (current.includes(candidateId)) {
        return { ...prev, [presentationId]: current.filter(id => id !== candidateId) };
      }
      return { ...prev, [presentationId]: [...current, candidateId] };
    });
  };

  const handleViewProfile = (candidateId: string) => {
    setSelectedCandidateId(candidateId);
    setProfileModalOpen(true);
  };

  const handleConfirmSelection = (presentationId: string) => {
    const candidateIds = selectedCandidates[presentationId] || [];
    if (candidateIds.length === 0) {
      toast.error('Selecione pelo menos um candidato');
      return;
    }

    selectCandidatesMutation.mutate({ presentationId, candidateIds });
  };

  // Filter presentations that need selection (have candidates but not all selected yet)
  const pendingPresentations = presentations?.filter((p: any) =>
    p.candidates.length > 0 && p.candidates.some((c: any) => !c.selected)
  ) || [];

  const completedPresentations = presentations?.filter((p: any) =>
    p.candidates.length > 0 && p.candidates.every((c: any) => c.selected)
  ) || [];

  // Mini card component for empty state - BIGGER size
  const MiniCard = ({ className = "" }: { className?: string }) => (
    <div className={`w-20 h-28 border border-gray-200 rounded-xl bg-white flex flex-col items-center pt-3 gap-1.5 shadow-sm ${className}`}>
      <div className="w-10 h-10 rounded-full bg-gray-200" />
      <div className="w-12 h-2 bg-gray-200 rounded" />
      <div className="w-14 h-2 bg-gray-100 rounded" />
    </div>
  );

  // Get current step from first job if exists (for progress display)
  const currentStep = 1; // Default to first step when no candidates

  // Check if there are any candidates to show
  const hasNoCandidates = (!presentations || presentations.length === 0) &&
                          (!unlockedBatches || unlockedBatches.length === 0);

  // Empty state when no candidates from any source
  if (!isLoading && !unlockedLoading && hasNoCandidates) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          {/* Header - Centered */}
          <div className="text-center py-4">
            <h1 className="text-3xl font-bold text-gray-900">Candidatos</h1>
            <p className="text-gray-500 mt-1">Selecione os candidatos que deseja entrevistar</p>
          </div>

          {/* Minimalist empty state */}
          <div className="flex flex-col items-center justify-center py-16">
            {/* Single profile card silhouette with subtle pulse */}
            <div className="relative mb-8">
              <style>{`
                @keyframes subtle-pulse {
                  0%, 100% { opacity: 0.6; transform: scale(1); }
                  50% { opacity: 0.8; transform: scale(1.02); }
                }
              `}</style>
              <div
                className="w-32 h-40 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50/50 flex flex-col items-center justify-center gap-3"
                style={{ animation: 'subtle-pulse 3s ease-in-out infinite' }}
              >
                {/* Avatar placeholder */}
                <div className="w-14 h-14 rounded-full border-2 border-dashed border-gray-300 bg-gray-100" />
                {/* Name placeholder */}
                <div className="w-16 h-2 bg-gray-200 rounded" />
                {/* Details placeholder */}
                <div className="w-20 h-2 bg-gray-100 rounded" />
              </div>
            </div>

            {/* Message */}
            <div className="text-center">
              <h3 className="text-xl font-medium text-gray-700 mb-2">
                Estamos procurando seu candidato
              </h3>
              <p className="text-gray-400 text-sm max-w-sm">
                Os candidatos aparecerão aqui após a visita de apresentação à sua empresa
              </p>
            </div>

            {/* Simple progress indicator */}
            <div className="mt-10 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-900 animate-pulse" />
              <span className="text-sm text-gray-500">Buscando candidatos...</span>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header - Centered like other pages */}
        <div className="text-center py-4">
          <h1 className="text-3xl font-bold text-gray-900">Candidatos</h1>
          <p className="text-gray-500 mt-1">Selecione os candidatos que deseja entrevistar</p>
        </div>

        {isLoading ? (
          <div className="text-center py-8"><ClassicLoader /></div>
        ) : (
          <>
            {/* BATCHES - Candidates sent by agency */}
            {unlockedBatches && unlockedBatches.length > 0 && (
              <div className="space-y-6">
                {unlockedBatches.map((batch: any) => {
                  const hasScheduledInterview = batch.status === "meeting_scheduled" && batch.interviewSession;
                  const session = batch.interviewSession;

                  return (
                    <Card key={batch.id} className={hasScheduledInterview ? "border-green-200" : ""}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-600" />
                            <CardTitle>{batch.job?.title}</CardTitle>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedBatchId(batch.id);
                                setContractsModalOpen(true);
                              }}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Ver Contratos
                            </Button>
                            {hasScheduledInterview ? (
                              <Badge className="bg-green-100 text-green-700">
                                <CalendarCheck className="h-3 w-3 mr-1" />
                                Entrevistas Agendadas
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-700">Pré-selecionados</Badge>
                            )}
                          </div>
                        </div>
                        <CardDescription>
                          {hasScheduledInterview
                            ? `${format(new Date(session.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })} · ${session.duration_minutes}min · ${session.interview_type === 'online' ? 'Online' : 'Presencial'}`
                            : `${batch.candidates?.length || 0} candidatos disponíveis para seleção`
                          }
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Interview Scheduled View */}
                        {hasScheduledInterview ? (
                          (() => {
                            const interviewDate = new Date(session.scheduled_at);
                            const now = new Date();
                            const isPast = interviewDate < now;
                            const isCompleted = session.status === 'completed';
                            const meetingStarted = startedSessions.has(session.id);
                            const showPostMeeting = isPast || meetingStarted;
                            const attendedParticipants = session.participants?.filter((p: any) => p.status === 'attended') || [];
                            const hasAttended = attendedParticipants.length > 0;

                            return (
                              <div className="space-y-4">
                                {/* Post-meeting prompt */}
                                {showPostMeeting && !isCompleted && (
                                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
                                    <ClipboardCheck className="h-5 w-5 text-amber-600 flex-shrink-0" />
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-amber-800">Reunião concluída?</p>
                                      <p className="text-xs text-amber-600">Marque a presença dos candidatos para continuar o processo</p>
                                    </div>
                                  </div>
                                )}

                                {/* Candidates list */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-wrap">
                                    {session.participants?.map((participant: any) => {
                                      const candidate = batch.candidates?.find((c: any) => c.id === participant.candidate_id);
                                      if (!candidate) return null;

                                      const statusIconMap: Record<string, React.ReactNode> = {
                                        'confirmed': <CheckCircle2 className="h-4 w-4 text-green-500" />,
                                        'attended': <CheckCircle2 className="h-4 w-4 text-blue-500" />,
                                        'no_show': <XCircle className="h-4 w-4 text-red-500" />,
                                        'reschedule_requested': <Clock3 className="h-4 w-4 text-amber-500" />,
                                        'pending': <Clock3 className="h-4 w-4 text-gray-400" />,
                                      };
                                      const statusIcon = statusIconMap[participant.status] || <Clock3 className="h-4 w-4 text-gray-400" />;

                                      return (
                                        <div key={participant.id} className={`flex items-center gap-2 rounded-full py-1.5 px-3 ${
                                          participant.status === 'attended' ? 'bg-blue-50' :
                                          participant.status === 'no_show' ? 'bg-red-50' : 'bg-gray-50'
                                        }`}>
                                          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                                            {candidate.full_name?.charAt(0)?.toUpperCase()}
                                          </div>
                                          <span className="text-sm font-medium">{candidate.full_name?.split(' ')[0]}</span>
                                          {statusIcon}
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Action buttons */}
                                  <div className="flex gap-2">
                                    {/* Meeting Link - show when online interview */}
                                    {!isCompleted && session.interview_type === 'online' && session.meeting_link && (
                                      <Button
                                        variant={showPostMeeting ? "outline" : "default"}
                                        size="sm"
                                        onClick={() => {
                                          markSessionStarted(session.id);
                                          window.open(session.meeting_link, '_blank');
                                        }}
                                      >
                                        <Video className="h-4 w-4 mr-2" />
                                        {showPostMeeting ? "Voltar à Reunião" : "Entrar na Reunião"}
                                      </Button>
                                    )}

                                    {/* Mark Attendance - show once meeting started or time passed */}
                                    {showPostMeeting && !isCompleted && (
                                      <Button
                                        size="sm"
                                        variant="default"
                                        className="bg-green-600 hover:bg-green-700"
                                        onClick={() => {
                                          setAttendanceSessionId(session.id);
                                          setAttendanceParticipants(session.participants || []);
                                          // Initialize all confirmed participants as attended by default
                                          const initialMarks: Record<string, boolean> = {};
                                          session.participants?.forEach((p: any) => {
                                            initialMarks[p.id] = p.status === 'confirmed';
                                          });
                                          setAttendanceMarks(initialMarks);
                                          setAttendanceModalOpen(true);
                                        }}
                                      >
                                        <ClipboardCheck className="h-4 w-4 mr-2" />
                                        Marcar Presença
                                      </Button>
                                    )}

                                    {/* In-person location */}
                                    {!isCompleted && session.interview_type === 'in_person' && (
                                      <span className="text-sm text-gray-500">
                                        <MapPin className="h-4 w-4 inline mr-1" />
                                        {session.location_city}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Post-interview: Show hire buttons for attended candidates */}
                                {isCompleted && hasAttended && (
                                  <div className="border-t pt-4">
                                    <p className="text-sm text-gray-600 mb-3">
                                      Candidatos que compareceram - selecione para contratar:
                                    </p>
                                    <div className="space-y-2">
                                      {attendedParticipants.map((participant: any) => {
                                        const candidate = batch.candidates?.find((c: any) => c.id === participant.candidate_id);
                                        if (!candidate) return null;

                                        return (
                                          <div key={participant.id} className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
                                            <div className="flex items-center gap-3">
                                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
                                                {candidate.full_name?.charAt(0)?.toUpperCase()}
                                              </div>
                                              <div>
                                                <p className="font-medium">{candidate.full_name}</p>
                                                <p className="text-sm text-gray-500">{candidate.email}</p>
                                              </div>
                                            </div>
                                            <Button
                                              size="sm"
                                              onClick={() => {
                                                // Find application for this candidate and job
                                                setHiringApplicationId(participant.application_id);
                                                setHiringBatchId(batch.id);
                                                setHiringModalOpen(true);
                                              }}
                                            >
                                              <UserPlus className="h-4 w-4 mr-2" />
                                              Contratar
                                            </Button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        ) : (
                          /* Selection View */
                          <>
                            {batch.candidates?.map((candidate: any) => (
                              <Card key={candidate.id} className="hover:border-gray-400">
                                <CardContent className="pt-6">
                                  <div className="flex items-start gap-4">
                                    <Checkbox
                                      checked={selectedBatchCandidates.includes(candidate.id)}
                                      onCheckedChange={() => {
                                        setSelectedBatchCandidates(prev =>
                                          prev.includes(candidate.id)
                                            ? prev.filter(id => id !== candidate.id)
                                            : [...prev, candidate.id]
                                        );
                                      }}
                                    />
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <div>
                                          <h4 className="font-semibold">{candidate.full_name}</h4>
                                          <p className="text-sm text-gray-500">{candidate.email}</p>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setSelectedCandidateId(candidate.id);
                                            setProfileModalOpen(true);
                                          }}
                                        >
                                          <Eye className="h-4 w-4 mr-2" />
                                          Ver Perfil
                                        </Button>
                                      </div>
                                      <div className="flex gap-2 mt-3">
                                        {candidate.available_for_internship && (
                                          <Badge variant="secondary">Estágio</Badge>
                                        )}
                                        {candidate.available_for_clt && (
                                          <Badge variant="secondary">CLT</Badge>
                                        )}
                                        {candidate.available_for_apprentice && (
                                          <Badge variant="secondary">Jovem Aprendiz</Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            <div className="flex justify-between items-center pt-4 border-t">
                              <div className="text-sm text-gray-600">
                                {selectedBatchCandidates.length} candidatos selecionados
                              </div>
                              <Button
                                onClick={() => {
                                  if (selectedBatchCandidates.length === 0) {
                                    toast.error('Selecione pelo menos um candidato');
                                    return;
                                  }
                                  // Open interview scheduling modal
                                  setInterviewBatchId(batch.id);
                                  setInterviewJobId(batch.job?.id);
                                  setInterviewCandidateIds(selectedBatchCandidates);
                                  setInterviewModalOpen(true);
                                }}
                                disabled={selectedBatchCandidates.length === 0}
                              >
                                <Calendar className="h-4 w-4 mr-2" />
                                Agendar Entrevistas
                              </Button>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Contracts Modal */}
            <Dialog open={contractsModalOpen} onOpenChange={setContractsModalOpen}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Modelos de Contrato</DialogTitle>
                  <DialogDescription>
                    Contratos disponíveis para os tipos de funcionários neste lote
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                  {contractsLoading ? (
                    <div className="flex justify-center py-8">
                      <ClassicLoader />
                    </div>
                  ) : batchContracts?.contracts && batchContracts.contracts.length > 0 ? (
                    <div className="space-y-4">
                      {batchContracts.contracts.map((contract: any) => (
                        <Card key={contract.id}>
                          <CardHeader>
                            <CardTitle className="text-lg">
                              {contract.employee_type === 'estagio' && 'Estágio'}
                              {contract.employee_type === 'clt' && 'CLT'}
                              {contract.employee_type === 'menor-aprendiz' && 'Jovem Aprendiz'}
                            </CardTitle>
                            <CardDescription>
                              Pagamento: {contract.payment_frequency === 'one_time' ? 'Único' : 'Recorrente'}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {contract.contract_pdf_url ? (
                              <a
                                href={contract.contract_pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                <FileText className="h-4 w-4 inline mr-2" />
                                Visualizar Contrato PDF
                              </a>
                            ) : contract.contract_html ? (
                              <div
                                className="prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: contract.contract_html }}
                              />
                            ) : (
                              <p className="text-gray-500">Nenhum contrato disponível</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">
                      Nenhum contrato configurado
                    </p>
                  )}
                </ScrollArea>
              </DialogContent>
            </Dialog>

            {/* Pending Selections */}
            {pendingPresentations.map((presentation: any) => (
              <Card key={presentation.presentationId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{presentation.jobTitle}</CardTitle>
                      <CardDescription>
                        Apresentados em {presentation.completedAt && format(new Date(presentation.completedAt), 'dd/MM/yyyy', { locale: ptBR })}
                      </CardDescription>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700">
                      <Clock className="h-3 w-3 mr-1" />
                      Aguardando seleção
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Selecione os candidatos que deseja entrevistar:
                  </p>
                  <div className="space-y-3">
                    {presentation.candidates.map((candidate: any) => {
                      const isSelected = (selectedCandidates[presentation.presentationId] || []).includes(candidate.id);
                      return (
                        <div
                          key={candidate.id}
                          className={`border rounded-lg p-4 transition-colors ${
                            isSelected ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleCandidate(presentation.presentationId, candidate.id)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-semibold text-gray-900">{candidate.name}</h4>
                                  <p className="text-sm text-gray-600">
                                    {candidate.age && `${candidate.age} anos`} {candidate.city && `• ${candidate.city}`}
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewProfile(candidate.id)}
                                >
                                  Ver Perfil
                                </Button>
                              </div>
                              {candidate.education && (
                                <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                                  <GraduationCap className="h-4 w-4" />
                                  {candidate.education}
                                </p>
                              )}
                              {candidate.skills && candidate.skills.length > 0 && (
                                <div className="flex gap-2 mt-2 flex-wrap">
                                  {candidate.skills.slice(0, 5).map((skill: string, idx: number) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 pt-4 border-t flex items-center justify-between">
                    <span className="text-gray-600">
                      {(selectedCandidates[presentation.presentationId] || []).length} candidato{(selectedCandidates[presentation.presentationId] || []).length !== 1 ? 's' : ''} selecionado{(selectedCandidates[presentation.presentationId] || []).length !== 1 ? 's' : ''}
                    </span>
                    <Button
                      onClick={() => handleConfirmSelection(presentation.presentationId)}
                      disabled={(selectedCandidates[presentation.presentationId] || []).length === 0 || selectCandidatesMutation.isPending}
                    >
                      {selectCandidatesMutation.isPending ? 'Confirmando...' : 'Confirmar Seleção e Agendar Entrevistas'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Completed Selections */}
            {completedPresentations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-gray-600">Seleções Concluídas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {completedPresentations.map((presentation: any) => (
                    <div key={presentation.presentationId} className="border rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">{presentation.jobTitle}</h4>
                      <p className="text-sm text-gray-500">
                        {presentation.candidates.filter((c: any) => c.selected).length} candidatos selecionados para entrevista
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Profile Modal */}
        <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
          <DialogContent className="sm:max-w-[650px]">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-xl">{candidateProfile?.name || 'Perfil do Candidato'}</DialogTitle>
              <DialogDescription className="text-base">
                {candidateProfile?.age && `${candidateProfile.age} anos`} {candidateProfile?.city && `• ${candidateProfile.city}${candidateProfile?.state ? `, ${candidateProfile.state}` : ''}`}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              {profileLoading ? (
                <div className="py-8 text-center"><ClassicLoader /></div>
              ) : candidateProfile ? (
                <div className="space-y-4">
                  {/* Quick Info Bar - Availability */}
                  <div className="flex gap-2 flex-wrap pb-3 border-b">
                    {candidateProfile.available_for_internship && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Estágio</Badge>
                    )}
                    {candidateProfile.available_for_clt && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">CLT</Badge>
                    )}
                    {candidateProfile.available_for_apprentice && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Jovem Aprendiz</Badge>
                    )}
                    {candidateProfile.preferred_work_type && (
                      <Badge variant="outline" className="text-gray-600">
                        {candidateProfile.preferred_work_type === 'presencial' && '📍 Presencial'}
                        {candidateProfile.preferred_work_type === 'remoto' && '🏠 Remoto'}
                        {candidateProfile.preferred_work_type === 'hibrido' && '🔄 Híbrido'}
                      </Badge>
                    )}
                  </div>

                  {/* Two Column Layout for Education & Skills */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Education */}
                    {candidateProfile.education && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <h4 className="font-medium text-gray-700 mb-1 flex items-center gap-2 text-sm">
                          <GraduationCap className="h-4 w-4" />
                          Formação
                        </h4>
                        <p className="text-gray-800 font-medium">
                          {candidateProfile.education === 'fundamental' && 'Ensino Fundamental'}
                          {candidateProfile.education === 'medio' && 'Ensino Médio'}
                          {candidateProfile.education === 'superior' && 'Ensino Superior'}
                          {candidateProfile.education === 'pos-graduacao' && 'Pós-Graduação'}
                          {candidateProfile.education === 'mestrado' && 'Mestrado'}
                          {candidateProfile.education === 'doutorado' && 'Doutorado'}
                          {candidateProfile.currently_studying && ' (Cursando)'}
                        </p>
                        {candidateProfile.institution && (
                          <p className="text-gray-500 text-xs mt-1">
                            {candidateProfile.institution}
                            {candidateProfile.course && ` • ${candidateProfile.course}`}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Languages */}
                    {candidateProfile.languages && candidateProfile.languages.length > 0 && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <h4 className="font-medium text-gray-700 mb-2 text-sm">🌐 Idiomas</h4>
                        <div className="flex gap-1.5 flex-wrap">
                          {candidateProfile.languages.map((lang: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">{lang}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Skills */}
                  {candidateProfile.skills && candidateProfile.skills.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2 text-sm">Habilidades</h4>
                      <div className="flex gap-1.5 flex-wrap">
                        {candidateProfile.skills.map((skill: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs bg-white">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Experience */}
                  {candidateProfile.has_work_experience && candidateProfile.experience && candidateProfile.experience.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2 text-sm">💼 Experiência</h4>
                      <div className="space-y-2">
                        {candidateProfile.experience.slice(0, 3).map((exp: any, idx: number) => (
                          <div key={idx} className="text-sm text-gray-600 bg-gray-50 p-2 rounded border-l-2 border-gray-300">
                            {typeof exp === 'string' ? exp : (
                              <>
                                <p className="font-medium text-gray-800">{exp.cargo || exp.position || exp.title}</p>
                                {(exp.empresa || exp.company) && <p className="text-gray-500 text-xs">{exp.empresa || exp.company}</p>}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Divider before summary */}
                  {candidateProfile.summary && <div className="border-t pt-3" />}

                  {/* AI Summary - At Bottom, Collapsible Style */}
                  {candidateProfile.summary && (
                    <details className="group">
                      <summary className="cursor-pointer list-none">
                        <div className="flex items-center justify-between bg-slate-100 p-3 rounded-lg hover:bg-slate-200 transition-colors">
                          <span className="font-medium text-slate-700 text-sm">📋 Resumo Completo do Candidato</span>
                          <span className="text-slate-500 text-xs group-open:hidden">Clique para expandir</span>
                          <span className="text-slate-500 text-xs hidden group-open:inline">Clique para recolher</span>
                        </div>
                      </summary>
                      <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-slate-600 text-sm whitespace-pre-line leading-relaxed">{candidateProfile.summary}</p>
                      </div>
                    </details>
                  )}
                </div>
              ) : (
                <p className="py-8 text-center text-gray-500">Perfil não encontrado</p>
              )}
            </ScrollArea>
            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setProfileModalOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Interview Scheduling Modal */}
        {interviewBatchId && interviewJobId && (
          <InterviewScheduleModal
            open={interviewModalOpen}
            onClose={() => {
              setInterviewModalOpen(false);
              setInterviewBatchId(null);
              setInterviewJobId(null);
              setInterviewCandidateIds([]);
            }}
            batchId={interviewBatchId}
            jobId={interviewJobId}
            candidateIds={interviewCandidateIds}
            companyAddress={companyProfile ? {
              address: companyProfile.address,
              city: companyProfile.city,
              state: companyProfile.state,
            } : undefined}
            onSuccess={() => {
              utils.batch.getUnlockedBatches.invalidate();
              setSelectedBatchCandidates([]);
            }}
          />
        )}

        {/* Attendance Marking Modal */}
        <Dialog open={attendanceModalOpen} onOpenChange={setAttendanceModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Marcar Presença</DialogTitle>
              <DialogDescription>
                Selecione os candidatos que compareceram à entrevista
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              {attendanceParticipants.map((participant: any) => {
                // Find candidate from any batch
                const batch = unlockedBatches?.find((b: any) =>
                  b.interviewSession?.id === attendanceSessionId
                );
                const candidate = batch?.candidates?.find((c: any) => c.id === participant.candidate_id);

                return (
                  <div
                    key={participant.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      attendanceMarks[participant.id] ? 'border-green-300 bg-green-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                        {candidate?.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-medium">{candidate?.full_name || 'Candidato'}</p>
                        <p className="text-sm text-gray-500">
                          {participant.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={attendanceMarks[participant.id] ? "default" : "outline"}
                        onClick={() => setAttendanceMarks(prev => ({ ...prev, [participant.id]: true }))}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={attendanceMarks[participant.id] === false ? "destructive" : "outline"}
                        onClick={() => setAttendanceMarks(prev => ({ ...prev, [participant.id]: false }))}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAttendanceModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!attendanceSessionId) return;
                  const attendees = Object.entries(attendanceMarks).map(([participantId, attended]) => ({
                    participantId,
                    attended,
                  }));
                  markAttendanceMutation.mutate({
                    sessionId: attendanceSessionId,
                    attendees,
                  });
                }}
                disabled={markAttendanceMutation.isPending || Object.keys(attendanceMarks).length === 0}
              >
                {markAttendanceMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Confirmar Presença
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Hiring Modal */}
        {hiringModalOpen && hiringApplicationId && (
          <HiringModal
            open={hiringModalOpen}
            onClose={() => {
              setHiringModalOpen(false);
              setHiringApplicationId(null);
              setHiringBatchId(null);
            }}
            applicationId={hiringApplicationId}
            batchId={hiringBatchId || undefined}
            onSuccess={() => {
              utils.batch.getUnlockedBatches.invalidate();
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
