import { motion } from "motion/react";
import {
  Building2,
  Search,
  Brain,
  UserCheck,
  Handshake,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Shield,
  Clock,
  TrendingUp,
  Zap,
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
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Publique sua Vaga",
    description: "Descreva o perfil ideal e requisitos da posição que deseja preencher.",
  },
  {
    number: "02",
    icon: Brain,
    title: "Análise com IA",
    description: "Nossa inteligência artificial analisa milhares de perfis para encontrar os melhores candidatos.",
  },
  {
    number: "03",
    icon: UserCheck,
    title: "Curadoria Humana",
    description: "Nossa equipe especializada faz uma seleção criteriosa dos candidatos mais qualificados.",
  },
  {
    number: "04",
    icon: Calendar,
    title: "Entrevistas Agendadas",
    description: "Receba candidatos pré-selecionados e agende entrevistas diretamente pela plataforma.",
  },
  {
    number: "05",
    icon: Handshake,
    title: "Contratação",
    description: "Escolha o candidato ideal. Realizamos toda a documentação e gestão contratual de estagiários e jovens aprendizes.",
  },
];

const benefits = [
  {
    icon: Clock,
    title: "Contratação em Dias",
    description: "Reduza o tempo de contratação de meses para dias com nosso processo otimizado.",
  },
  {
    icon: Shield,
    title: "Conformidade Legal",
    description: "Total conformidade com CLT, Lei do Estágio e Lei do Jovem Aprendiz.",
  },
  {
    icon: Brain,
    title: "IA + Curadoria Humana",
    description: "Combinação de tecnologia e expertise humana para os melhores resultados.",
  },
  {
    icon: TrendingUp,
    title: "Acompanhamento Contínuo",
    description: "Suporte e feedbacks periódicos durante todo o período contratual.",
  },
  {
    icon: Zap,
    title: "Processo Simplificado",
    description: "Uma plataforma única para publicar vagas, selecionar candidatos e gerenciar contratos.",
  },
  {
    icon: Building2,
    title: "Atendimento Regional",
    description: "Presença em São Paulo, Uberlândia, Ipatinga e Governador Valadares.",
  },
];

const hiringTypes = [
  {
    title: "Estágio",
    description: "Contratação de estagiários conforme Lei nº 11.788. Ideal para formar novos talentos.",
    href: "/estagio",
  },
  {
    title: "CLT",
    description: "Apoio no desenvolvimento profissional, análise comportamental e orientação documental.",
    href: "/clt-pcd",
  },
  {
    title: "Jovem Aprendiz",
    description: "Programa de aprendizagem conforme Lei nº 10.097. Formação e desenvolvimento.",
    href: "/jovem-aprendiz",
  },
];

export default function EmpresasPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 overflow-hidden">
        {/* Hero background image */}
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1200&q=80&fit=crop" alt="" className="w-full h-full object-cover" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/92 via-white/85 to-white/95" />
        </div>
        <div className="relative z-10 container mx-auto text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0A2342]/10 text-[#0A2342] mb-6">
              <Building2 className="h-4 w-4" />
              <span className="text-sm font-medium">Soluções para Empresas</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#0A2342] mb-4">
              Contrate os Melhores{" "}
              <span className="text-gradient">Talentos</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-8">
              Combinamos inteligência artificial com curadoria humana para conectar sua empresa
              aos melhores profissionais de estágio, CLT e jovem aprendiz.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Modalidades de Contratação */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={itemVariants}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[#0A2342] mb-4">
              Modalidades de <span className="text-gradient">Contratação</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Oferecemos suporte completo para todas as modalidades de contratação.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={containerVariants}
          >
            {hiringTypes.map((type) => (
              <motion.div key={type.title} variants={itemVariants}>
                <Link href={type.href} className="block h-full">
                  <div className="h-full p-8 rounded-2xl border-2 border-slate-200 bg-white hover:border-[#FF6B35]/30 hover:shadow-lg transition-all cursor-pointer">
                    <h3 className="text-xl font-bold text-[#0A2342] mb-3">
                      {type.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed mb-4">
                      {type.description}
                    </p>
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#FF6B35]">
                      Saiba Mais <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Como Funciona */}
      <section className="py-20 bg-slate-50/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={itemVariants}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[#0A2342] mb-4">
              Como <span className="text-gradient">Funciona</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Um processo simples e eficiente para encontrar o candidato ideal.
            </p>
          </motion.div>

          <motion.div
            className="max-w-3xl mx-auto space-y-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={containerVariants}
          >
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.number}
                  variants={itemVariants}
                  className="flex gap-5 p-6 bg-white rounded-xl border border-slate-200 hover:shadow-md transition-shadow"
                >
                  <div className="w-14 h-14 rounded-full bg-[#0A2342] flex items-center justify-center shrink-0">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-bold text-[#FF6B35]">PASSO {step.number}</span>
                    </div>
                    <h3 className="text-lg font-bold text-[#0A2342] mb-2">
                      {step.title}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={itemVariants}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[#0A2342] mb-4">
              Por que Escolher a <span className="text-gradient">ANEC</span>
            </h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={containerVariants}
          >
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <motion.div
                  key={benefit.title}
                  variants={itemVariants}
                  className="flex gap-4 p-6 rounded-xl border border-slate-200 bg-white"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#0A2342]/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-[#0A2342]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#0A2342] mb-1">
                      {benefit.title}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[#0A2342]">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={itemVariants}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Comece a Contratar Talentos Hoje
            </h2>
            <p className="text-lg text-white/60 max-w-xl mx-auto mb-8">
              Publique sua primeira vaga e receba candidatos pré-selecionados em dias.
            </p>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}
