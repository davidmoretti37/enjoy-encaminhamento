import { motion } from "framer-motion";
import { useCompanyFunnel } from "@/contexts/CompanyFunnelContext";
import {
  User,
  Calendar,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart,
  Briefcase,
} from "lucide-react";
import { CardEntrance } from "@/components/funnel";
import { format, differenceInDays, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function StepFuncionarioAtivo() {
  const { selectedJob, selectedJobId, hiringProcesses } = useCompanyFunnel();

  // Filter active employees for selected job
  const activeEmployees = hiringProcesses.filter(
    (hp: any) => hp.job?.id === selectedJobId && hp.status === "active"
  );

  if (!selectedJob) {
    return <EmptyState title="Nenhuma vaga selecionada" description="Selecione uma vaga" />;
  }

  if (activeEmployees.length === 0) {
    return (
      <CardEntrance>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-lg font-medium text-[#0A2342] mb-2">Nenhum funcionário ativo</h3>
          <p className="text-slate-600 max-w-sm">
            Após as assinaturas, os funcionários aparecerão aqui
          </p>
        </div>
      </CardEntrance>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Floating decorative elements */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-green-500/5 to-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-40 -left-32 w-80 h-80 bg-gradient-to-br from-blue-500/5 to-[#0A2342]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Animated guidance banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-green-500/10 border border-green-500/20"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" style={{ animationDuration: '3s' }} />
        <div className="relative p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shrink-0">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm text-[#0A2342] font-medium">Funcionários Ativos</p>
            <p className="text-xs text-slate-600 mt-0.5">
              Gere relatórios mensais para conformidade e acompanhamento de desempenho
            </p>
          </div>
        </div>
      </motion.div>

      {/* Header stats */}
      <CardEntrance>
        <div className="relative group">
          {/* Glow effect on hover */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 via-emerald-500 to-green-500 rounded-2xl opacity-0 group-hover:opacity-10 blur transition-opacity" />

          <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 shadow-xl overflow-hidden p-6">
            {/* Gradient accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-green-500 via-emerald-500 to-green-500" />

            <div className="pt-2 flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl blur-lg opacity-40 animate-pulse" />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                  <Briefcase className="w-8 h-8 text-white" />
                </div>
              </motion.div>

              <div>
                <h2 className="text-2xl font-bold text-[#0A2342] tracking-tight">
                  Funcionários Ativos
                </h2>
                <p className="text-slate-600 text-sm mt-1 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-600 font-semibold">
                    {activeEmployees.length}
                  </span>
                  funcionário{activeEmployees.length !== 1 ? 's' : ''} em <span className="font-semibold text-[#0A2342]">{selectedJob.title}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardEntrance>

      {/* Employees grid */}
      <div className="grid gap-4">
        {activeEmployees.map((employee: any, index: number) => (
          <CardEntrance key={employee.id} delay={index * 0.1}>
            <EmployeeCard employee={employee} />
          </CardEntrance>
        ))}
      </div>
    </div>
  );
}

function EmployeeCard({ employee }: { employee: any }) {
  const candidate = employee.candidate;
  const isEstagio = employee.hiring_type === "estagio";
  const startDate = employee.start_date ? new Date(employee.start_date) : null;
  const endDate = employee.end_date ? new Date(employee.end_date) : startDate ? addMonths(startDate, 12) : null;

  // Calculate days until contract expires (for estágio)
  const daysUntilExpiry = endDate ? differenceInDays(endDate, new Date()) : null;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="relative group"
    >
      {/* Glow effect */}
      <div className={`absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity ${
        isExpiringSoon
          ? "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500"
          : "bg-gradient-to-r from-green-500 via-emerald-500 to-green-500"
      }`} />

      <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-slate-200/50 overflow-hidden shadow-lg">
        {/* Contract expiry warning */}
        {isEstagio && isExpiringSoon && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-b border-amber-500/20 px-5 py-3 flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md animate-pulse">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-amber-600 font-semibold flex-1">
              ⚠️ Contrato expira em {daysUntilExpiry} dias
            </span>
          </motion.div>
        )}

        {/* Main content */}
        <div className="p-5 bg-gradient-to-br from-slate-50/50 to-transparent">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {/* Avatar with enhanced gradient and active indicator */}
              <div className="relative">
                {/* Active status indicator */}
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 border-2 border-white shadow-lg z-10 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                </div>

                <div className="absolute inset-0 bg-[#0A2342] rounded-full blur-md opacity-40 animate-pulse" />
                <div className="relative w-16 h-16 rounded-full bg-[#0A2342] flex items-center justify-center border-4 border-white shadow-xl">
                  {candidate?.photo_url ? (
                    <img
                      src={candidate.photo_url}
                      alt={candidate.full_name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-bold text-2xl">
                      {candidate?.full_name?.charAt(0) || "?"}
                    </span>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-[#0A2342] font-bold text-xl truncate">
                    {candidate?.full_name || "Funcionário"}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    isEstagio
                      ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-sm shadow-purple-500/20"
                      : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm shadow-blue-500/20"
                  }`}>
                    {isEstagio ? "📚 Estágio" : "💼 CLT"}
                  </span>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {startDate && (
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/50"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-sm">
                          <Calendar className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="text-xs text-slate-600 font-medium">Início</div>
                          <div className="text-sm text-[#0A2342] font-bold">{format(startDate, "dd/MM/yyyy")}</div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  {isEstagio && endDate && (
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className={`p-3 rounded-xl border ${
                        isExpiringSoon
                          ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/50"
                          : "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${
                          isExpiringSoon
                            ? "bg-gradient-to-br from-amber-500 to-orange-500"
                            : "bg-gradient-to-br from-green-500 to-emerald-500"
                        }`}>
                          <Clock className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="text-xs text-slate-600 font-medium">Término</div>
                          <div className={`text-sm font-bold ${
                            isExpiringSoon ? "text-amber-600" : "text-[#0A2342]"
                          }`}>
                            {format(endDate, "dd/MM/yyyy")}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* Primary action - top-right */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 rounded-full bg-[#0A2342] text-white font-semibold shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all flex items-center justify-center gap-2"
            >
              <BarChart className="w-5 h-5" />
              Relatório Mensal
            </motion.button>
          </div>
        </div>

        {/* Footer with link-style secondary action */}
        <div className="p-4 border-t border-slate-200/50 bg-slate-50/30">
          <motion.button
            whileHover={{ x: 4 }}
            className="text-sm text-slate-600 hover:text-[#0A2342] font-medium transition-all flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Ver Detalhes do Contrato
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center mb-4">
        <User className="w-8 h-8 text-slate-600" />
      </div>
      <h3 className="text-lg font-medium text-[#0A2342] mb-2">{title}</h3>
      <p className="text-slate-600 max-w-sm">{description}</p>
    </div>
  );
}
