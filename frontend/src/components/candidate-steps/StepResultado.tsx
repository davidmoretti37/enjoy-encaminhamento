import { useCandidateFunnel } from "@/contexts/CandidateFunnelContext";
import { CardEntrance } from "@/components/funnel";
import {
  Trophy,
  XCircle,
  ArrowRight,
  RefreshCw,
  Clock,
} from "lucide-react";

export default function StepResultado() {
  const { selectedApplication, setActiveTab, setViewingStep } = useCandidateFunnel();

  if (!selectedApplication) {
    return <EmptyState />;
  }

  const status = selectedApplication.status;
  const job = selectedApplication.job;
  const isWaiting = status === "interviewed";
  const isSelected = status === "selected";
  const isRejected = status === "rejected";

  // Waiting for company result
  if (isWaiting) {
    return (
      <div className="space-y-5">
        <CardEntrance>
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-[#FF6B35]/10 flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-[#FF6B35]" />
            </div>
            <h2 className="text-2xl font-bold text-[#0A2342] mb-2">Aguardando resultado</h2>
            <p className="text-slate-600 max-w-md mx-auto">
              Sua entrevista para a vaga <strong>{job?.title}</strong> foi realizada. Agora é só aguardar o retorno da empresa.
            </p>
          </div>
        </CardEntrance>

        <CardEntrance delay={0.1}>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-[#0A2342] font-semibold mb-2">O que acontece agora?</h3>
            <p className="text-slate-500 text-sm">
              A empresa está avaliando os candidatos. Você receberá uma notificação assim que houver uma atualização sobre sua candidatura.
            </p>
          </div>
        </CardEntrance>
      </div>
    );
  }

  if (isSelected) {
    return (
      <div className="space-y-5">
        {/* Congratulations card */}
        <CardEntrance>
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20 p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-[#0A2342] mb-2">Parabéns! Você foi selecionado!</h2>
            <p className="text-slate-600 max-w-md mx-auto">
              Você foi selecionado para a vaga <strong>{job?.title}</strong>. Agora é só assinar o contrato para começar!
            </p>
          </div>
        </CardEntrance>

        {/* Next steps */}
        <CardEntrance delay={0.1}>
          <div className="rounded-xl border border-slate-200 p-5">
            <h3 className="text-[#0A2342] font-semibold mb-3">Próximos passos</h3>
            <div className="p-3 rounded-lg bg-[#FF6B35]/10 border border-[#FF6B35]/20">
              <p className="text-[#0A2342] font-medium text-sm">Assinatura do contrato</p>
              <p className="text-slate-500 text-sm mt-0.5 mb-3">
                Você receberá o contrato para assinatura digital em breve
              </p>
              <button
                onClick={() => setViewingStep(4)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#1B4D7A] to-[#FF6B35] text-white font-medium shadow-lg shadow-[#FF6B35]/25 hover:shadow-[#FF6B35]/40 transition-all text-sm"
              >
                Assinar Contrato
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </CardEntrance>
      </div>
    );
  }

  // Rejected
  return (
    <div className="space-y-5">
      {/* Rejection card */}
      <CardEntrance>
        <div className="rounded-xl border border-slate-200 p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-[#0A2342] mb-2">Não foi dessa vez</h2>
          <p className="text-slate-600 max-w-md mx-auto">
            Infelizmente você não foi selecionado para a vaga <strong>{job?.title}</strong>. Continue se candidatando a outras oportunidades!
          </p>
        </div>
      </CardEntrance>

      {/* Encouragement */}
      <CardEntrance delay={0.1}>
        <div className="bg-gradient-to-r from-[#FF6B35]/10 to-[#FF6B35]/5 rounded-xl border border-[#FF6B35]/20 p-5">
          <h3 className="text-[#0A2342] font-semibold mb-2 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-[#FF6B35]" />
            Não desista!
          </h3>
          <p className="text-slate-600 text-sm mb-4">
            Novas oportunidades surgem todos os dias. Continue aprimorando seu perfil e se candidatando a vagas compatíveis.
          </p>
          <button
            onClick={() => setActiveTab("vagas")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#1B4D7A] to-[#FF6B35] text-white font-medium shadow-lg shadow-[#FF6B35]/25 hover:shadow-[#FF6B35]/40 transition-all"
          >
            Ver Outras Vagas
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </CardEntrance>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center mb-4">
        <Trophy className="w-8 h-8 text-slate-600" />
      </div>
      <h3 className="text-lg font-medium text-[#0A2342] mb-2">Nenhuma candidatura selecionada</h3>
      <p className="text-slate-600 max-w-sm">Selecione uma candidatura para ver os detalhes</p>
    </div>
  );
}
