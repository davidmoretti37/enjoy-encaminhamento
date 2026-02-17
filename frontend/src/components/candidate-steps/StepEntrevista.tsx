import { useCandidateFunnel } from "@/contexts/CandidateFunnelContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CardEntrance } from "@/components/funnel";
import {
  Video,
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

export default function StepEntrevista() {
  const {
    selectedApplication,
    pendingInterviews,
    confirmedInterviews,
    waitingResultInterviews,
    markSessionStarted,
    refreshData,
  } = useCandidateFunnel();

  // Filter interviews for selected application
  const appInterviews = [...pendingInterviews, ...confirmedInterviews, ...waitingResultInterviews].filter(
    (i: any) => i.application_id === selectedApplication?.id
  );

  if (!selectedApplication) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      {/* Pending interviews */}
      {pendingInterviews.length > 0 && (
        <CardEntrance>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-[#0A2342] font-semibold">Confirme sua presença</h3>
                  <p className="text-slate-500 text-sm">
                    Você tem entrevista(s) pendente(s) de confirmação
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {pendingInterviews.map((interview: any) => (
                <InterviewCard
                  key={interview.id}
                  interview={interview}
                  status="pending"
                  onRefresh={refreshData}
                />
              ))}
            </div>
          </div>
        </CardEntrance>
      )}

      {/* Confirmed interviews */}
      {confirmedInterviews.length > 0 && (
        <CardEntrance delay={pendingInterviews.length > 0 ? 0.1 : 0}>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-[#FF6B35]" />
                </div>
                <div>
                  <h3 className="text-[#0A2342] font-semibold">Entrevista Confirmada</h3>
                  <p className="text-slate-500 text-sm">
                    Sua presença foi confirmada
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {confirmedInterviews.map((interview: any) => (
                <InterviewCard
                  key={interview.id}
                  interview={interview}
                  status="confirmed"
                  onMarkStarted={markSessionStarted}
                  onRefresh={refreshData}
                />
              ))}
            </div>
          </div>
        </CardEntrance>
      )}

      {/* Waiting for result */}
      {waitingResultInterviews.length > 0 && (
        <CardEntrance delay={0.2}>
          <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FF6B35]/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#FF6B35]" />
                </div>
                <div>
                  <h3 className="text-[#0A2342] font-semibold">Aguardando Resultado</h3>
                  <p className="text-slate-600 text-sm">
                    Sua entrevista está sendo avaliada
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {waitingResultInterviews.map((interview: any) => (
                <InterviewCard
                  key={interview.id}
                  interview={interview}
                  status="waiting"
                  onRefresh={refreshData}
                />
              ))}
            </div>
          </div>
        </CardEntrance>
      )}

      {/* No interviews at all */}
      {appInterviews.length === 0 && (
        <CardEntrance>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#FF6B35]/10 border-2 border-[#FF6B35]/20 flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-[#FF6B35]" />
            </div>
            <h3 className="text-lg font-medium text-[#0A2342] mb-2">Pré-seleção concluída</h3>
            <p className="text-slate-600 max-w-sm">
              Sua reunião de pré-seleção foi realizada com sucesso. Agora a empresa irá avaliar os candidatos e definir quem seguirá no processo. Aguarde o resultado.
            </p>
          </div>
        </CardEntrance>
      )}
    </div>
  );
}

interface InterviewCardProps {
  interview: any;
  status: "pending" | "confirmed" | "waiting";
  onMarkStarted?: (sessionId: string) => void;
  onRefresh: () => void;
}

function InterviewCard({ interview, status, onMarkStarted, onRefresh }: InterviewCardProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isMarkingAttended, setIsMarkingAttended] = useState(false);
  const session = interview.session;
  const isOnline = session?.interview_type === "online";
  const scheduledAt = session?.scheduled_at ? new Date(session.scheduled_at) : null;

  const confirmMutation = trpc.interview.confirmAttendance.useMutation({
    onSuccess: () => {
      toast.success("Presença confirmada!");
      onRefresh();
      setIsConfirming(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao confirmar presença");
      setIsConfirming(false);
    },
  });

  const attendedMutation = trpc.interview.markAsAttended.useMutation({
    onSuccess: () => {
      toast.success("Presença registrada! Aguardando resultado da empresa.");
      onRefresh();
      setIsMarkingAttended(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao registrar presença");
      setIsMarkingAttended(false);
    },
  });

  const handleConfirm = () => {
    setIsConfirming(true);
    confirmMutation.mutate({ participantId: interview.id });
  };

  const handleMarkAttended = () => {
    setIsMarkingAttended(true);
    attendedMutation.mutate({ participantId: interview.id });
  };

  const handleJoinMeeting = () => {
    if (session?.id && onMarkStarted) {
      onMarkStarted(session.id);
    }
    if (session?.meeting_link) {
      window.open(session.meeting_link, "_blank");
    }
  };

  return (
    <div className="bg-slate-100 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isOnline ? "bg-[#FF6B35]/10" : "bg-slate-100"
          }`}>
            {isOnline ? (
              <Video className="w-5 h-5 text-[#FF6B35]" />
            ) : (
              <MapPin className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <div>
            <p className="text-[#0A2342] font-medium">
              Entrevista {isOnline ? "Online" : "Presencial"}
            </p>
            {scheduledAt && (
              <p className="text-slate-600 text-sm flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {format(scheduledAt, "EEEE, d 'de' MMMM", { locale: ptBR })}
                <span className="text-[#5A5A5D]">•</span>
                <Clock className="w-3.5 h-3.5" />
                {format(scheduledAt, "HH:mm")}
              </p>
            )}
          </div>
        </div>

        {/* Actions based on status */}
        {status === "pending" && (
          <button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#0A2342] text-white font-medium text-sm hover:bg-[#0A2342]/90 transition-all disabled:opacity-50"
          >
            {isConfirming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Confirmar
          </button>
        )}

        {status === "confirmed" && isOnline && session?.meeting_link && (
          <button
            onClick={handleJoinMeeting}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#0A2342] text-white font-medium text-sm hover:bg-[#0A2342]/90 transition-all"
          >
            <Video className="w-4 h-4" />
            Acessar Reunião
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}

        {status === "confirmed" && !isOnline && (
          <button
            onClick={handleMarkAttended}
            disabled={isMarkingAttended}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF6B35] text-white font-medium text-sm hover:bg-[#FF6B35]/90 transition-all disabled:opacity-50"
          >
            {isMarkingAttended ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Já compareci
          </button>
        )}

        {status === "waiting" && (
          <span className="px-3 py-1.5 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] text-sm font-medium">
            Aguardando resultado
          </span>
        )}
      </div>

      {/* Location for in-person */}
      {!isOnline && session?.location_address && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <p className="text-slate-600 text-sm flex items-start gap-2">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {session.location_address}
              {session.location_city && `, ${session.location_city}`}
              {session.location_state && ` - ${session.location_state}`}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center mb-4">
        <Calendar className="w-8 h-8 text-slate-600" />
      </div>
      <h3 className="text-lg font-medium text-[#0A2342] mb-2">Nenhuma candidatura selecionada</h3>
      <p className="text-slate-600 max-w-sm">Selecione uma candidatura para ver os detalhes</p>
    </div>
  );
}
