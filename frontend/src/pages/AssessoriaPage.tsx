import { motion } from "motion/react";
import {
  Compass,
  Users,
  TrendingUp,
  Target,
  MessageCircle,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Building2,
  School,
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

const services = [
  {
    icon: Target,
    title: "Orientação de Carreira",
    description:
      "Ajudamos jovens a identificar suas habilidades, interesses e objetivos profissionais, traçando um plano de carreira personalizado.",
  },
  {
    icon: BarChart3,
    title: "Análise de Perfil Comportamental",
    description:
      "Utilizamos metodologias como DISC e PDP para identificar competências, pontos fortes e áreas de desenvolvimento.",
  },
  {
    icon: MessageCircle,
    title: "Mentoria Profissional",
    description:
      "Acompanhamento individual com feedbacks periódicos para garantir o desenvolvimento contínuo do profissional.",
  },
  {
    icon: TrendingUp,
    title: "Plano de Desenvolvimento Individual",
    description:
      "Criamos planos personalizados de crescimento profissional com metas e acompanhamento de resultados.",
  },
  {
    icon: Users,
    title: "Preparação para o Mercado",
    description:
      "Treinamentos em elaboração de currículo, postura profissional, comunicação e preparação para entrevistas.",
  },
  {
    icon: Compass,
    title: "Recolocação Profissional",
    description:
      "Suporte completo para profissionais em transição de carreira, com mapeamento de oportunidades e networking.",
  },
];

const audiences = [
  {
    icon: GraduationCap,
    title: "Para Candidatos",
    items: [
      "Orientação vocacional e de carreira",
      "Preparação para entrevistas",
      "Desenvolvimento de competências",
      "Acompanhamento durante o contrato",
    ],
  },
  {
    icon: Building2,
    title: "Para Empresas",
    items: [
      "Consultoria em recrutamento e seleção",
      "Análise de perfil ideal para vagas",
      "Gestão de desempenho de contratados",
      "Relatórios de acompanhamento",
    ],
  },
  {
    icon: School,
    title: "Para Instituições",
    items: [
      "Programa de empregabilidade para alunos",
      "Parcerias para inserção no mercado",
      "Palestras e workshops de carreira",
      "Encaminhamento para vagas",
    ],
  },
];

export default function AssessoriaPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 overflow-hidden">
        {/* Hero background image */}
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1200&q=80&fit=crop" alt="" className="w-full h-full object-cover" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/92 via-white/85 to-white/95" />
        </div>
        <div className="relative z-10 container mx-auto text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] mb-6">
              <Compass className="h-4 w-4" />
              <span className="text-sm font-medium">Assessoria de Carreira</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#0A2342] mb-4">
              Assessoria <span className="text-gradient">Profissional</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-8">
              Orientação especializada para candidatos, empresas e instituições de ensino.
              Desenvolvemos talentos e construímos carreiras de sucesso.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Serviços */}
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
              Nossos Serviços de <span className="text-gradient">Assessoria</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Soluções completas para o desenvolvimento profissional em todas as etapas da carreira.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={containerVariants}
          >
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <motion.div
                  key={service.title}
                  variants={itemVariants}
                  className="p-6 rounded-xl border border-slate-200 bg-white hover:shadow-md transition-shadow"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#0A2342] flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-[#0A2342] mb-2">
                    {service.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {service.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Para Quem */}
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
              Para <span className="text-gradient">Quem</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Nossa assessoria é personalizada para atender diferentes perfis e necessidades.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={containerVariants}
          >
            {audiences.map((audience) => {
              const Icon = audience.icon;
              return (
                <motion.div
                  key={audience.title}
                  variants={itemVariants}
                  className="p-8 rounded-2xl bg-white border-2 border-slate-200"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#0A2342]/10 flex items-center justify-center mb-6">
                    <Icon className="h-6 w-6 text-[#0A2342]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#0A2342] mb-4">
                    {audience.title}
                  </h3>
                  <ul className="space-y-3">
                    {audience.items.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-slate-600 text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Instituições — Expanded Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={itemVariants}
              className="text-center mb-14"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] mb-6">
                <School className="h-4 w-4" />
                <span className="text-sm font-medium">Para Instituições de Ensino</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-[#0A2342] mb-4">
                Parceria que <span className="text-gradient">Transforma Alunos</span> em Profissionais
              </h2>
              <p className="text-lg text-slate-600 max-w-3xl mx-auto">
                A ANEC conecta instituições de ensino ao mercado de trabalho, aumentando a
                empregabilidade dos seus alunos e fortalecendo a reputação da sua instituição.
              </p>
            </motion.div>

            {/* How it works for institutions */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              variants={containerVariants}
            >
              <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl">
                <img
                  src="https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&q=80&fit=crop"
                  alt="Instituição de ensino"
                  className="w-full h-72 object-cover rounded-2xl"
                  loading="lazy"
                />
              </motion.div>
              <motion.div variants={itemVariants} className="flex flex-col justify-center">
                <h3 className="text-2xl font-bold text-[#0A2342] mb-4">
                  Como funciona a parceria?
                </h3>
                <p className="text-slate-600 leading-relaxed mb-6">
                  Estabelecemos uma parceria direta com sua instituição para identificar e
                  encaminhar alunos para oportunidades de estágio, jovem aprendiz e CLT.
                  Oferecemos workshops de carreira, preparação para entrevistas e acompanhamento
                  contínuo durante todo o período contratual.
                </p>
                <div className="space-y-3">
                  {[
                    "Mapeamento de perfis e competências dos alunos",
                    "Conexão direta com empresas parceiras da região",
                    "Workshops e palestras sobre mercado de trabalho",
                    "Relatórios de empregabilidade para a instituição",
                    "Acompanhamento dos alunos durante o contrato",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-slate-600 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>

            {/* Institution metrics */}
            <motion.div
              className="grid grid-cols-3 gap-6 mb-12"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={containerVariants}
            >
              {[
                { value: "400+", label: "Alunos Encaminhados" },
                { value: "85%", label: "Taxa de Colocação" },
                { value: "4", label: "Regiões Atendidas" },
              ].map((stat) => (
                <motion.div
                  key={stat.label}
                  variants={itemVariants}
                  className="text-center p-5 rounded-xl bg-[#0A2342]/5 border border-[#0A2342]/10"
                >
                  <div className="text-2xl font-bold text-[#0A2342] mb-1">{stat.value}</div>
                  <div className="text-xs text-slate-600">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>

            {/* Institution CTA */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={itemVariants}
              className="text-center p-8 rounded-2xl bg-gradient-to-br from-[#0A2342] to-[#0A2342]/90"
            >
              <h3 className="text-2xl font-bold text-white mb-3">
                Torne-se uma Instituição Parceira
              </h3>
              <p className="text-white/60 max-w-lg mx-auto mb-6">
                Aumente a empregabilidade dos seus alunos e fortaleça o relacionamento
                da sua instituição com o mercado de trabalho.
              </p>
            </motion.div>
          </div>
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
              Transforme sua Carreira com a ANEC
            </h2>
            <p className="text-lg text-white/60 max-w-xl mx-auto mb-8">
              Entre em contato e descubra como nossa assessoria pode impulsionar
              seus resultados profissionais.
            </p>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}
