import { useState, useEffect } from "react";
import { useCompanyFunnel } from "@/contexts/CompanyFunnelContext";
import {
  Video,
  MapPin,
  Calendar,
  Clock,
  Users,
  ExternalLink,
  Search,
  Loader2,
  Briefcase,
  CheckSquare,
  CheckCircle2,
  UserPlus,
} from "lucide-react";
import { CardEntrance } from "@/components/funnel";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  CandidateCardMini,
  CandidateCardModal,
} from "@/components/candidate-card/CandidateCard";

export default function StepEntrevista() {
  const { selectedJob, selectedJobId, batches, interviews, refreshData } =
    useCompanyFunnel();

  // Check if there are unlocked batches with candidates for this job
  const jobBatches = batches.filter(
    (b: any) => b.job?.id === selectedJobId && b.candidates?.length > 0
  );

  const hasReceivedCandidates = jobBatches.length > 0;

  if (!selectedJob) {
    return (
      <EmptyState
        title="Nenhuma vaga selecionada"
        description="Selecione uma vaga para ver as entrevistas"
      />
    );
  }

  if (hasReceivedCandidates) {
    return (
      <ReceivedState
        selectedJob={selectedJob}
        selectedJobId={selectedJobId!}
        jobBatches={jobBatches}
        interviews={interviews}
        refreshData={refreshData}
      />
    );
  }

  // Waiting state — agency is searching
  return (
    <CardEntrance>
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <div className="relative mx-auto w-20 h-20 mb-6">
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded-2xl bg-[#FF6B35]/10"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Search className="w-10 h-10 text-[#FF6B35]" />
          </div>
        </div>

        <h3 className="text-xl font-semibold text-[#0A2342] mb-2">
          Estamos buscando os candidatos perfeitos para você!
        </h3>
        <p className="text-slate-500 max-w-md mx-auto mb-2">
          Nossa agência está realizando a pré-seleção e agendando as entrevistas com
          os melhores candidatos para a vaga{" "}
          <span className="font-medium text-[#0A2342]">{selectedJob.title}</span>.
        </p>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Quando tudo estiver pronto, você receberá os perfis completos dos
          candidatos e os horários das entrevistas.
        </p>
      </div>
    </CardEntrance>
  );
}

// ─── Received State ─────────────────────────────────────────────────────────

function ReceivedState({
  selectedJob,
  selectedJobId,
  jobBatches,
  interviews,
  refreshData,
}: {
  selectedJob: any;
  selectedJobId: string;
  jobBatches: any[];
  interviews: any[];
  refreshData: () => void;
}) {
  const utils = trpc.useUtils();
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [hiringCandidateId, setHiringCandidateId] = useState<string | null>(null);
  const [selectedForHiring, setSelectedForHiring] = useState<Set<string>>(new Set());
  const [completedInterviews, setCompletedInterviews] = useState<Set<string>>(new Set());

  const toggleSelection = (candidateId: string) => {
    setSelectedForHiring((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) next.delete(candidateId);
      else next.add(candidateId);
      return next;
    });
  };

  // Initialize completedInterviews from already-completed sessions
  useEffect(() => {
    const alreadyCompleted = interviews
      .filter((i: any) => i.status === "completed")
      .map((i: any) => i.id);
    if (alreadyCompleted.length > 0) {
      setCompletedInterviews((prev) => {
        const next = new Set(prev);
        alreadyCompleted.forEach((id: string) => next.add(id));
        return next;
      });
    }
  }, [interviews]);

  // Get company interview sessions for the selected job
  const jobInterviews = interviews.filter(
    (i: any) =>
      i.job?.id === selectedJobId && i.status !== "cancelled"
  );

  // Only show candidates that have a scheduled company interview
  const interviewCandidateIds = new Set(
    jobInterviews.flatMap((iv: any) =>
      (iv.participants || []).map((p: any) => p.candidate?.id || p.candidate_id)
    ).filter(Boolean)
  );

  const allCandidates = jobBatches.flatMap((batch: any) =>
    (batch.candidates || [])
      .filter((c: any) => {
        const id = c.candidate?.id || c.candidate_id || c.id;
        return interviewCandidateIds.has(id);
      })
      .map((c: any) => ({
        ...c,
        batchId: batch.id,
      }))
  );

  // Find the batchId for the selected candidate
  const selectedCandidateBatchId = selectedCandidateId
    ? allCandidates.find(
        (c: any) => {
          const id = c.candidate?.id || c.candidate_id || c.id;
          return id === selectedCandidateId;
        }
      )?.batchId
    : null;

  // Fetch full candidate card when one is selected
  const { data: candidateCard, isLoading: isCardLoading } =
    trpc.batch.getCandidateCard.useQuery(
      { candidateId: selectedCandidateId!, batchId: selectedCandidateBatchId! },
      { enabled: !!selectedCandidateId && !!selectedCandidateBatchId }
    );

  // PDF download
  const pdfMutation = trpc.batch.generateCandidateCardPdf.useMutation({
    onSuccess: (data) => {
      const byteString = atob(data.base64);
      const bytes = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) {
        bytes[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao gerar PDF");
    },
  });

  const handleDownloadPdf = () => {
    if (selectedCandidateId && selectedCandidateBatchId) {
      pdfMutation.mutate({
        candidateId: selectedCandidateId,
        batchId: selectedCandidateBatchId,
      });
    }
  };

  const initiateHiringMutation = trpc.hiring.initiateHiring.useMutation({
    onSuccess: async () => {
      toast.success("Contratação iniciada!");
      await Promise.all([
        utils.hiring.getCompanyHiringProcesses.invalidate(),
        utils.company.getJobs.invalidate(),
        utils.interview.getCompanyInterviews.invalidate(),
        utils.batch.getUnlockedBatches.invalidate(),
      ]);
      refreshData();
      setHiringCandidateId(null);
      setSelectedCandidateId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao iniciar contratação");
      setHiringCandidateId(null);
    },
  });

  const markAttendanceMutation = trpc.interview.markAttendance.useMutation({
    onSuccess: (data) => {
      toast.success("Entrevista marcada como realizada!");
      setCompletedInterviews((prev) => new Set([...prev, markingSessionId!]));
      setMarkingSessionId(null);
      utils.interview.getCompanyInterviews.invalidate();
      utils.batch.getUnlockedBatches.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao marcar entrevista");
      setMarkingSessionId(null);
    },
  });

  const [markingSessionId, setMarkingSessionId] = useState<string | null>(null);

  const handleMarkCompleted = (interview: any) => {
    if (completedInterviews.has(interview.id) || interview.status === "completed") return;
    setMarkingSessionId(interview.id);
    // Mark all participants as attended
    const attendees = (interview.participants || []).map((p: any) => ({
      participantId: p.id,
      attended: true,
    }));
    markAttendanceMutation.mutate({
      sessionId: interview.id,
      attendees,
    });
  };

  const handleHire = (applicationId: string | null, batchId?: string, candidateId?: string) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7);

    if (applicationId) {
      setHiringCandidateId(applicationId);
      initiateHiringMutation.mutate({
        applicationId,
        batchId: batchId || undefined,
        startDate: startDate.toISOString().split("T")[0],
      });
    } else if (candidateId && selectedJobId) {
      setHiringCandidateId(candidateId);
      initiateHiringMutation.mutate({
        candidateId,
        jobId: selectedJobId,
        batchId: batchId || undefined,
        startDate: startDate.toISOString().split("T")[0],
      });
    } else {
      toast.error("Candidato sem candidatura vinculada");
    }
  };

  // Build candidate profiles for the card components
  const candidateProfiles = allCandidates.map((c: any) => {
    const candidate = c.candidate || c;
    // Find interview for this candidate
    const interview = jobInterviews.find((iv: any) =>
      iv.participants?.some(
        (p: any) => p.candidate?.id === (candidate.id || c.candidate_id)
      )
    );

    return {
      candidateData: c,
      profile: {
        id: candidate.id || c.candidate_id,
        name: candidate.full_name || "Candidato",
        city: candidate.city,
        state: candidate.state,
        education: candidate.education_level,
        disc_dominante: candidate.disc_dominante,
        disc_influente: candidate.disc_influente,
        disc_estavel: candidate.disc_estavel,
        disc_conforme: candidate.disc_conforme,
        pdp_top_10_competencies: candidate.pdp_top_10_competencies,
        photo_url: candidate.photo_url,
      },
      interview: interview
        ? {
            id: interview.id,
            interview_type: interview.interview_type,
            scheduled_at: interview.scheduled_at,
            duration_minutes: interview.duration_minutes || 60,
            meeting_link: interview.meeting_link,
            location_address: interview.location_address,
            location_city: interview.location_city,
            location_state: interview.location_state,
          }
        : null,
      matchScore: c.match_score || c.composite_score,
      batchId: c.batchId,
      applicationId: c.application_id
        || interview?.participants?.find(
            (p: any) => (p.candidate?.id || p.candidate_id) === (candidate.id || c.candidate_id)
          )?.application_id
        || c.candidate?.application_id,
    };
  });

  // Build full profile for modal from getCandidateCard response
  const modalProfile = candidateCard
    ? {
        id: candidateCard.profile.id,
        name: candidateCard.profile.full_name || candidateCard.profile.name || "Candidato",
        city: candidateCard.profile.city,
        state: candidateCard.profile.state,
        age: candidateCard.profile.age,
        education: candidateCard.profile.education_level || candidateCard.profile.education,
        institution: candidateCard.profile.institution,
        course: candidateCard.profile.course,
        currently_studying: candidateCard.profile.currently_studying,
        skills: candidateCard.profile.skills,
        languages: candidateCard.profile.languages,
        has_work_experience: candidateCard.profile.has_work_experience,
        experience: candidateCard.profile.experience,
        summary: candidateCard.profile.summary || candidateCard.profile.profile_summary,
        profile_summary: candidateCard.profile.profile_summary || candidateCard.profile.summary,
        available_for_internship: candidateCard.profile.available_for_internship,
        available_for_clt: candidateCard.profile.available_for_clt,
        available_for_apprentice: candidateCard.profile.available_for_apprentice,
        preferred_work_type: candidateCard.profile.preferred_work_type,
        disc_dominante: candidateCard.profile.disc_dominante,
        disc_influente: candidateCard.profile.disc_influente,
        disc_estavel: candidateCard.profile.disc_estavel,
        disc_conforme: candidateCard.profile.disc_conforme,
        pdp_competencies: candidateCard.profile.pdp_competencies,
        pdp_top_10_competencies: candidateCard.profile.pdp_top_10_competencies,
        pdp_develop_competencies: candidateCard.profile.pdp_develop_competencies,
        pdp_skills: candidateCard.profile.pdp_skills,
        pdp_action_plans: candidateCard.profile.pdp_action_plans,
        photo_url: candidateCard.profile.photo_url,
        resume_url: candidateCard.profile.resume_url,
      }
    : null;

  const modalInterview = candidateCard?.interview
    ? {
        id: candidateCard.interview.id,
        interview_type: candidateCard.interview.interview_type,
        scheduled_at: candidateCard.interview.scheduled_at,
        duration_minutes: candidateCard.interview.duration_minutes || 60,
        meeting_link: candidateCard.interview.meeting_link,
        location_address: candidateCard.interview.location_address,
        location_city: candidateCard.interview.location_city,
        location_state: candidateCard.interview.location_state,
      }
    : null;

  const selectedCandidate = candidateProfiles.find(
    (c) => c.profile.id === selectedCandidateId
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <CardEntrance>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#FF6B35]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#0A2342]">
                Candidatos & Entrevistas
              </h2>
              <p className="text-slate-500 text-sm">
                <span className="text-[#0A2342] font-medium">
                  {candidateProfiles.length}
                </span>{" "}
                candidato{candidateProfiles.length !== 1 ? "s" : ""} selecionado
                {candidateProfiles.length !== 1 ? "s" : ""} para{" "}
                <span className="font-medium text-[#0A2342]">
                  {selectedJob.title}
                </span>
              </p>
            </div>
          </div>
        </div>
      </CardEntrance>

      {/* Candidate list */}
      <div className="space-y-2">
        {candidateProfiles.map((item, index) => (
          <CardEntrance key={item.profile.id} delay={index * 0.05}>
            <CandidateCardMini
              profile={item.profile}
              interview={item.interview}
              matchScore={item.matchScore}
              selected={selectedForHiring.has(item.profile.id)}
              onSelect={() => toggleSelection(item.profile.id)}
              onClick={() => setSelectedCandidateId(item.profile.id)}
            />
          </CardEntrance>
        ))}
      </div>

      {/* Hire selected candidates */}
      {selectedForHiring.size > 0 && (
        <CardEntrance>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckSquare className="w-4 h-4 text-[#0A2342]" />
              <span>
                <span className="font-semibold text-[#0A2342]">{selectedForHiring.size}</span> candidato{selectedForHiring.size !== 1 ? "s" : ""} selecionado{selectedForHiring.size !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedForHiring(new Set())}
                className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5"
              >
                Limpar
              </button>
              <button
                onClick={() => {
                  const candidates = candidateProfiles.filter((c) => selectedForHiring.has(c.profile.id));
                  if (candidates.length === 0) {
                    toast.error("Selecione ao menos um candidato");
                    return;
                  }
                  candidates.forEach((c) => handleHire(c.applicationId || null, c.batchId, c.profile.id));
                  setSelectedForHiring(new Set());
                }}
                disabled={initiateHiringMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0A2342] text-white text-sm font-medium hover:bg-[#1B4D7A] transition-colors disabled:opacity-50"
              >
                {initiateHiringMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Briefcase className="w-4 h-4" />
                )}
                Contratar Selecionados
              </button>
            </div>
          </div>
        </CardEntrance>
      )}

      {/* Interviews section (existing interview cards for scheduled interviews) */}
      {jobInterviews.length > 0 && (
        <CardEntrance delay={0.1}>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2 uppercase tracking-wide">
              <Calendar className="w-4 h-4" />
              Entrevistas Agendadas
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-xs font-medium">
                {jobInterviews.length}
              </span>
            </h3>
            <div className="space-y-3">
              {jobInterviews.map((interview: any) => {
                const scheduledAt = interview.scheduled_at
                  ? new Date(interview.scheduled_at)
                  : null;
                const isOnline = interview.interview_type === "online";

                return (
                  <div
                    key={interview.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-50"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isOnline ? "bg-[#0A2342]/10" : "bg-slate-200"
                      }`}
                    >
                      {isOnline ? (
                        <Video className="w-4 h-4 text-[#0A2342]" />
                      ) : (
                        <MapPin className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0A2342]">
                        {isOnline ? "Online" : "Presencial"}
                        {interview.participants?.length > 0 && (
                          <span className="text-slate-400 font-normal">
                            {" · "}
                            {interview.participants
                              .map((p: any) => p.candidate?.full_name)
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        )}
                      </p>
                      {scheduledAt && (
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(scheduledAt, "d MMM", { locale: ptBR })}
                          <span className="text-slate-300">·</span>
                          <Clock className="w-3 h-3" />
                          {format(scheduledAt, "HH:mm")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isOnline && interview.meeting_link && (
                        <a
                          href={interview.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A2342] text-white text-xs font-medium hover:bg-[#0A2342]/90 transition-colors"
                        >
                          <Video className="w-3.5 h-3.5" />
                          Entrar
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <button
                        onClick={() => handleMarkCompleted(interview)}
                        disabled={completedInterviews.has(interview.id) || interview.status === "completed" || markingSessionId === interview.id}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          completedInterviews.has(interview.id) || interview.status === "completed"
                            ? "bg-green-600 text-white border border-green-600 cursor-default"
                            : markingSessionId === interview.id
                              ? "bg-green-100 text-green-500 border border-green-200 cursor-wait"
                              : "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                        }`}
                      >
                        {markingSessionId === interview.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        {completedInterviews.has(interview.id) || interview.status === "completed" ? "Concluída" : "Realizado"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardEntrance>
      )}

      {/* Hiring CTA — shown when interviews are completed */}
      {interviews.some((i: any) => completedInterviews.has(i.id) || i.status === "completed") && allCandidates.length > 0 && (
        <CardEntrance direction="forward" delay={0.2}>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-green-700" />
              </div>
              <div>
                <h4 className="font-semibold text-green-900">Pronto para contratar?</h4>
                <p className="text-xs text-green-600">Selecione os candidatos aprovados na lista acima e clique em "Contratar"</p>
              </div>
            </div>
          </div>
        </CardEntrance>
      )}

      {/* Candidate card modal */}
      {selectedCandidateId && (
        <CandidateCardModal
          open={!!selectedCandidateId}
          onClose={() => setSelectedCandidateId(null)}
          profile={modalProfile || selectedCandidate?.profile || { id: selectedCandidateId, name: "Carregando..." }}
          interview={modalInterview || selectedCandidate?.interview}
          matchScore={candidateCard?.matchScore ?? selectedCandidate?.matchScore}
          jobTitle={selectedJob.title}
          onDownloadPdf={handleDownloadPdf}
          isPdfLoading={pdfMutation.isPending}
          onHire={() =>
            handleHire(
              selectedCandidate?.applicationId || null,
              selectedCandidate?.batchId,
              selectedCandidateId
            )
          }
        />
      )}
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────────────

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center mb-4">
        <Calendar className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-medium text-[#0A2342] mb-2">{title}</h3>
      <p className="text-slate-500 max-w-sm">{description}</p>
    </div>
  );
}
