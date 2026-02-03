import { motion } from "motion/react";
import {
  Scale,
  Shield,
  CheckCircle2,
  ArrowRight,
  Heart,
  DollarSign,
  Clock,
  Umbrella,
  Users,
  Accessibility,
  Building2,
  FileText,
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

const cltRights = [
  {
    icon: DollarSign,
    title: "Salário e 13º",
    description: "Remuneração mensal e 13º salário garantidos por lei.",
  },
  {
    icon: Umbrella,
    title: "Férias Remuneradas",
    description: "30 dias de férias anuais com adicional de 1/3.",
  },
  {
    icon: Shield,
    title: "FGTS",
    description: "Depósito mensal de 8% do salário no Fundo de Garantia.",
  },
  {
    icon: Heart,
    title: "Previdência Social",
    description: "Contribuição ao INSS para aposentadoria e benefícios.",
  },
  {
    icon: Clock,
    title: "Jornada Regulamentada",
    description: "Máximo de 44 horas semanais com horas extras remuneradas.",
  },
  {
    icon: FileText,
    title: "Seguro-Desemprego",
    description: "Direito ao seguro em caso de demissão sem justa causa.",
  },
];

const pcdInfo = [
  "Empresas com 100+ funcionários devem reservar de 2% a 5% das vagas para PCD",
  "Adaptação do ambiente de trabalho às necessidades do trabalhador",
  "Proibição de discriminação no processo seletivo e no trabalho",
  "Jornada flexível quando necessário para tratamento médico",
  "Estabilidade no emprego conforme legislação específica",
  "Direito à acessibilidade em todas as dependências da empresa",
];

const compliancePoints = [
  {
    icon: FileText,
    title: "Gestão Contratual",
    description: "Elaboração e gestão de contratos CLT com total conformidade legal.",
  },
  {
    icon: Scale,
    title: "Conformidade Trabalhista",
    description: "Garantimos que todos os direitos trabalhistas sejam respeitados.",
  },
  {
    icon: Users,
    title: "Inclusão PCD",
    description: "Assessoria para cumprimento de cotas e adaptação do ambiente de trabalho.",
  },
  {
    icon: Building2,
    title: "Suporte às Empresas",
    description: "Orientação completa sobre obrigações legais e melhores práticas.",
  },
];

export default function CltPcdPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 overflow-hidden">
        {/* Hero background image */}
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=1200&q=80&fit=crop" alt="" className="w-full h-full object-cover" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/92 via-white/85 to-white/95" />
        </div>
        <div className="relative z-10 container mx-auto text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0A2342]/10 text-[#0A2342] mb-6">
              <Scale className="h-4 w-4" />
              <span className="text-sm font-medium">Decreto-Lei nº 5.452 &middot; Lei nº 8.213/91</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#0A2342] mb-4">
              CLT e <span className="text-gradient">PCD</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-8">
              Tudo sobre contratação formal e inclusão de pessoas com deficiência.
              Conformidade total com a legislação trabalhista brasileira.
            </p>
            <Link href="/login?tab=signup">
              <Button
                size="lg"
                className="bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white px-8 rounded-full"
              >
                Fale com Nossa Equipe
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* CLT - O que é */}
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
                Contratação CLT
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                A <strong>Consolidação das Leis do Trabalho (CLT)</strong>, estabelecida pelo
                Decreto-Lei nº 5.452 de 1943, é o principal instrumento de regulamentação das
                relações de trabalho no Brasil. Ela garante direitos fundamentais aos trabalhadores
                e estabelece obrigações para empregadores.
              </p>
              <p className="text-lg text-slate-600 leading-relaxed">
                A ANEC atua como agente facilitador, garantindo que todos os contratos CLT
                estejam em total conformidade com a legislação, protegendo tanto o trabalhador
                quanto a empresa.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Direitos CLT */}
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
              Direitos do <span className="text-gradient">Trabalhador CLT</span>
            </h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={containerVariants}
          >
            {cltRights.map((right) => {
              const Icon = right.icon;
              return (
                <motion.div
                  key={right.title}
                  variants={itemVariants}
                  className="p-6 rounded-xl border border-slate-200 bg-white"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#0A2342]/10 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-[#0A2342]" />
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

      {/* PCD */}
      <section className="py-20 bg-[#0A2342] text-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={itemVariants}
            className="text-center mb-14"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/80 mb-6">
              <Accessibility className="h-4 w-4" />
              <span className="text-sm font-medium">Lei nº 8.213/91</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Inclusão <span className="text-[#FF6B35]">PCD</span>
            </h2>
            <p className="text-lg text-white/60 max-w-3xl mx-auto">
              A Lei nº 8.213/91 estabelece a obrigatoriedade de contratação de pessoas com
              deficiência por empresas com 100 ou mais funcionários. A ANEC auxilia empresas
              no cumprimento dessa legislação e na promoção de um ambiente inclusivo.
            </p>
          </motion.div>

          <motion.div
            className="max-w-3xl mx-auto space-y-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={containerVariants}
          >
            {pcdInfo.map((info, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="flex items-start gap-4 p-5 bg-white/5 rounded-xl border border-white/10"
              >
                <CheckCircle2 className="h-6 w-6 text-[#FF6B35] shrink-0 mt-0.5" />
                <span className="text-white/80">{info}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Como a ANEC Garante Conformidade */}
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
              Como Garantimos <span className="text-gradient">Conformidade</span>
            </h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={containerVariants}
          >
            {compliancePoints.map((point) => {
              const Icon = point.icon;
              return (
                <motion.div
                  key={point.title}
                  variants={itemVariants}
                  className="flex gap-5 p-6 bg-slate-50 rounded-xl border border-slate-200"
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#0A2342] to-[#FF6B35] flex items-center justify-center shrink-0">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#0A2342] mb-2">
                      {point.title}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {point.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Key Stats */}
      <section className="py-16 bg-slate-50/50">
        <div className="container mx-auto px-4">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={containerVariants}
          >
            {[
              { value: "44h", label: "Jornada Semanal Máx." },
              { value: "8%", label: "FGTS Mensal" },
              { value: "30 dias", label: "Férias Anuais" },
              { value: "2% a 5%", label: "Cotas PCD" },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                variants={itemVariants}
                className="text-center p-6 rounded-xl bg-white border border-slate-200"
              >
                <div className="text-2xl md:text-3xl font-bold text-[#0A2342] mb-1">
                  {stat.value}
                </div>
                <div className="text-xs text-slate-600">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Comparison Table */}
      <ComparisonTable highlight="clt" />

      {/* Government Links */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="p-5 rounded-xl border-2 border-[#0A2342]/10 bg-[#0A2342]/5 text-center">
              <p className="text-xs text-slate-500 mb-2">Legislação CLT:</p>
              <a
                href="https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-[#0A2342] font-semibold hover:text-[#FF6B35] transition-colors"
              >
                Decreto-Lei nº 5.452/1943 — Planalto.gov.br
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className="p-5 rounded-xl border-2 border-[#0A2342]/10 bg-[#0A2342]/5 text-center">
              <p className="text-xs text-slate-500 mb-2">Legislação PCD:</p>
              <a
                href="https://www.planalto.gov.br/ccivil_03/leis/l8213cons.htm"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-[#0A2342] font-semibold hover:text-[#FF6B35] transition-colors"
              >
                Lei nº 8.213/1991 — Planalto.gov.br
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
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
              Precisa de Suporte em CLT ou Inclusão PCD?
            </h2>
            <p className="text-lg text-slate-600 max-w-xl mx-auto mb-8">
              Nossa equipe está pronta para orientar sua empresa sobre conformidade
              trabalhista e inclusão.
            </p>
            <Link href="/login?tab=signup">
              <Button
                size="lg"
                className="bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white px-8 rounded-full"
              >
                Fale com Nossa Equipe
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}
