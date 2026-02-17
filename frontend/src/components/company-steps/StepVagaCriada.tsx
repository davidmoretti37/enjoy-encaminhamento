import { useCompanyFunnel } from "@/contexts/CompanyFunnelContext";
import {
  Briefcase,
  Clock,
  DollarSign,
  FileText,
  Search,
  CheckCircle,
  MapPin,
  GraduationCap,
  Building2,
  Users,
} from "lucide-react";
import { CardEntrance } from "@/components/funnel";
import { format } from "date-fns";

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  estagio: "Estágio",
  clt: "CLT",
  "menor-aprendiz": "Jovem Aprendiz",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Search; message: string }> = {
  pending_review: {
    label: "Em análise",
    color: "bg-amber-100 text-amber-700",
    icon: Clock,
    message: "Sua vaga está sendo analisada pela agência. Você será notificado quando iniciar a busca por candidatos.",
  },
  searching: {
    label: "Buscando candidatos",
    color: "bg-blue-100 text-blue-700",
    icon: Search,
    message: "A agência está buscando candidatos que atendem ao perfil da vaga. Assim que encontrar candidatos compatíveis, eles aparecerão no próximo passo.",
  },
};

export default function StepVagaCriada() {
  const { selectedJob } = useCompanyFunnel();

  if (!selectedJob) {
    return (
      <CardEntrance>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center mb-4">
            <Briefcase className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-[#0A2342] mb-2">Nenhuma vaga selecionada</h3>
          <p className="text-slate-500 max-w-sm">Selecione ou crie uma vaga para começar</p>
        </div>
      </CardEntrance>
    );
  }

  const statusConfig = STATUS_CONFIG[selectedJob.status] || STATUS_CONFIG.searching;
  const StatusIcon = statusConfig.icon;
  const contractLabel = CONTRACT_TYPE_LABELS[selectedJob.contract_type] || selectedJob.contract_type;

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <CardEntrance>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              selectedJob.status === "pending_review" ? "bg-amber-100" : "bg-blue-100"
            }`}>
              <StatusIcon className={`w-5 h-5 ${
                selectedJob.status === "pending_review" ? "text-amber-600" : "text-blue-600"
              }`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-[#0A2342] font-semibold">{statusConfig.label}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                  {contractLabel}
                </span>
              </div>
              <p className="text-slate-500 text-sm">{statusConfig.message}</p>
            </div>
          </div>
        </div>
      </CardEntrance>

      {/* Job details card */}
      <CardEntrance delay={0.05}>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#0A2342]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#0A2342]">{selectedJob.title}</h2>
                {selectedJob.created_at && (
                  <p className="text-slate-500 text-xs">
                    Criada em {format(new Date(selectedJob.created_at), "dd/MM/yyyy")}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              <InfoItem
                icon={GraduationCap}
                label="Tipo de contrato"
                value={contractLabel}
              />
              {selectedJob.salary_min && (
                <InfoItem
                  icon={DollarSign}
                  label="Salário"
                  value={`R$ ${Number(selectedJob.salary_min).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                />
              )}
              {selectedJob.work_schedule && (
                <InfoItem
                  icon={Clock}
                  label="Horário"
                  value={selectedJob.work_schedule}
                />
              )}
              {selectedJob.city && (
                <InfoItem
                  icon={MapPin}
                  label="Local"
                  value={selectedJob.city}
                />
              )}
              {selectedJob.vacancies && (
                <InfoItem
                  icon={Users}
                  label="Vagas"
                  value={`${selectedJob.vacancies} vaga${selectedJob.vacancies > 1 ? "s" : ""}`}
                />
              )}
            </div>

            {/* Description */}
            {selectedJob.description && (
              <div>
                <h4 className="text-sm font-medium text-[#0A2342] mb-2">Descrição</h4>
                <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                  {selectedJob.description}
                </p>
              </div>
            )}

            {/* Requirements */}
            {selectedJob.requirements && (
              <div>
                <h4 className="text-sm font-medium text-[#0A2342] mb-2">Requisitos</h4>
                <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                  {selectedJob.requirements}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardEntrance>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: typeof Briefcase; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
      <Icon className="w-4 h-4 text-slate-400 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-[#0A2342] truncate">{value}</p>
      </div>
    </div>
  );
}
