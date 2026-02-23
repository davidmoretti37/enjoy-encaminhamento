import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Briefcase,
  MapPin,
  Clock,
  Filter,
  Loader2,
} from "lucide-react";
import PublicLayout from "@/components/landing/PublicLayout";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// Use tRPC in development (localhost), direct API in production
const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';

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

interface Job {
  id: string;
  title: string;
  contract_type: string;
  work_type: string | null;
  location: string | null;
  salary: number | null;
  work_schedule: string | null;
  published_at: string | null;
}

export default function PublicVagasPage() {
  const [activeFilter, setActiveFilter] = useState("Todas");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterValue =
    activeFilter === "Todas"
      ? undefined
      : activeFilter === "Estágio"
        ? "estagio"
        : activeFilter === "CLT"
          ? "clt"
          : "menor-aprendiz";

  // Use tRPC query in development
  const trpcQuery = trpc.job.getPublicJobs.useQuery(
    filterValue ? { contractType: filterValue } : undefined,
    { enabled: isDev }
  );

  // Fetch from direct API in production
  useEffect(() => {
    if (isDev) {
      // Use tRPC data in dev
      if (trpcQuery.data) {
        setJobs(trpcQuery.data as Job[]);
      }
      setIsLoading(trpcQuery.isLoading);
      setError(trpcQuery.error?.message || null);
      return;
    }

    // Production: use direct API
    const fetchJobs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const url = filterValue
          ? `/api/public-jobs?contractType=${filterValue}`
          : "/api/public-jobs";
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }
        const data = await response.json();
        setJobs(data);
      } catch (err: any) {
        console.error("[PublicVagasPage] Error fetching jobs:", err);
        setError(err.message || "Failed to load jobs");
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobs();
  }, [filterValue, isDev, trpcQuery.data, trpcQuery.isLoading, trpcQuery.error]);

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
            ) : error ? (
              <div className="text-center py-16">
                <Briefcase className="h-12 w-12 text-red-300 mx-auto mb-4" />
                <p className="text-red-500 text-lg">Erro ao carregar vagas</p>
                <p className="text-slate-400 text-sm mt-2">{error}</p>
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
                            {job.work_schedule && (
                              <span className="inline-flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                {job.work_schedule}
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

        </div>
      </section>
    </PublicLayout>
  );
}
