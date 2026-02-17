import { useCandidateFunnel } from "@/contexts/CandidateFunnelContext";
import { CardEntrance } from "@/components/funnel";
import { Clock, Calendar, CheckCircle, Video } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

export default function StepCandidaturaEnviada() {
  const { selectedApplication, refreshData } = useCandidateFunnel();

  const jobId = selectedApplication?.job?.id;
  const { data: meetingInfo } = trpc.batch.getCandidateMeetingInfo.useQuery(
    { jobId: jobId! },
    { enabled: !!jobId }
  );

  const joinMeetingMutation = trpc.application.joinMeeting.useMutation({
    onSuccess: () => {
      refreshData();
    },
  });

  if (!selectedApplication) {
    return <EmptyState />;
  }

  const job = selectedApplication.job;
  const appliedAt = selectedApplication.created_at
    ? new Date(selectedApplication.created_at)
    : null;

  return (
    <div className="space-y-5">
      {/* Status card */}
      <CardEntrance>
        <div className="bg-gradient-to-r from-blue-500/10 to-[#FF6B35]/10 rounded-xl border border-blue-500/20 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-[#0A2342] font-semibold text-lg">Candidatura Enviada</h2>
              <p className="text-slate-600 text-sm mt-0.5">
                Sua candidatura para <strong>{job?.title}</strong> está sendo analisada
              </p>
              {appliedAt && (
                <p className="text-slate-400 text-xs mt-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Enviada em {format(appliedAt, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardEntrance>

      {/* Meeting info */}
      {meetingInfo?.meeting_scheduled_at && (
        <CardEntrance delay={0.05}>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                <Video className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="text-[#0A2342] font-semibold">Reunião Agendada</h3>
                <p className="text-blue-700 text-sm">
                  {format(new Date(meetingInfo.meeting_scheduled_at), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
            {meetingInfo.meeting_notes && (
              <p className="text-sm text-blue-700 mb-3">{meetingInfo.meeting_notes}</p>
            )}
            {meetingInfo.meeting_link ? (
              <Button
                onClick={() => {
                  joinMeetingMutation.mutate({ applicationId: selectedApplication.id });
                  window.open(meetingInfo.meeting_link!, '_blank');
                }}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Video className="w-4 h-4 mr-2" />
                Entrar na Reunião
              </Button>
            ) : (
              <p className="text-sm text-blue-600 bg-blue-100 rounded-lg px-3 py-2 text-center">
                O link da reunião será disponibilizado em breve
              </p>
            )}
          </div>
        </CardEntrance>
      )}

      {/* What happens next */}
      <CardEntrance delay={meetingInfo?.meeting_scheduled_at ? 0.15 : 0.1}>
        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="text-[#0A2342] font-semibold mb-3">O que acontece agora?</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
              </div>
              <div>
                <p className="text-[#0A2342] font-medium text-sm">Candidatura recebida</p>
                <p className="text-slate-500 text-sm">Sua candidatura foi enviada com sucesso</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-slate-400 text-xs font-bold">2</span>
              </div>
              <div>
                <p className="text-[#0A2342] font-medium text-sm">Análise do perfil</p>
                <p className="text-slate-500 text-sm">Nossa equipe irá analisar seu perfil</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-slate-400 text-xs font-bold">3</span>
              </div>
              <div>
                <p className="text-[#0A2342] font-medium text-sm">Pré-seleção</p>
                <p className="text-slate-500 text-sm">Se selecionado, você será notificado</p>
              </div>
            </div>
          </div>
        </div>
      </CardEntrance>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center mb-4">
        <Clock className="w-8 h-8 text-slate-600" />
      </div>
      <h3 className="text-lg font-medium text-[#0A2342] mb-2">Nenhuma candidatura selecionada</h3>
      <p className="text-slate-600 max-w-sm">Selecione uma candidatura para ver os detalhes</p>
    </div>
  );
}
