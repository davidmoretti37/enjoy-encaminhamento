import { useState } from "react";
import { motion } from "framer-motion";
import { useCandidateFunnel } from "@/contexts/CandidateFunnelContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Search,
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { CardEntrance, StaggeredList } from "@/components/funnel";

const contractTypeLabels: Record<string, string> = {
  estagio: "Estágio",
  clt: "CLT",
  "jovem-aprendiz": "Jovem Aprendiz",
  pj: "PJ",
};

export default function VagasSection() {
  const { availableJobs, applications, refreshData, setActiveTab } = useCandidateFunnel();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [applyingTo, setApplyingTo] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const applyMutation = trpc.application.create.useMutation({
    onSuccess: () => {
      toast.success("Candidatura enviada com sucesso!");
      refreshData();
      setApplyingTo(null);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao enviar candidatura");
      setApplyingTo(null);
    },
  });

  // Get applied job IDs
  const appliedJobIds = new Set(applications.map((a: any) => a.job_id));

  // Filter jobs
  const filteredJobs = availableJobs.filter((job: any) => {
    const matchesSearch =
      !searchTerm ||
      job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = !selectedType || job.contract_type === selectedType;

    return matchesSearch && matchesType;
  });

  // Get unique contract types
  const contractTypes = Array.from(new Set(availableJobs.map((j: any) => j.contract_type).filter(Boolean)));

  const handleApply = (jobId: string) => {
    setApplyingTo(jobId);
    applyMutation.mutate({ job_id: jobId });
  };

  return (
    <div className="space-y-6">
      {/* Search and filters */}
      <CardEntrance>
        <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
              <input
                type="text"
                placeholder="Buscar vagas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-100 border-2 border-slate-200 text-[#0A2342] placeholder-slate-400 focus:border-[#FF6B35]/50 focus:ring-2 focus:ring-[#FF6B35]/20 focus:outline-none transition-all"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedType(null)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  !selectedType
                    ? "bg-[#FF6B35] text-[#0A2342]"
                    : "bg-slate-100 text-slate-600 hover:text-[#0A2342] border-2 border-slate-200"
                }`}
              >
                Todas
              </button>
              {contractTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(selectedType === type ? null : type)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedType === type
                      ? "bg-[#FF6B35] text-[#0A2342]"
                      : "bg-slate-100 text-slate-600 hover:text-[#0A2342] border-2 border-slate-200"
                  }`}
                >
                  {contractTypeLabels[type] || type}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardEntrance>

      {/* Results count */}
      <div className="text-slate-600 text-sm">
        {filteredJobs.length} vaga(s) encontrada(s)
      </div>

      {/* Jobs grid */}
      {filteredJobs.length === 0 ? (
        <CardEntrance>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center mb-4">
              <Briefcase className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-medium text-[#0A2342] mb-2">Nenhuma vaga encontrada</h3>
            <p className="text-slate-600 max-w-sm">
              {searchTerm || selectedType
                ? "Tente ajustar seus filtros de busca"
                : "Não há vagas disponíveis no momento"}
            </p>
          </div>
        </CardEntrance>
      ) : (
        <div className="grid gap-4">
          {filteredJobs.map((job: any, index: number) => {
            const isApplied = appliedJobIds.has(job.id);
            const isApplying = applyingTo === job.id;

            return (
              <CardEntrance key={job.id} delay={index * 0.05}>
                <JobCard
                  job={job}
                  isApplied={isApplied}
                  isApplying={isApplying}
                  onApply={() => handleApply(job.id)}
                  onViewApplication={() => setActiveTab("candidaturas")}
                />
              </CardEntrance>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface JobCardProps {
  job: any;
  isApplied: boolean;
  isApplying: boolean;
  onApply: () => void;
  onViewApplication: () => void;
}

function JobCard({ job, isApplied, isApplying, onApply, onViewApplication }: JobCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-5 hover:border-[#FF6B35]/30 transition-all"
    >
      <div className="flex items-start gap-4">
        {/* Job icon */}
        <div className="w-12 h-12 rounded-xl bg-[#0A2342] flex items-center justify-center shrink-0">
          <Briefcase className="w-6 h-6 text-white" />
        </div>

        {/* Job info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-[#0A2342] font-semibold text-lg">{job.title}</h3>

            {/* Contract type badge */}
            <span className="px-2.5 py-1 rounded-full bg-[#FF6B35]/20 text-[#FF6B35] text-xs font-medium shrink-0">
              {contractTypeLabels[job.contract_type] || job.contract_type}
            </span>
          </div>

          {/* Details */}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-600">
            {job.city && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {job.city}
              </span>
            )}
            {job.salary_min && (
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" />
                R$ {job.salary_min.toLocaleString()}
              </span>
            )}
            {job.work_mode && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {job.work_mode === "remote"
                  ? "Remoto"
                  : job.work_mode === "hybrid"
                  ? "Híbrido"
                  : "Presencial"}
              </span>
            )}
          </div>

          {/* Description preview */}
          {job.description && (
            <p className="text-slate-600 text-sm mt-3 line-clamp-2">
              {job.description}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-200">
        {isApplied ? (
          <button
            onClick={onViewApplication}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 text-green-400 font-medium text-sm border border-green-500/30"
          >
            <CheckCircle className="w-4 h-4" />
            Candidatura Enviada
          </button>
        ) : (
          <button
            onClick={onApply}
            disabled={isApplying}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#1B4D7A] to-[#FF6B35] text-white font-medium text-sm shadow-lg shadow-[#FF6B35]/25 hover:shadow-[#FF6B35]/40 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isApplying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Candidatar-se"
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}
