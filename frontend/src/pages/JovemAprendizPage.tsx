import { motion } from "motion/react";
import {
  GraduationCap,
  CheckCircle2,
  BookOpen,
  Clock,
  DollarSign,
  Shield,
  Heart,
  ArrowRight,
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

const requirements = [
  "Idade entre 14 e 24 anos",
  "Estar matriculado e frequentando a escola (se não concluiu o Ensino Médio)",
  "Estar inscrito em programa de aprendizagem",
  "Contrato de trabalho especial com prazo determinado de até 2 anos",
];

const benefits = [
  {
    icon: DollarSign,
    title: "Remuneração",
    description: "Salário mínimo-hora ou condição mais favorável prevista em contrato.",
  },
  {
    icon: Clock,
    title: "Jornada Reduzida",
    description: "Máximo de 6 horas diárias para quem não completou o Ensino Fundamental.",
  },
  {
    icon: Shield,
    title: "FGTS",
    description: "Depósito de 2% do salário no Fundo de Garantia por Tempo de Serviço.",
  },
  {
    icon: BookOpen,
    title: "Formação Profissional",
    description: "Capacitação teórica e prática, combinando aprendizado e experiência.",
  },
  {
    icon: Heart,
    title: "13º Salário e Férias",
    description: "Direito ao 13º salário e férias coincidentes com as férias escolares.",
  },
  {
    icon: Award,
    title: "Certificado",
    description: "Certificado de qualificação profissional ao concluir o programa.",
  },
];

const steps = [
  {
    number: "01",
    title: "Cadastre-se na ANEC",
    description: "Crie seu perfil gratuitamente na plataforma com suas informações e interesses.",
  },
  {
    number: "02",
    title: "Avaliação de Perfil",
    description: "Nossa equipe avalia seu perfil e identifica as melhores oportunidades para você.",
  },
  {
    number: "03",
    title: "Conexão com Empresas",
    description: "Conectamos você com empresas parceiras que possuem vagas de jovem aprendiz.",
  },
  {
    number: "04",
    title: "Acompanhamento",
    description: "Oferecemos suporte contínuo durante todo o período de aprendizagem.",
  },
];

export default function JovemAprendizPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 overflow-hidden">
        {/* Hero background image */}
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1529390079861-591de354faf5?w=1200&q=80&fit=crop" alt="" className="w-full h-full object-cover" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/92 via-white/85 to-white/95" />
        </div>
        <div className="relative z-10 container mx-auto text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] mb-6">
              <GraduationCap className="h-4 w-4" />
              <span className="text-sm font-medium">Lei nº 10.097/2000</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#0A2342] mb-4">
              Programa <span className="text-gradient">Jovem Aprendiz</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-8">
              Inicie sua carreira profissional com formação, remuneração e todos os direitos
              garantidos pela legislação brasileira.
            </p>
            <Link href="/login?tab=signup">
              <Button
                size="lg"
                className="bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white px-8 rounded-full"
              >
                Cadastre-se Gratuitamente
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* O que é */}
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
                O que é o Programa Jovem Aprendiz?
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                O Programa Jovem Aprendiz, regulamentado pela <strong>Lei nº 10.097/2000</strong>,
                é uma iniciativa do governo brasileiro que visa inserir jovens no mercado de trabalho,
                proporcionando formação técnico-profissional. Empresas de médio e grande porte são
                obrigadas a contratar aprendizes em número equivalente a 5% a 15% do total de
                empregados cujas funções demandam formação profissional.
              </p>
              <p className="text-lg text-slate-600 leading-relaxed">
                O programa combina aprendizado teórico (em sala de aula) com experiência prática
                (na empresa), permitindo que o jovem desenvolva competências profissionais enquanto
                mantém seus estudos.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Requisitos */}
      <section className="py-20 bg-slate-50/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={itemVariants}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[#0A2342] mb-4">
              Requisitos para <span className="text-gradient">Participar</span>
            </h2>
          </motion.div>

          <motion.div
            className="max-w-2xl mx-auto space-y-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={containerVariants}
          >
            {requirements.map((req, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="flex items-start gap-4 p-5 bg-white rounded-xl border border-slate-200"
              >
                <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0 mt-0.5" />
                <span className="text-slate-700 font-medium">{req}</span>
              </motion.div>
            ))}
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
              Benefícios do <span className="text-gradient">Programa</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              O jovem aprendiz tem todos os direitos trabalhistas garantidos por lei.
            </p>
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
                  className="p-6 rounded-xl border border-slate-200 bg-white hover:shadow-md transition-shadow"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-[#FF6B35]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#0A2342] mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {benefit.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Como a ANEC Ajuda */}
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
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">Como Funciona</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#0A2342] mb-4">
              Como a ANEC <span className="text-gradient">Ajuda Você</span>
            </h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={containerVariants}
          >
            {steps.map((step) => (
              <motion.div
                key={step.number}
                variants={itemVariants}
                className="flex gap-5 p-6 bg-white rounded-xl border border-slate-200"
              >
                <div className="w-12 h-12 rounded-full bg-[#0A2342] flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-sm">{step.number}</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0A2342] mb-2">
                    {step.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
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
              { value: "14 a 24", label: "Faixa Etária (anos)" },
              { value: "5% a 15%", label: "Cota Obrigatória" },
              { value: "Até 2 anos", label: "Duração do Contrato" },
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
      <ComparisonTable highlight="aprendiz" />

      {/* Government Link */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto p-6 rounded-xl border-2 border-[#0A2342]/10 bg-[#0A2342]/5 text-center">
            <p className="text-sm text-slate-600 mb-3">Consulte a legislação oficial:</p>
            <a
              href="https://www.planalto.gov.br/ccivil_03/leis/l10097.htm"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#0A2342] font-semibold hover:text-[#FF6B35] transition-colors"
            >
              Lei nº 10.097/2000 — Planalto.gov.br
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
              Comece sua Carreira Hoje
            </h2>
            <p className="text-lg text-white/60 max-w-xl mx-auto mb-8">
              Cadastre-se gratuitamente e descubra as melhores oportunidades de jovem
              aprendiz perto de você.
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
