import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles,
  Users,
  FileText,
  CheckCircle2,
  ArrowRight,
  Search,
  Brain,
  Calendar,
  Handshake,
  UserCheck,
} from "lucide-react";
import { Link } from "wouter";
import TestimonialsSection from "./TestimonialsSection";
import RegionsSection from "./RegionsSection";
import InstitutionsSection from "./InstitutionsSection";
import TrustBadgesSection from "./TrustBadgesSection";
import FAQSection from "./FAQSection";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Scroll-triggered fly-in animation for step cards (with fade out on exit)
const getStepCardVariants = (index: number) => ({
  hidden: {
    opacity: 0,
    x: index % 2 === 0 ? -120 : 120,
    y: 20,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 80,
      damping: 15,
      delay: index * 0.12,
    },
  },
  exit: {
    opacity: 0,
    y: -30,
    scale: 0.95,
    transition: {
      duration: 0.3,
      ease: "easeOut" as const,
    },
  },
});

export default function CompanyContent() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, y: -20 }}
      variants={containerVariants}
    >
      {/* AI Matching Section */}
      <section id="como-funciona" className="py-20 bg-slate-50/50 scroll-mt-20">
        <div className="container mx-auto px-4">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0A2342]/10 text-[#0A2342] mb-6">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Tecnologia de Ponta</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Como a <span className="text-gradient">ANEC RG</span> Conecta Você
              aos Melhores Talentos
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Processo integrado que facilita o encontro entre sua empresa e
              profissionais qualificados em todo o Brasil
            </p>
          </motion.div>

          <div className="grid md:grid-cols-5 gap-4 max-w-6xl mx-auto overflow-hidden">
            {[
              {
                step: "1",
                icon: FileText,
                title: "Publique sua Vaga",
                description:
                  "Descreva os requisitos e o perfil ideal do candidato",
              },
              {
                step: "2",
                icon: Brain,
                title: "IA Analisa",
                description:
                  "Algoritmos inteligentes buscam em nosso banco de talentos",
              },
              {
                step: "3",
                icon: UserCheck,
                title: "Pré-Seleção Humana",
                description:
                  "Nossa equipe faz a curadoria dos melhores candidatos",
              },
              {
                step: "4",
                icon: Users,
                title: "Receba Candidatos",
                description:
                  "Apresentamos os candidatos mais compatíveis com sua vaga",
              },
              {
                step: "5",
                icon: Handshake,
                title: "Contrate",
                description:
                  "Agende entrevistas e finalize a contratação conosco",
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial="hidden"
                whileInView="visible"
                exit="exit"
                viewport={{ amount: 0.2, margin: "-100px" }}
                variants={getStepCardVariants(index)}
                className="relative"
              >
                <Card className="h-full border-2 border-slate-200 hover:border-[#0A2342]/50 transition-colors">
                  <CardContent className="p-6 text-center">
                    <div className="relative mx-auto mb-4">
                      <div className="h-16 w-16 rounded-2xl bg-[#0A2342] flex items-center justify-center mx-auto shadow-lg">
                        <item.icon className="h-8 w-8 text-white" />
                      </div>
                      <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-slate-900 text-white text-sm font-bold flex items-center justify-center">
                        {item.step}
                      </div>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-600">{item.description}</p>
                  </CardContent>
                </Card>
                {index < 4 && (
                  <motion.div
                    className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ amount: 0.2 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    <ArrowRight className="h-6 w-6 text-slate-300" />
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="planos" className="py-20 scroll-mt-20">
        <div className="container mx-auto px-4">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Planos <span className="text-gradient">Transparentes</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Captamos candidatos para Estágios, Menor Aprendiz e CLT
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                type: "Estágio",
                description: "Contratos de estágio para estudantes",
                features: [
                  "Match com IA",
                  "Gestão de contratos",
                  "Seguro de vida",
                  "Feedbacks mensais",
                  "Suporte dedicado",
                  "Conformidade legal",
                  "Desenvolvimento pessoal e profissional",
                ],
                color: "bg-[#FF6B35]",
              },
              {
                type: "CLT",
                description: "Taxa única por contrato ativo",
                features: [
                  "Match com IA",
                  "Plano de Desenvolvimento Profissional (PDP)",
                  "Análise do perfil comportamental",
                  "Gestão de contratos",
                  "Feedbacks mensais",
                  "Suporte prioritário",
                  "Analytics avançado",
                ],
                color: "bg-[#0A2342]",
              },
              {
                type: "Menor Aprendiz",
                description: "Programa jovem aprendiz",
                features: [
                  "Match com IA",
                  "Gestão de contratos",
                  "Seguro de vida",
                  "Feedbacks mensais",
                  "Desenvolvimento pessoal e profissional",
                ],
                color: "bg-[#FF6B35]",
              },
            ].map((plan, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card
                  className="relative h-full border-2 border-slate-200"
                >
                  <CardContent className="p-6">
                    <div
                      className={`h-12 w-12 rounded-xl ${plan.color} flex items-center justify-center mb-4`}
                    >
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-1">
                      {plan.type}
                    </h3>
                    <p className="text-sm text-slate-600 mb-6">
                      {plan.description}
                    </p>
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-[#FF6B35] flex-shrink-0" />
                          <span className="text-slate-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-slate-50/50">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <motion.div variants={itemVariants}>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                Por que Empresas <span className="text-gradient">Confiam</span>{" "}
                na ANEC RG
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                Somos uma agência integradora nacional, conectando sua empresa
                aos melhores profissionais com credibilidade e eficiência
              </p>

              <div className="space-y-4">
                {[
                  "Conexão direta com talentos qualificados em todo o Brasil",
                  "Integração completa entre sua empresa e candidatos",
                  "Gestão profissional de contratos e documentação",
                  "Acompanhamento contínuo do desenvolvimento",
                  "Conformidade legal e trabalhista garantida",
                  "Suporte dedicado da nossa equipe nacional",
                ].map((benefit, index) => (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle2 className="h-6 w-6 text-[#FF6B35] flex-shrink-0 mt-0.5" />
                    <span className="text-lg text-slate-700">{benefit}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="relative"
            >
              <div className="bg-white rounded-2xl border-2 border-slate-200 p-8 shadow-xl">
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-[#FF6B35]/10 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-[#FF6B35] flex items-center justify-center">
                        <Search className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">
                          Vagas Preenchidas
                        </div>
                        <div className="text-sm text-slate-600">Este mês</div>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-[#FF6B35]">
                      +47
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[#0A2342]/10 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-[#0A2342] flex items-center justify-center">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">
                          Candidatos Ativos
                        </div>
                        <div className="text-sm text-slate-600">
                          Na plataforma
                        </div>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-[#0A2342]">
                      6,000+
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[#FF6B35]/10 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-[#FF6B35] flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">
                          Tempo Médio
                        </div>
                        <div className="text-sm text-slate-600">
                          Para contratar
                        </div>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-[#FF6B35]">
                      5 dias
                    </span>
                  </div>
                </div>
              </div>
              <div className="absolute -inset-4 bg-gradient-to-r from-[#0A2342]/20 to-[#FF6B35]/20 rounded-3xl blur-2xl -z-10" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Badges Section */}
      <TrustBadgesSection />

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* Regions Section */}
      <RegionsSection />

      {/* FAQ Section */}
      <FAQSection />

      {/* Institutions Section */}
      <InstitutionsSection />

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            variants={itemVariants}
            className="relative overflow-hidden rounded-3xl bg-[#0A2342] p-12 md:p-16 text-center"
          >
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Comece a Contratar Talentos Hoje
              </h2>
              <p className="text-white/90 text-lg mb-4 max-w-2xl mx-auto">
                Junte-se a mais de 500 empresas que já encontraram os melhores
                profissionais através da ANEC RG
              </p>
              <p className="text-white/60 text-sm mb-8">
                Sem compromisso inicial • Suporte dedicado • Resultados em dias
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/login?tab=signup&role=company">
                  <Button
                    size="lg"
                    className="text-lg px-8 py-6 bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white"
                  >
                    Publicar Minha Primeira Vaga
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 py-6 bg-transparent border-white text-white hover:bg-white/10"
                >
                  Agendar Demonstração
                </Button>
              </div>
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.08),transparent_40%)]" />
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
}
