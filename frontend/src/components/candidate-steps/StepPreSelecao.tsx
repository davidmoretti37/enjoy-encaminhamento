import { useCandidateFunnel } from "@/contexts/CandidateFunnelContext";
import { CardEntrance } from "@/components/funnel";
import { Sparkles, Clock, FileText, CheckCircle, Video } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function StepPreSelecao() {
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
  const hasJoinedMeeting = !!selectedApplication.interview_date;

  const handleJoinMeeting = () => {
    joinMeetingMutation.mutate({ applicationId: selectedApplication.id });
    window.open(meetingInfo!.meeting_link!, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <CardEntrance>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0A2342] to-[#0A2342]/90 p-5">
          <div className="absolute right-0 top-0 w-48 h-full bg-gradient-to-l from-[#FF6B35]/20 to-transparent" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white">Você foi pré-selecionado!</h2>
              <p className="text-white/50 text-sm mt-0.5">
                Seu perfil se destacou para a vaga <span className="text-white/80 font-medium">{job?.title}</span>
              </p>
            </div>
          </div>
        </div>
      </CardEntrance>

      {/* Meeting info */}
      {meetingInfo?.meeting_scheduled_at && !hasJoinedMeeting && (
        <CardEntrance delay={0.1}>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
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
                onClick={handleJoinMeeting}
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

      {/* Meeting completed banner */}
      {hasJoinedMeeting && meetingInfo?.meeting_scheduled_at && (
        <CardEntrance delay={0.1}>
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h3 className="text-[#0A2342] font-semibold">Reunião Realizada</h3>
                <p className="text-green-700 text-sm">
                  {format(new Date(meetingInfo.meeting_scheduled_at), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          </div>
        </CardEntrance>
      )}

      {/* Timeline steps */}
      <CardEntrance delay={meetingInfo?.meeting_scheduled_at ? 0.2 : 0.15}>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-[#0A2342] font-semibold text-base mb-5">O que acontece agora?</h3>
          <div className="space-y-0">
            {/* Step 1 - done */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center shadow-sm shadow-green-500/30">
                  <CheckCircle className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
                </div>
                <div className="w-0.5 flex-1 bg-green-300 my-1.5 rounded-full" />
              </div>
              <div className="pb-6">
                <p className="text-[#0A2342] font-medium text-sm">Perfil pré-selecionado</p>
                <p className="text-slate-400 text-sm mt-0.5">Seu perfil foi aprovado pela nossa equipe</p>
              </div>
            </div>

            {/* Step 2 - done if joined meeting, current otherwise */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                {hasJoinedMeeting ? (
                  <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center shadow-sm shadow-green-500/30">
                    <CheckCircle className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#FF6B35] flex items-center justify-center shadow-sm shadow-orange-500/30 ring-4 ring-[#FF6B35]/10">
                    <Clock className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
                  </div>
                )}
                <div className={`w-0.5 flex-1 ${hasJoinedMeeting ? 'bg-green-300' : 'bg-slate-200'} my-1.5 rounded-full`} />
              </div>
              <div className="pb-6">
                <p className="text-[#0A2342] font-medium text-sm">Agendamento da entrevista</p>
                <p className="text-slate-400 text-sm mt-0.5">
                  {hasJoinedMeeting
                    ? "Reunião realizada"
                    : meetingInfo?.meeting_scheduled_at
                      ? "Reunião agendada — veja acima"
                      : "Entraremos em contato para agendar sua entrevista"}
                </p>
              </div>
            </div>

            {/* Step 3 - current if joined meeting, upcoming otherwise */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                {hasJoinedMeeting ? (
                  <div className="w-9 h-9 rounded-full bg-[#FF6B35] flex items-center justify-center shadow-sm shadow-orange-500/30 ring-4 ring-[#FF6B35]/10">
                    <Clock className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-slate-400" />
                  </div>
                )}
              </div>
              <div>
                <p className={`font-medium text-sm ${hasJoinedMeeting ? 'text-[#0A2342]' : 'text-slate-400'}`}>
                  Entrevista e resultado
                </p>
                <p className={`text-sm mt-0.5 ${hasJoinedMeeting ? 'text-slate-400' : 'text-slate-300'}`}>
                  {hasJoinedMeeting
                    ? "Aguardando avaliação da agência"
                    : "Realize a entrevista e aguarde o resultado final"}
                </p>
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
        <Sparkles className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-medium text-[#0A2342] mb-2">Nenhuma candidatura selecionada</h3>
      <p className="text-slate-600 max-w-sm">Selecione uma candidatura para ver os detalhes</p>
    </div>
  );
}
