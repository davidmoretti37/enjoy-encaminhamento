import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users,
  Mail,
  Calendar,
  X,
  ChevronDown,
  Phone,
  MapPin,
  GraduationCap,
  Briefcase,
  Star,
  Globe,
  FileText,
  Brain,
  Heart,
  Target,
  Clock,
  Loader2,
  Video,
  CheckCircle,
  Link2,
  User,
  AlertCircle,
  Building2,
  XCircle,
  UserCheck,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { AgencyScheduleModal } from "@/components/AgencyScheduleModal";

interface CandidateGroupManagementProps {
  jobId: string;
  companyInterviewCandidateIds?: Set<string>;
  onScheduleCompanyInterview?: (candidateIds: string[], candidateNames: string[]) => void;
  onBatchSent?: () => void;
}

// Helper to build a map of candidateId → session info from batch sessions
function buildCandidateSessionMap(sessions: any[]) {
  const map = new Map<string, {
    sessionId: string;
    interviewType: "online" | "in_person";
    sessionFormat: "group" | "individual";
    scheduledAt: string;
    meetingLink: string | null;
    locationAddress: string | null;
    participantCount: number;
    participantStatus: "pending" | "confirmed" | "attended" | "no_show" | "declined";
  }>();

  for (const session of sessions) {
    if (!session.participants) continue;
    for (const participant of session.participants) {
      map.set(participant.candidate_id, {
        sessionId: session.id,
        interviewType: session.interview_type,
        sessionFormat: session.session_format || "group",
        scheduledAt: session.scheduled_at,
        meetingLink: session.meeting_link,
        locationAddress: session.location_address,
        participantCount: session.participants.length,
        participantStatus: participant.status || "pending",
      });
    }
  }

  return map;
}

