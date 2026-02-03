import { motion } from "motion/react";
import {
  BookOpen,
  CheckCircle2,
  ArrowRight,
  Clock,
  DollarSign,
  Shield,
  Calendar,
  FileText,
  GraduationCap,
  Building2,
  Users,
  Award,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import PublicLayout from "@/components/landing/PublicLayout";
import ComparisonTable from "@/components/landing/ComparisonTable";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const internRights = [
  {
    icon: DollarSign,
    title: "Bolsa-Auxílio",
    description: "Remuneração mensal compulsória para estágio não obrigatório.",
  },
  {
    icon: Shield,
    title: "Seguro contra Acidentes",
    description: "Seguro de acidentes pessoais obrigatório durante o estágio.",
  },
  {
    icon: Calendar,
    title: "Recesso Remunerado",
    description: "30 dias de recesso a cada 12 meses de estágio, preferencialmente nas férias.",
  },
  {
    icon: Clock,
    title: "Carga Horária Limitada",
    description: "Máximo de 6 horas diárias e 30 horas semanais para ensino superior e técnico.",
  },
  {
    icon: FileText,
    title: "Termo de Compromisso",
    description: "Contrato formal entre estagiário, empresa e instituição de ensino.",
  },
  {
    icon: Award,
    title: "Auxílio-Transporte",
    description: "Auxílio-transporte obrigatório para estágio não obrigatório.",
  },
];

const requirements = [
  "Estar regularmente matriculado em instituição de ensino",
  "Ter Termo de Compromisso de Estágio (TCE) assinado pelas 3 partes",
  "Atividades compatíveis com o curso e horário escolar",
  "Duração máxima de 2 anos na mesma empresa (exceto PCD)",
  "Supervisor na empresa com formação na área do estagiário",
  "Relatório periódico de atividades do estagiário",
];

const companyBenefits = [
  {
    icon: Users,
    title: "Formação de Talentos",
    description: "Forme profissionais alinhados com a cultura e processos da sua empresa.",
  },
  {
    icon: DollarSign,
    title: "Custo Reduzido",
    description: "Sem encargos trabalhistas como FGTS, INSS ou 13º salário.",
  },
  {
    icon: GraduationCap,
    title: "Inovação",
    description: "Jovens trazem novas perspectivas, conhecimentos atualizados e energia.",
  },
  {
    icon: Building2,
    title: "Responsabilidade Social",
    description: "Contribua para a formação profissional e inserção de jovens no mercado.",
  },
];

export default function EstagioPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 overflow-hidden">
        {/* Hero background image */}
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1200&q=80&fit=crop" alt="" className="w-full h-full object-cover" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/92 via-white/85 to-white/95" />
        </div>
        <div className="relative z-10 container mx-auto text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] mb-6">
              <BookOpen className="h-4 w-4" />
              <span className="text-sm font-medium">Lei nº 11.788/2008</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#0A2342] mb-4">
              Programa de <span className="text-gradient">Estágio</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-8">
              Tudo sobre a Lei do Estágio, direitos do estagiário e como a ANEC
              facilita o processo para estudantes e empresas.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login?tab=signup">
                <Button
                  size="lg"
                  className="bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white px-8 rounded-full"
                >
                  Encontre seu Estágio
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/empresas">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-[#0A2342] text-[#0A2342] px-8 rounded-full"
                >
                  Sou Empresa
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* O que diz a Lei */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={itemVariants}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-[#0A2342] mb-6">
                O que diz a Lei do Estágio?
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                A <strong>Lei nº 11.788/2008</strong> regulamenta o estágio no Brasil, definindo-o
                como um ato educativo escolar supervisionado, desenvolvido no ambiente de trabalho.
                O estágio visa à preparação para o trabalho produtivo de estudantes que estejam
                frequentando o ensino regular.
              </p>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                O estágio pode ser <strong>obrigatório</strong> (previsto no projeto pedagógico do
                curso) ou <strong>não obrigatório</strong> (atividade opcional). Em ambos os casos,
                o estagiário possui direitos garantidos por lei.
              </p>
              <p className="text-lg text-slate-600 leading-relaxed">
                A ANEC garante que todos os estágios intermediados estejam em total conformidade
                com a legislação, protegendo estagiários, empresas e instituições de ensino.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Direitos do Estagiário */}
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
              Direitos do <span className="text-gradient">Estagiário</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Conheça todos os direitos garantidos pela Lei nº 11.788.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={containerVariants}
          >
            {internRights.map((right) => {
              const Icon = right.icon;
              return (
                <motion.div
                  key={right.title}
                  variants={itemVariants}
                  className="p-6 rounded-xl border border-slate-200 bg-white"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-[#FF6B35]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#0A2342] mb-2">
                    {right.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {right.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Requisitos */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={itemVariants}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[#0A2342] mb-4">
              Requisitos <span className="text-gradient">Legais</span>
            </h2>
          </motion.div>

          <motion.div
            className="max-w-3xl mx-auto space-y-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={containerVariants}
          >
            {requirements.map((req, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="flex items-start gap-4 p-5 bg-slate-50 rounded-xl border border-slate-200"
              >
                <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0 mt-0.5" />
                <span className="text-slate-700 font-medium">{req}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Para Empresas */}
      <section className="py-20 bg-slate-50/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={itemVariants}
            className="text-center mb-14"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0A2342]/10 text-[#0A2342] mb-6">
              <Building2 className="h-4 w-4" />
              <span className="text-sm font-medium">Para Empresas</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#0A2342] mb-4">
              Benefícios de <span className="text-gradient">Contratar Estagiários</span>
            </h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={containerVariants}
          >
            {companyBenefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <motion.div
                  key={benefit.title}
                  variants={itemVariants}
                  className="flex gap-5 p-6 bg-white rounded-xl border border-slate-200"
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#0A2342] to-[#FF6B35] flex items-center justify-center shrink-0">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#0A2342] mb-2">
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

      {/* Key Stats */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={containerVariants}
          >
            {[
              { value: "30h/sem", label: "Carga Horária Máxima" },
              { value: "Até 2 anos", label: "Duração na Mesma Empresa" },
              { value: "Obrigatório", label: "Seguro de Acidentes" },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                variants={itemVariants}
                className="text-center p-6 rounded-xl bg-[#FF6B35]/5 border border-[#FF6B35]/20"
              >
                <div className="text-2xl md:text-3xl font-bold text-[#0A2342] mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-600">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Comparison Table */}
      <ComparisonTable highlight="estagio" />

      {/* Government Link */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto p-6 rounded-xl border-2 border-[#0A2342]/10 bg-[#0A2342]/5 text-center">
            <p className="text-sm text-slate-600 mb-3">Consulte a legislação oficial:</p>
            <a
              href="https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2008/lei/l11788.htm"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#0A2342] font-semibold hover:text-[#FF6B35] transition-colors"
            >
              Lei nº 11.788/2008 — Planalto.gov.br
              <ArrowRight className="h-4 w-4" />
            </a>
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
              Encontre seu Estágio Ideal
            </h2>
            <p className="text-lg text-white/60 max-w-xl mx-auto mb-8">
              Cadastre-se gratuitamente e seja conectado com as melhores
              oportunidades de estágio na sua região.
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
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}
