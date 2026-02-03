import { useState } from "react";
import { motion } from "motion/react";
import {
  Briefcase,
  MapPin,
  Clock,
  Building2,
  ArrowRight,
  Search,
  Filter,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import PublicLayout from "@/components/landing/PublicLayout";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const filterOptions = ["Todas", "Estágio", "CLT", "Jovem Aprendiz"];

const sampleJobs = [
  {
    title: "Estagiário(a) de Administração",
    company: "Empresa de Tecnologia",
    location: "São Paulo, SP",
    type: "Estágio",
    schedule: "6h/dia — Seg a Sex",
    salary: "R$ 1.200,00/mês",
    posted: "Publicada há 2 dias",
  },
  {
    title: "Jovem Aprendiz — Área Administrativa",
    company: "Indústria Nacional",
    location: "Uberlândia, MG",
    type: "Jovem Aprendiz",
    schedule: "4h/dia — Seg a Sex",
    salary: "R$ 800,00/mês",
    posted: "Publicada há 3 dias",
  },
  {
    title: "Assistente de Marketing",
    company: "Agência Digital",
    location: "Ipatinga, MG",
    type: "CLT",
    schedule: "8h/dia — Seg a Sex",
    salary: "R$ 2.500,00/mês",
    posted: "Publicada há 1 dia",
  },
  {
    title: "Estagiário(a) de TI",
    company: "Startup de Software",
    location: "Gov. Valadares, MG",
    type: "Estágio",
    schedule: "6h/dia — Seg a Sex",
    salary: "R$ 1.400,00/mês",
    posted: "Publicada há 4 dias",
  },
  {
    title: "Jovem Aprendiz — Atendimento ao Cliente",
    company: "Rede de Varejo",
    location: "São Paulo, SP",
    type: "Jovem Aprendiz",
    schedule: "4h/dia — Seg a Sex",
    salary: "R$ 750,00/mês",
    posted: "Publicada há 5 dias",
  },
  {
    title: "Estagiário(a) de Recursos Humanos",
    company: "Consultoria Empresarial",
    location: "Uberlândia, MG",
    type: "Estágio",
    schedule: "6h/dia — Seg a Sex",
    salary: "R$ 1.100,00/mês",
    posted: "Publicada há 1 dia",
  },
];

const typeColors: Record<string, string> = {
  "Estágio": "bg-blue-100 text-blue-700",
  "CLT": "bg-green-100 text-green-700",
  "Jovem Aprendiz": "bg-orange-100 text-orange-700",
};

export default function PublicVagasPage() {
  const [activeFilter, setActiveFilter] = useState("Todas");

  const filteredJobs =
    activeFilter === "Todas"
      ? sampleJobs
      : sampleJobs.filter((job) => job.type === activeFilter);

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
            {filteredJobs.map((job) => (
              <div
                key={job.title}
                className="p-6 bg-white rounded-xl border border-slate-200 hover:border-[#FF6B35]/30 hover:shadow-md transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-[#0A2342]">
                        {job.title}
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${typeColors[job.type]}`}
                      >
                        {job.type}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        {job.company}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {job.location}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {job.schedule}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm font-semibold text-[#0A2342]">
                        {job.salary}
                      </span>
                      <span className="text-xs text-slate-400">{job.posted}</span>
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
              </div>
            ))}
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
