import { useCandidateFunnel } from "@/contexts/CandidateFunnelContext";
import { CardEntrance } from "@/components/funnel";
import {
  Building2,
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  GraduationCap,
  Shield,
  Users,
  PartyPopper,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const hiringTypeLabels: Record<string, string> = {
  estagio: "Estágio",
  clt: "CLT",
  "menor-aprendiz": "Jovem Aprendiz",
};

export default function StepContratado() {
  const { selectedApplication, hiringProcesses } = useCandidateFunnel();

  const hiringProcess = (hiringProcesses as any[]).find(
    (hp: any) => hp.application_id === selectedApplication?.id
  );

  if (!hiringProcess) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Clock className="w-10 h-10 text-slate-400 mb-4" />
        <h3 className="text-lg font-medium text-[#0A2342]">Carregando dados...</h3>
      </div>
    );
  }

  const typeLabel = hiringTypeLabels[hiringProcess.hiring_type] || hiringProcess.hiring_type;
  const companyName = hiringProcess.company?.company_name || "Empresa";
  const jobTitle = hiringProcess.job?.title || "Vaga";

  const startDate = hiringProcess.start_date ? new Date(hiringProcess.start_date) : null;
  const endDate = hiringProcess.end_date ? new Date(hiringProcess.end_date) : null;
  const daysRemaining = endDate ? differenceInDays(endDate, new Date()) : null;

  const salary = hiringProcess.monthly_salary
    ? (hiringProcess.monthly_salary / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : null;

  const isEstagio = hiringProcess.hiring_type === "estagio";

  return (
    <div className="space-y-6">
      {/* Success banner */}
      <CardEntrance>
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20 p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
              <PartyPopper className="w-7 h-7 text-green-500" />
            </div>
            <div>
              <h2 className="text-[#0A2342] font-bold text-xl">Contratado!</h2>
              <p className="text-green-600 text-sm mt-0.5">
                Todas as assinaturas foram coletadas. Seu contrato está ativo.
              </p>
            </div>
          </div>
        </div>
      </CardEntrance>

      {/* Employment details */}
      <CardEntrance delay={0.1}>
        <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="text-[#0A2342] font-semibold text-lg">Detalhes do Contrato</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Empresa</p>
                <p className="text-sm font-medium text-[#0A2342]">{companyName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Vaga</p>
                <p className="text-sm font-medium text-[#0A2342]">{jobTitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Tipo de Contrato</p>
                <p className="text-sm font-medium text-[#0A2342]">{typeLabel}</p>
              </div>
            </div>

            {salary && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <span className="text-green-600 font-bold text-sm">R$</span>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Salário Mensal</p>
                  <p className="text-sm font-medium text-[#0A2342]">{salary}</p>
                </div>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="border-t border-slate-100 pt-4 space-y-2">
            {startDate && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Início</span>
                <span className="font-medium text-[#0A2342]">
                  {format(startDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>
            )}
            {endDate && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Término</span>
                <span className="font-medium text-[#0A2342]">
                  {format(endDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>
            )}
            {!endDate && hiringProcess.hiring_type === "clt" && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Término</span>
                <span className="font-medium text-[#0A2342]">Prazo indeterminado</span>
              </div>
            )}
          </div>
        </div>
      </CardEntrance>

      {/* Contract expiry countdown (estágio only) */}
      {isEstagio && daysRemaining !== null && (
        <CardEntrance delay={0.15}>
          <div className={`rounded-xl border p-4 flex items-center gap-3 ${
            daysRemaining <= 30
              ? "bg-red-50 border-red-200"
              : daysRemaining <= 90
                ? "bg-amber-50 border-amber-200"
                : "bg-blue-50 border-blue-200"
          }`}>
            <Clock className={`w-5 h-5 ${
              daysRemaining <= 30 ? "text-red-500" : daysRemaining <= 90 ? "text-amber-500" : "text-blue-500"
            }`} />
            <div>
              <p className={`text-sm font-medium ${
                daysRemaining <= 30 ? "text-red-700" : daysRemaining <= 90 ? "text-amber-700" : "text-blue-700"
              }`}>
                {daysRemaining > 0
                  ? `${daysRemaining} dias restantes no contrato`
                  : "Contrato expirado"}
              </p>
              {endDate && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Encerra em {format(endDate, "dd/MM/yyyy")}
                </p>
              )}
            </div>
          </div>
        </CardEntrance>
      )}

      {/* Insurance status (estágio only) */}
      {isEstagio && hiringProcess.insurance_status && (
        <CardEntrance delay={0.2}>
          <div className={`rounded-xl border p-4 flex items-center gap-3 ${
            hiringProcess.insurance_status === "active"
              ? "bg-green-50 border-green-200"
              : hiringProcess.insurance_status === "expired"
                ? "bg-red-50 border-red-200"
                : "bg-amber-50 border-amber-200"
          }`}>
            <Shield className={`w-5 h-5 ${
              hiringProcess.insurance_status === "active"
                ? "text-green-500"
                : hiringProcess.insurance_status === "expired"
                  ? "text-red-500"
                  : "text-amber-500"
            }`} />
            <div>
              <p className={`text-sm font-medium ${
                hiringProcess.insurance_status === "active"
                  ? "text-green-700"
                  : hiringProcess.insurance_status === "expired"
                    ? "text-red-700"
                    : "text-amber-700"
              }`}>
                Seguro: {hiringProcess.insurance_status === "active" ? "Ativo" : hiringProcess.insurance_status === "expired" ? "Expirado" : "Pendente"}
              </p>
              {hiringProcess.insurance_expires_at && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Validade: {format(new Date(hiringProcess.insurance_expires_at), "dd/MM/yyyy")}
                </p>
              )}
            </div>
          </div>
        </CardEntrance>
      )}

      {/* Signature progress */}
      {isEstagio && (
        <CardEntrance delay={0.25}>
          <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
            <h3 className="text-[#0A2342] font-semibold mb-4">Assinaturas do Contrato</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Empresa", icon: Building2, signed: hiringProcess.company_signed, at: hiringProcess.company_signed_at },
                { label: "Você", icon: Users, signed: hiringProcess.candidate_signed, at: hiringProcess.candidate_signed_at },
                { label: "Responsável", icon: Users, signed: hiringProcess.parent_signed, at: hiringProcess.parent_signed_at },
                { label: "Escola", icon: GraduationCap, signed: hiringProcess.school_signed, at: hiringProcess.school_signed_at },
              ].map((sig, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 rounded-lg border bg-green-500/10 border-green-500/30"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500/20">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-green-400">{sig.label}</span>
                    <p className="text-xs text-slate-500">
                      {sig.at ? format(new Date(sig.at), "dd/MM/yyyy") : "Assinado"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Total</span>
                <span className="text-green-600 font-medium">4/4 assinaturas</span>
              </div>
            </div>
          </div>
        </CardEntrance>
      )}
    </div>
  );
}
