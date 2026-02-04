import { useState } from "react";
import { motion } from "motion/react";
import {
  Briefcase,
  MapPin,
  Clock,
  ArrowRight,
  Filter,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import PublicLayout from "@/components/landing/PublicLayout";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const filterOptions = ["Todas", "Estágio", "CLT", "Jovem Aprendiz"];

const contractTypeMap: Record<string, string> = {
  estagio: "Estágio",
  clt: "CLT",
  "menor-aprendiz": "Jovem Aprendiz",
  jovem_aprendiz: "Jovem Aprendiz",
};

const typeColors: Record<string, string> = {
  "Estágio": "bg-blue-100 text-blue-700",
  "CLT": "bg-green-100 text-green-700",
  "Jovem Aprendiz": "bg-orange-100 text-orange-700",
};

const workTypeMap: Record<string, string> = {
  presencial: "Presencial",
  remoto: "Remoto",
  hibrido: "Híbrido",
};

export default function PublicVagasPage() {
  const [activeFilter, setActiveFilter] = useState("Todas");

  const filterValue =
    activeFilter === "Todas"
      ? undefined
      : activeFilter === "Estágio"
        ? "estagio"
        : activeFilter === "CLT"
          ? "clt"
          : "menor-aprendiz";

  const { data: jobs, isLoading } = trpc.job.getPublicJobs.useQuery(
    filterValue ? { contractType: filterValue } : undefined
  );

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative pt-32 pb-12 px-4 bg-gradient-to-br from-slate-50 via-white to-orange-50/40">
        <div className="container mx-auto text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] mb-6">
              <Briefcase className="h-4 w-4" />
              <span className="text-sm font-medium">Oportunidades</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#0A2342] mb-4">
              Vagas <span className="text-gradient">Abertas</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
              Explore as oportunidades disponíveis e dê o próximo passo na sua carreira.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filters + Jobs */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          {/* Filter Bar */}
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10 max-w-4xl mx-auto"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-600">Filtrar por:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeFilter === filter
                      ? "bg-[#0A2342] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Job Listings */}
          <div className="max-w-4xl mx-auto space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : jobs && jobs.length > 0 ? (
              <motion.div
                className="space-y-4"
                initial="hidden"
                animate="visible"
                variants={containerVariants}
              >
                {jobs.map((job) => {
                  const typeLabel = contractTypeMap[job.contract_type] || job.contract_type;
                  const colorClass = typeColors[typeLabel] || "bg-slate-100 text-slate-700";
                  return (
                    <motion.div
                      key={job.id}
                      variants={itemVariants}
                      className="p-6 bg-white rounded-xl border border-slate-200 hover:border-[#FF6B35]/30 hover:shadow-md transition-all"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-[#0A2342]">
                              {job.title}
                            </h3>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}
                            >
                              {typeLabel}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                            {job.location && (
                              <span className="inline-flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5" />
                                {job.location}
                              </span>
                            )}
                            {job.hours_per_week && (
                              <span className="inline-flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                {job.hours_per_week}h/semana
                              </span>
                            )}
                            {job.work_type && (
                              <span className="inline-flex items-center gap-1.5">
                                {workTypeMap[job.work_type] || job.work_type}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2">
                            {job.salary && (
                              <span className="text-sm font-semibold text-[#0A2342]">
                                R$ {Number(job.salary).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês
                              </span>
                            )}
                            {job.published_at && (
                              <span className="text-xs text-slate-400">
                                Publicada {formatDistanceToNow(new Date(job.published_at), { addSuffix: true, locale: ptBR })}
                              </span>
                            )}
                          </div>
                        </div>
                        <Link href="/login?tab=signup">
                          <Button
                            variant="outline"
                            className="border-[#FF6B35] text-[#FF6B35] hover:bg-[#FF6B35] hover:text-white shrink-0"
                          >
                            Candidatar-se
                          </Button>
                        </Link>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <div className="text-center py-16">
                <Briefcase className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">Nenhuma vaga disponível no momento.</p>
                <p className="text-slate-400 text-sm mt-2">Cadastre-se para receber notificações de novas vagas.</p>
              </div>
            )}
          </div>

          {/* More jobs CTA */}
          <div className="text-center mt-12">
            <p className="text-slate-600 mb-4">
              Cadastre-se para ver todas as vagas e receber notificações de novas oportunidades.
            </p>
            <Link href="/login?tab=signup">
              <Button
                size="lg"
                className="bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white px-8 rounded-full"
              >
                Criar Meu Perfil — Grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
