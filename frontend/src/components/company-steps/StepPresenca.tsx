import { useState } from "react";
import { motion } from "framer-motion";
import { useCompanyFunnel } from "@/contexts/CompanyFunnelContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  User,
  Clock,
  Calendar,
  Loader2,
  ClipboardCheck,
} from "lucide-react";
import { CardEntrance } from "@/components/funnel";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function StepPresenca() {
  const { selectedJob, selectedJobId, interviews, refreshData } = useCompanyFunnel();
  const [attendanceMarked, setAttendanceMarked] = useState<Record<string, boolean>>({});

  // Filter completed interviews that need attendance marking
  const completedInterviews = interviews.filter(
    (i: any) =>
      i.job?.id === selectedJobId &&
      (i.status === "completed" || new Date(i.scheduled_at) < new Date())
  );

  const markAttendanceMutation = trpc.interview.markAttendance.useMutation({
    onSuccess: () => {
      toast.success("Presença marcada com sucesso!");
      refreshData();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao marcar presença");
    },
  });

  const handleMarkAttendance = (sessionId: string, attendees: { participantId: string; attended: boolean }[]) => {
    markAttendanceMutation.mutate({ sessionId, attendees });
  };

  if (!selectedJob) {
    return <EmptyState title="Nenhuma vaga selecionada" description="Selecione uma vaga" />;
  }

  if (completedInterviews.length === 0) {
    return (
      <CardEntrance>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center mb-4">
            <ClipboardCheck className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-lg font-medium text-[#0A2342] mb-2">Nenhuma entrevista concluída</h3>
          <p className="text-slate-600 max-w-sm">
            Após as entrevistas, você poderá marcar a presença dos candidatos aqui
          </p>
        </div>
      </CardEntrance>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Floating decorative elements */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-amber-500/5 to-orange-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-40 -left-32 w-80 h-80 bg-gradient-to-br from-green-500/5 to-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Animated guidance banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/20"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" style={{ animationDuration: '3s' }} />
        <div className="relative p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shrink-0">
            <ClipboardCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm text-[#0A2342] font-medium">Confirmação de Presença</p>
            <p className="text-xs text-slate-600 mt-0.5">
              Marque a presença dentro de 48 horas. Candidatos confirmados avançam para a etapa de contrato.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Header */}
      <CardEntrance>
        <div className="relative group">
          {/* Glow effect on hover */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 rounded-2xl opacity-0 group-hover:opacity-10 blur transition-opacity" />

          <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 shadow-xl overflow-hidden p-6">
            {/* Gradient accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />

            <div className="pt-2 flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl blur-lg opacity-40 animate-pulse" />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                  <ClipboardCheck className="w-8 h-8 text-white" />
                </div>
              </motion.div>

              <div>
                <h2 className="text-2xl font-bold text-[#0A2342] tracking-tight">
                  Marcar Presença
                </h2>
                <p className="text-slate-600 text-sm mt-1">
                  Confirme quais candidatos compareceram às entrevistas
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardEntrance>

      {/* Interviews to mark */}
      <div className="space-y-4">
        {completedInterviews.map((interview: any, index: number) => (
          <CardEntrance key={interview.id} delay={index * 0.1}>
            <AttendanceCard
              interview={interview}
              onMarkAttendance={(attendees) => handleMarkAttendance(interview.id, attendees)}
              isLoading={markAttendanceMutation.isPending}
            />
          </CardEntrance>
        ))}
      </div>
    </div>
  );
}

interface AttendanceCardProps {
  interview: any;
  onMarkAttendance: (attendees: { participantId: string; attended: boolean }[]) => void;
  isLoading: boolean;
}

function AttendanceCard({ interview, onMarkAttendance, isLoading }: AttendanceCardProps) {
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const participants = interview.participants || [];
  const scheduledAt = interview.scheduled_at ? new Date(interview.scheduled_at) : null;

  const toggleAttendance = (participantId: string) => {
    setAttendance((prev) => ({
      ...prev,
      [participantId]: !prev[participantId],
    }));
  };

  const handleSubmit = () => {
    const attendees = participants.map((p: any) => ({
      participantId: p.id,
      attended: attendance[p.id] ?? false,
    }));
    onMarkAttendance(attendees);
  };

  const hasMarkedAny = Object.keys(attendance).length > 0;
  const presentCount = Object.values(attendance).filter(Boolean).length;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="relative group"
    >
      {/* Glow effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity" />

      <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-slate-200/50 overflow-hidden shadow-lg">
        {/* Header with primary action in top-right */}
        <div className="p-5 border-b border-slate-200/50 bg-gradient-to-br from-slate-50/50 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B35] to-purple-600 rounded-2xl blur-lg opacity-40" />
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF6B35] to-purple-600 flex items-center justify-center shadow-lg">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
              </motion.div>

              <div>
                <span className="text-[#0A2342] font-semibold text-lg">
                  Entrevista {interview.interview_type === "online" ? "Online" : "Presencial"}
                </span>
                {scheduledAt && (
                  <p className="text-slate-600 text-sm mt-1 flex items-center gap-2 font-medium">
                    <Clock className="w-4 h-4 text-[#FF6B35]" />
                    {format(scheduledAt, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                  </p>
                )}
              </div>
            </div>

            {/* Primary action - top-right */}
            <motion.button
              whileHover={{ scale: hasMarkedAny && !isLoading ? 1.05 : 1 }}
              whileTap={{ scale: hasMarkedAny && !isLoading ? 0.95 : 1 }}
              onClick={handleSubmit}
              disabled={!hasMarkedAny || isLoading}
              className="px-6 py-3 rounded-full bg-[#0A2342] text-white font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Confirmar Presença
                  {presentCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-bold">
                      {presentCount}
                    </span>
                  )}
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* Participants */}
        <div className="p-5 space-y-3">
          {participants.map((participant: any, index: number) => {
            const isPresent = attendance[participant.id] ?? false;
            const candidate = participant.candidate;

            return (
              <motion.button
                key={participant.id}
                onClick={() => toggleAttendance(participant.id)}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all shadow-sm ${
                  isPresent
                    ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-500/50 shadow-green-500/20"
                    : "bg-gradient-to-br from-red-50/50 to-rose-50/50 border-red-500/30 hover:border-red-500/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md ${
                    isPresent
                      ? "bg-gradient-to-br from-green-500 to-emerald-500"
                      : "bg-gradient-to-br from-red-500 to-rose-500"
                  }`}>
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[#0A2342] font-semibold text-base">
                    {candidate?.full_name || "Candidato"}
                  </span>
                </div>

                <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold shadow-sm ${
                  isPresent
                    ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-green-500/20"
                    : "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-red-500/20"
                }`}>
                  {isPresent ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      ✓ Presente
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5" />
                      ✗ Ausente
                    </>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center mb-4">
        <ClipboardCheck className="w-8 h-8 text-slate-600" />
      </div>
      <h3 className="text-lg font-medium text-[#0A2342] mb-2">{title}</h3>
      <p className="text-slate-600 max-w-sm">{description}</p>
    </div>
  );
}