export default function CandidateGroupManagement({ jobId, companyInterviewCandidateIds, onScheduleCompanyInterview, onBatchSent }: CandidateGroupManagementProps) {
  const [expandedCandidates, setExpandedCandidates] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [meetingLinkInput, setMeetingLinkInput] = useState("");

  // Query batches for this job
  const { data: batches, isLoading, refetch } = trpc.batch.getBatchesByJobId.useQuery({ jobId });

  // Get the most recent batch
  const currentBatch = batches?.find((b: any) => b.status === 'draft') ||
                       batches?.find((b: any) => b.status === 'sent') ||
                       batches?.find((b: any) => b.status === 'meeting_scheduled') ||
                       batches?.find((b: any) => b.status === 'active') ||
                       batches?.[0];

  // Query batch sessions for per-candidate meeting assignments
  const { data: batchSessions, refetch: refetchSessions } = trpc.batch.getBatchSessions.useQuery(
    { batchId: currentBatch?.id! },
    { enabled: !!currentBatch?.id }
  );

  // Build candidate → session map (pre-selection only)
  const candidateSessionMap = useMemo(
    () => buildCandidateSessionMap(batchSessions || []),
    [batchSessions]
  );

  // Mutation to update candidate status (approve/reject)
  const updateStatusMutation = trpc.batch.updateCandidateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status do candidato atualizado!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar status");
    },
  });

  // Mutation to remove candidate from batch
  const removeCandidateMutation = trpc.batch.removeCandidateFromBatch.useMutation({
    onSuccess: () => {
      toast.success("Candidato removido do grupo.");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao remover candidato");
    },
  });

  // Mutation to mark session attendance (conclude meeting)
  const markAttendanceMutation = trpc.batch.markSessionAttendance.useMutation({
    onSuccess: () => {
      toast.success("Reuniao concluida! Candidatos movidos para pre-selecao concluida.");
      refetchSessions();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao concluir reuniao");
    },
  });

  // Mutation to update session meeting link
  const updateSessionLinkMutation = trpc.batch.updateSessionMeetingLink.useMutation({
    onSuccess: () => {
      toast.success("Link da reunião atualizado!");
      setMeetingLinkInput("");
      setEditingLinkSessionId(null);
      refetchSessions();
    },
    onError: () => {
      toast.error("Erro ao atualizar link.");
    },
  });

  const [editingLinkSessionId, setEditingLinkSessionId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!batches || batches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center mb-6 shadow-sm">
          <Users className="w-10 h-10 text-slate-400" />
        </div>
        <h3 className="text-xl font-semibold text-[#0A2342] mb-2">
          Nenhum grupo criado
        </h3>
        <p className="text-slate-600 max-w-sm">
          Selecione candidatos acima e clique em "Adicionar ao Grupo" para comecar
        </p>
      </div>
    );
  }

  if (!currentBatch) {
    return null;
  }

  const candidateCount = currentBatch.candidates?.length || 0;

  if (candidateCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center mb-6 shadow-sm">
          <Users className="w-10 h-10 text-slate-400" />
        </div>
        <h3 className="text-xl font-semibold text-[#0A2342] mb-2">
          Grupo vazio
        </h3>
        <p className="text-slate-600 max-w-sm">
          Este grupo nao possui candidatos
        </p>
      </div>
    );
  }

  const isAlreadySent = currentBatch.status === 'sent' || currentBatch.status === 'unlocked' || currentBatch.status === 'meeting_scheduled' || currentBatch.status === 'interview_scheduled' || currentBatch.status === 'completed';
  const isForwarded = currentBatch.status === 'unlocked';

  // Expand/collapse candidate details
  const toggleCandidate = (candidateId: string) => {
    setExpandedCandidates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(candidateId)) {
        newSet.delete(candidateId);
      } else {
        newSet.add(candidateId);
      }
      return newSet;
    });
  };

  // Checkbox selection
  const toggleSelection = (candidateId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else {
        next.add(candidateId);
      }
      return next;
    });
  };

  const selectAll = () => {
    const allIds = currentBatch.candidates
      .map((bc: any) => bc.candidate?.id)
      .filter(Boolean);
    setSelectedIds(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleScheduleInterviews = () => {
    if (selectedIds.size === 0) {
      toast.error("Selecione ao menos um candidato para agendar");
      return;
    }
    setIsScheduleModalOpen(true);
  };

  const handleScheduleCompanyInterview = () => {
    if (selectedIds.size === 0) {
      toast.error("Selecione ao menos um candidato para agendar entrevista com empresa");
      return;
    }
    if (onScheduleCompanyInterview) {
      const names = currentBatch.candidates
        .filter((bc: any) => selectedIds.has(bc.candidate?.id))
        .map((bc: any) => bc.candidate?.full_name || "Candidato")
        .filter(Boolean);
      onScheduleCompanyInterview(Array.from(selectedIds), names);
      setSelectedIds(new Set());
    }
  };

  const handleRemoveCandidate = (candidateId: string) => {
    if (!currentBatch?.id) return;
    if (!confirm("Tem certeza que deseja remover este candidato do grupo?")) return;
    removeCandidateMutation.mutate({ batchId: currentBatch.id, candidateId });
  };

  // Get selected candidate names for modal
  const selectedCandidateNames = currentBatch.candidates
    .filter((bc: any) => selectedIds.has(bc.candidate?.id))
    .map((bc: any) => bc.candidate?.full_name || "Candidato")
    .filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-[#0A2342]">Candidatos Selecionados</h3>
          <p className="text-slate-600 text-sm mt-1">
            {candidateCount} candidato{candidateCount !== 1 ? 's' : ''} no grupo
          </p>
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center gap-2">
          {isForwarded && (
            <Badge variant="outline" className="border-green-300 text-green-600">
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              Enviado a empresa
            </Badge>
          )}
        </div>
      </div>

      {/* Pre-selection session cards (Step 3 only) */}
      {batchSessions && batchSessions.length > 0 && (
        <div className="space-y-2">
          {(batchSessions || []).map((session: any) => {
            const participants = session.participants || [];
            const isOnline = session.interview_type === "online";
            const isIndividual = session.session_format === "individual";

            return (
              <div
                key={session.id}
                className={`rounded-xl border p-4 ${
                  isOnline
                    ? "bg-blue-50/50 border-blue-200"
                    : "bg-orange-50/50 border-orange-200"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isOnline ? "bg-blue-100" : "bg-orange-100"
                    }`}>
                      {isOnline ? (
                        <Video className="w-4 h-4 text-blue-600" />
                      ) : (
                        <MapPin className="w-4 h-4 text-orange-600" />
                      )}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isOnline ? "text-blue-900" : "text-orange-900"}`}>
                        {isOnline ? "Online" : "Presencial"} — {isIndividual ? "Individual" : "Grupo"}
                      </p>
                      <p className={`text-xs ${isOnline ? "text-blue-600" : "text-orange-600"}`}>
                        {new Date(session.scheduled_at).toLocaleDateString("pt-BR", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.meeting_link ? (
                      <button
                        onClick={() => window.open(session.meeting_link, '_blank')}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                          isOnline
                            ? "border-blue-300 text-blue-700 hover:bg-blue-100"
                            : "border-orange-300 text-orange-700 hover:bg-orange-100"
                        }`}
                      >
                        <Link2 className="w-3 h-3" />
                        Link
                      </button>
                    ) : isOnline && session.status !== "completed" ? (
                      <button
                        onClick={() => {
                          setEditingLinkSessionId(session.id);
                          setMeetingLinkInput("");
                        }}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors border border-dashed border-blue-300 text-blue-600 hover:bg-blue-50"
                      >
                        <Link2 className="w-3 h-3" />
                        Adicionar link
                      </button>
                    ) : null}
                    {session.status !== "completed" ? (
                      <button
                        onClick={() => {
                          markAttendanceMutation.mutate({
                            sessionId: session.id,
                            attendance: participants.map((p: any) => ({
                              participantId: p.id,
                              status: "attended" as const,
                            })),
                          });
                        }}
                        disabled={markAttendanceMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                      >
                        {markAttendanceMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle className="w-3 h-3" />
                        )}
                        Concluir Reuniao
                      </button>
                    ) : (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                        <CheckCircle className="w-3 h-3" />
                        Concluida
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {participants.map((p: any) => (
                    <span
                      key={p.candidate_id}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                        isOnline
                          ? "bg-blue-100 text-blue-800"
                          : "bg-orange-100 text-orange-800"
                      }`}
                    >
                      <User className="w-3 h-3" />
                      {p.candidate?.full_name || "Candidato"}
                    </span>
                  ))}
                </div>
                {editingLinkSessionId === session.id && (
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      value={meetingLinkInput}
                      onChange={(e) => setMeetingLinkInput(e.target.value)}
                      placeholder="https://meet.google.com/... ou zoom.us/..."
                      className="h-8 text-sm flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && meetingLinkInput.trim()) {
                          updateSessionLinkMutation.mutate({
                            sessionId: session.id,
                            meetingLink: meetingLinkInput.trim(),
                          });
                        }
                        if (e.key === "Escape") {
                          setEditingLinkSessionId(null);
                          setMeetingLinkInput("");
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      className="h-8 px-3 text-xs"
                      disabled={!meetingLinkInput.trim() || updateSessionLinkMutation.isPending}
                      onClick={() => {
                        updateSessionLinkMutation.mutate({
                          sessionId: session.id,
                          meetingLink: meetingLinkInput.trim(),
                        });
                      }}
                    >
                      {updateSessionLinkMutation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        "Salvar"
                      )}
                    </Button>
                    <button
                      onClick={() => {
                        setEditingLinkSessionId(null);
                        setMeetingLinkInput("");
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Split candidates into sections based on status (pre-selection only) */}
      {(() => {
        // Categorize candidates — exclude those already in company interviews
        const pendingPreSelection: any[] = [];
        const completedPreSelection: any[] = [];

        for (const batchCandidate of currentBatch.candidates) {
          const candidate = batchCandidate.candidate;
          if (!candidate) continue;

          // Skip candidates already scheduled for company interview (they show in Step 4)
          if (companyInterviewCandidateIds?.has(candidate.id)) continue;

          const sessionInfo = candidateSessionMap.get(candidate.id);

          if (!sessionInfo || sessionInfo.participantStatus === "pending" || sessionInfo.participantStatus === "confirmed") {
            pendingPreSelection.push(batchCandidate);
          } else {
            // attended, no_show, declined
            completedPreSelection.push(batchCandidate);
          }
        }

        // Determine which section the selected candidates belong to
        const selectedInPending = Array.from(selectedIds).some(id =>
          pendingPreSelection.some((bc: any) => bc.candidate?.id === id)
        );
        const selectedInCompleted = Array.from(selectedIds).some(id =>
          completedPreSelection.some((bc: any) => bc.candidate?.id === id)
        );

        const renderCandidateRow = (batchCandidate: any, sectionType: "pending" | "completed") => {
          const candidate = batchCandidate.candidate;
          if (!candidate) return null;

          const isExpanded = expandedCandidates.has(candidate.id);
          const isSelected = selectedIds.has(candidate.id);
          const sessionInfo = candidateSessionMap.get(candidate.id);
          const isDimmed = sectionType === "completed" && sessionInfo &&
            (sessionInfo.participantStatus === "no_show" || sessionInfo.participantStatus === "declined");

          return (
            <div
              key={candidate.id}
              className={`bg-white rounded-lg border-2 transition-all ${
                isDimmed ? 'opacity-50' : ''
              } ${
                isSelected ? 'border-[#FF6B35]' : 'border-slate-200 hover:border-orange-300'
              }`}
            >
              {/* Compact Header */}
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {/* Checkbox */}
                  <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelection(candidate.id)}
                      className="h-4 w-4"
                      disabled={!!isDimmed}
                    />
                  </div>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-[#0A2342] flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-medium text-sm">
                      {candidate.full_name?.charAt(0)?.toUpperCase() || 'C'}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-[#0A2342] truncate">
                      {candidate.full_name}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {candidate.education_level && (
                        <span className="text-xs text-slate-600">{candidate.education_level}</span>
                      )}
                      {batchCandidate.match_score && (
                        <Badge className="bg-orange-500 text-white text-xs">
                          {Math.round(batchCandidate.match_score)}% match
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0">
                    {sectionType === "completed" && sessionInfo ? (
                      // Show pass/fail buttons or status for completed section
                      batchCandidate.status === "approved" ? (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                          <UserCheck className="w-3 h-3" />
                          Aprovado
                        </div>
                      ) : batchCandidate.status === "rejected" ? (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600 border border-red-200">
                          <XCircle className="w-3 h-3" />
                          Reprovado
                        </div>
                      ) : sessionInfo.participantStatus === "attended" ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ batchId: currentBatch.id, candidateId: candidate.id, status: "approved" }); }}
                            disabled={updateStatusMutation.isPending}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                          >
                            <UserCheck className="w-3 h-3" />
                            Aprovar
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ batchId: currentBatch.id, candidateId: candidate.id, status: "rejected" }); }}
                            disabled={updateStatusMutation.isPending}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                          >
                            <XCircle className="w-3 h-3" />
                            Reprovar
                          </button>
                        </div>
                      ) : sessionInfo.participantStatus === "no_show" ? (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">
                          <XCircle className="w-3 h-3" />
                          Nao compareceu
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-300">
                          <Ban className="w-3 h-3" />
                          Recusou
                        </div>
                      )
                    ) : sessionInfo ? (
                      // Show meeting type badge for pending section
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        sessionInfo.interviewType === "online"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-orange-50 text-orange-700 border border-orange-200"
                      }`}>
                        {sessionInfo.interviewType === "online" ? (
                          <Video className="w-3 h-3" />
                        ) : (
                          <MapPin className="w-3 h-3" />
                        )}
                        Reuniao agendada
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-400 border border-dashed border-slate-300">
                        <AlertCircle className="w-3 h-3" />
                        Sem reuniao
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCandidate(candidate.id)}
                    className="text-slate-600 hover:text-[#0A2342]"
                  >
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </Button>
                  {!isAlreadySent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCandidate(candidate.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-3 border-t border-slate-100 space-y-4">
                  {/* Meeting details for this candidate */}
                  {sessionInfo && (
                    <div className={`rounded-lg p-3 text-sm ${
                      sessionInfo.interviewType === "online"
                        ? "bg-blue-50 border border-blue-200"
                        : "bg-orange-50 border border-orange-200"
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="font-medium">
                          {new Date(sessionInfo.scheduledAt).toLocaleDateString("pt-BR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-xs opacity-75">
                        {sessionInfo.interviewType === "online" ? "Online" : "Presencial"}
                        {" - "}
                        {sessionInfo.sessionFormat === "group"
                          ? `Grupo (${sessionInfo.participantCount} candidatos)`
                          : "Individual"
                        }
                      </p>
                      {sessionInfo.locationAddress && (
                        <p className="text-xs mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {sessionInfo.locationAddress}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Contact Info */}
                  <div>
                    <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Contato</h5>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                      {candidate.email && (
                        <div className="flex items-start gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-slate-500 text-xs">Email</span>
                            <p className="text-[#0A2342] truncate">{candidate.email}</p>
                          </div>
                        </div>
                      )}
                      {candidate.phone && (
                        <div className="flex items-start gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-slate-500 text-xs">Telefone</span>
                            <p className="text-[#0A2342]">{candidate.phone}</p>
                          </div>
                        </div>
                      )}
                      {(candidate.city || candidate.state) && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-slate-500 text-xs">Localidade</span>
                            <p className="text-[#0A2342]">
                              {[candidate.city, candidate.state].filter(Boolean).join(', ')}
                            </p>
                          </div>
                        </div>
                      )}
                      {candidate.address && (
                        <div className="flex items-start gap-2 col-span-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-slate-500 text-xs">Endereco</span>
                            <p className="text-[#0A2342]">{candidate.address}{candidate.zip_code ? ` - CEP: ${candidate.zip_code}` : ''}</p>
                          </div>
                        </div>
                      )}
                      {candidate.date_of_birth && (
                        <div className="flex items-start gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-slate-500 text-xs">Data de Nascimento</span>
                            <p className="text-[#0A2342]">{new Date(candidate.date_of_birth).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                      )}
                      {candidate.cpf && (
                        <div className="flex items-start gap-2">
                          <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-slate-500 text-xs">CPF</span>
                            <p className="text-[#0A2342]">{candidate.cpf}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Education */}
                  {(candidate.education_level || candidate.institution || candidate.course) && (
                    <div>
                      <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Formacao</h5>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                        {candidate.education_level && (
                          <div className="flex items-start gap-2">
                            <GraduationCap className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                            <div>
                              <span className="text-slate-500 text-xs">Nivel</span>
                              <p className="text-[#0A2342] capitalize">{candidate.education_level}</p>
                            </div>
                          </div>
                        )}
                        {candidate.institution && (
                          <div className="flex items-start gap-2">
                            <GraduationCap className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                            <div>
                              <span className="text-slate-500 text-xs">Instituicao</span>
                              <p className="text-[#0A2342]">{candidate.institution}</p>
                            </div>
                          </div>
                        )}
                        {candidate.course && (
                          <div className="flex items-start gap-2">
                            <GraduationCap className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                            <div>
                              <span className="text-slate-500 text-xs">Curso</span>
                              <p className="text-[#0A2342]">{candidate.course}</p>
                            </div>
                          </div>
                        )}
                        {candidate.currently_studying !== null && candidate.currently_studying !== undefined && (
                          <div className="flex items-start gap-2">
                            <Clock className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                            <div>
                              <span className="text-slate-500 text-xs">Estudando</span>
                              <p className="text-[#0A2342]">{candidate.currently_studying ? 'Sim' : 'Nao'}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  {candidate.skills && Array.isArray(candidate.skills) && candidate.skills.length > 0 && (
                    <div>
                      <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Habilidades</h5>
                      <div className="flex flex-wrap gap-1.5">
                        {(candidate.skills as string[]).map((skill: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 text-xs bg-orange-50 text-orange-700 rounded-full border border-orange-100">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Languages */}
                  {candidate.languages && Array.isArray(candidate.languages) && candidate.languages.length > 0 && (
                    <div>
                      <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Idiomas</h5>
                      <div className="flex flex-wrap gap-1.5">
                        {(candidate.languages as any[]).map((lang: any, i: number) => (
                          <span key={i} className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                            {typeof lang === 'string' ? lang : lang.language || lang.name}{lang.level ? ` - ${lang.level}` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Experience */}
                  {candidate.experience && Array.isArray(candidate.experience) && candidate.experience.length > 0 && (
                    <div>
                      <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Experiencia</h5>
                      <div className="space-y-2">
                        {(candidate.experience as any[]).map((exp: any, i: number) => (
                          <div key={i} className="bg-slate-50 rounded-lg p-2.5 text-sm">
                            <p className="font-medium text-[#0A2342]">{exp.title || exp.role || exp.position || 'Cargo'}</p>
                            {(exp.company || exp.employer) && <p className="text-slate-600 text-xs">{exp.company || exp.employer}</p>}
                            {(exp.period || exp.duration || exp.start_date) && (
                              <p className="text-slate-400 text-xs mt-0.5">{exp.period || exp.duration || `${exp.start_date}${exp.end_date ? ` - ${exp.end_date}` : ''}`}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Availability */}
                  <div>
                    <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Disponibilidade</h5>
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.available_for_internship && (
                        <span className="px-2 py-0.5 text-xs bg-green-50 text-green-700 rounded-full border border-green-100">Estagio</span>
                      )}
                      {candidate.available_for_clt && (
                        <span className="px-2 py-0.5 text-xs bg-green-50 text-green-700 rounded-full border border-green-100">CLT</span>
                      )}
                      {candidate.available_for_apprentice && (
                        <span className="px-2 py-0.5 text-xs bg-green-50 text-green-700 rounded-full border border-green-100">Jovem Aprendiz</span>
                      )}
                      {candidate.preferred_work_type && (
                        <span className="px-2 py-0.5 text-xs bg-purple-50 text-purple-700 rounded-full border border-purple-100 capitalize">
                          {candidate.preferred_work_type === 'presencial' ? 'Presencial' :
                           candidate.preferred_work_type === 'remoto' ? 'Remoto' : 'Hibrido'}
                        </span>
                      )}
                      {!candidate.available_for_internship && !candidate.available_for_clt && !candidate.available_for_apprentice && (
                        <span className="text-xs text-slate-400">Nao informado</span>
                      )}
                    </div>
                  </div>

                  {/* DISC Profile */}
                  {(candidate.disc_dominante != null || candidate.disc_influente != null || candidate.disc_estavel != null || candidate.disc_conforme != null) && (
                    <div>
                      <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Perfil DISC</h5>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: 'D', value: candidate.disc_dominante, name: 'Dominante', color: 'bg-red-500' },
                          { label: 'I', value: candidate.disc_influente, name: 'Influente', color: 'bg-yellow-500' },
                          { label: 'S', value: candidate.disc_estavel, name: 'Estavel', color: 'bg-green-500' },
                          { label: 'C', value: candidate.disc_conforme, name: 'Conforme', color: 'bg-blue-500' },
                        ].map((disc) => (
                          <div key={disc.label} className="text-center">
                            <div className="text-xs text-slate-500 mb-1">{disc.name}</div>
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div className={`h-full ${disc.color} rounded-full`} style={{ width: `${Math.min(disc.value || 0, 100)}%` }} />
                            </div>
                            <div className="text-xs font-semibold text-[#0A2342] mt-0.5">{disc.value != null ? Math.round(disc.value) : '-'}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Summary */}
                  {candidate.summary && (
                    <div>
                      <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Resumo IA</h5>
                      <p className="text-sm text-slate-700 bg-orange-50 rounded-lg p-3 border border-orange-100">{candidate.summary}</p>
                    </div>
                  )}

                  {/* Resume link */}
                  {candidate.resume_url && (
                    <div>
                      <a
                        href={candidate.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium"
                      >
                        <FileText className="w-4 h-4" />
                        Ver curriculo completo
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        };

        return (
          <>
            {/* Section A: Em Pre-selecao */}
            {pendingPreSelection.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <h4 className="text-sm font-semibold text-[#0A2342]">
                    Em Pre-selecao
                  </h4>
                  <span className="text-xs text-slate-500">
                    ({pendingPreSelection.length} candidato{pendingPreSelection.length !== 1 ? "s" : ""})
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Candidatos aguardando reuniao de pre-selecao ou com reuniao agendada
                </p>
                {pendingPreSelection.map((bc: any) => renderCandidateRow(bc, "pending"))}
              </div>
            )}

            {/* Section B: Pre-selecao Concluida */}
            {completedPreSelection.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1 mt-6">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <h4 className="text-sm font-semibold text-[#0A2342]">
                    Pre-selecao Concluida
                  </h4>
                  <span className="text-xs text-slate-500">
                    ({completedPreSelection.length} candidato{completedPreSelection.length !== 1 ? "s" : ""})
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Selecione os aprovados para agendar entrevista com a empresa ou encaminhar
                </p>
                {completedPreSelection.map((bc: any) => renderCandidateRow(bc, "completed"))}
              </div>
            )}

            {/* Floating Selection Bar — context-aware */}
            {selectedIds.size > 0 && (
              <div className="sticky bottom-4 mt-4 z-10">
                <div className="bg-gray-900 text-white rounded-lg shadow-lg px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-medium">
                      {selectedIds.size} candidato{selectedIds.size !== 1 ? 's' : ''} selecionado{selectedIds.size !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-300 hover:text-white hover:bg-gray-800"
                      onClick={clearSelection}
                    >
                      Limpar
                    </Button>

                    {/* Pending section actions: schedule pre-selection */}
                    {selectedInPending && !selectedInCompleted && (
                      <Button
                        size="sm"
                        onClick={handleScheduleInterviews}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                      >
                        <Calendar className="w-4 h-4 mr-1.5" />
                        Agendar Pre-selecao
                      </Button>
                    )}

                    {/* Completed section actions: schedule company interview */}
                    {selectedInCompleted && !selectedInPending && (
                      <Button
                        size="sm"
                        onClick={handleScheduleCompanyInterview}
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        <Building2 className="w-4 h-4 mr-1.5" />
                        Entrevista Empresa
                      </Button>
                    )}

                    {/* Mixed selection — show warning */}
                    {selectedInPending && selectedInCompleted && (
                      <span className="text-xs text-amber-400">
                        Selecione candidatos de apenas uma secao
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Pre-selection Schedule Modal */}
      {currentBatch && (
        <AgencyScheduleModal
          open={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          batchId={currentBatch.id}
          candidateIds={Array.from(selectedIds)}
          candidateNames={selectedCandidateNames}
          onSuccess={() => {
            refetch();
            refetchSessions();
            setSelectedIds(new Set());
          }}
        />
      )}

    </div>
  );
}
