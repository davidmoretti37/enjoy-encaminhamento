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
} from "lucide-react";
import { Link } from "wouter";

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
      <section className="py-20 bg-slate-50/50">
        <div className="container mx-auto px-4">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 mb-6">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Tecnologia de Ponta</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Como Nossa <span className="text-gradient">IA</span> Encontra os
              Melhores Candidatos
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Processo automatizado e inteligente que economiza seu tempo e
              garante qualidade
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto overflow-hidden">
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
                icon: Users,
                title: "Receba Candidatos",
                description:
                  "Apresentamos os candidatos mais compatíveis com sua vaga",
              },
              {
                step: "4",
                icon: Handshake,
                title: "Contrate",
                description:
                  "Agende entrevistas e finalize a contratacao conosco",
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
                <Card className="h-full border-2 border-slate-200 hover:border-blue-300 transition-colors">
                  <CardContent className="p-6 text-center">
                    <div className="relative mx-auto mb-4">
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto shadow-lg">
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
                {index < 3 && (
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
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Planos <span className="text-gradient">Transparentes</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Taxa mensal por contrato ativo. Sem surpresas, sem custos ocultos.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                type: "Estagio",
                description: "Contratos de estagio para estudantes",
                features: [
                  "Matching com IA",
                  "Gestao de contratos",
                  "Feedbacks mensais",
                  "Suporte dedicado",
                ],
                color: "from-emerald-500 to-teal-600",
              },
              {
                type: "CLT",
                description: "Contratos de trabalho permanente",
                features: [
                  "Matching com IA",
                  "Gestao de contratos",
                  "Feedbacks mensais",
                  "Suporte prioritario",
                  "Analytics avancado",
                ],
                color: "from-blue-500 to-indigo-600",
                popular: true,
              },
              {
                type: "Menor Aprendiz",
                description: "Programa jovem aprendiz",
                features: [
                  "Matching com IA",
                  "Gestao de contratos",
                  "Feedbacks mensais",
                  "Conformidade legal",
                ],
                color: "from-violet-500 to-purple-600",
              },
            ].map((plan, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card
                  className={`relative h-full border-2 ${
                    plan.popular
                      ? "border-blue-500 shadow-xl"
                      : "border-slate-200"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                        Mais Popular
                      </span>
                    </div>
                  )}
                  <CardContent className="p-6">
                    <div
                      className={`h-12 w-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4`}
                    >
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-1">
                      {plan.type}
                    </h3>
                    <p className="text-sm text-slate-600 mb-6">
                      {plan.description}
                    </p>
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          <span className="text-slate-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-slate-500 text-center">
                      Taxa mensal por contrato ativo
                    </p>
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
                em Nos
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                Transforme seu processo de recrutamento com tecnologia de ponta
                e suporte especializado
              </p>

              <div className="space-y-4">
                {[
                  "Reduza tempo de contratacao em ate 70%",
                  "Matching preciso com IA avancada",
                  "Gestao completa de contratos e pagamentos",
                  "Feedbacks automatizados mensais",
                  "Conformidade legal garantida",
                  "Suporte dedicado e treinamento",
                ].map((benefit, index) => (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 flex-shrink-0 mt-0.5" />
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
                  <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-500 flex items-center justify-center">
                        <Search className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">
                          Vagas Preenchidas
                        </div>
                        <div className="text-sm text-slate-600">Este mes</div>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-emerald-600">
                      +47
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
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
                    <span className="text-2xl font-bold text-blue-600">
                      1,247
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-violet-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-violet-500 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">
                          Tempo Medio
                        </div>
                        <div className="text-sm text-slate-600">
                          Para contratar
                        </div>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-violet-600">
                      5 dias
                    </span>
                  </div>
                </div>
              </div>
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-3xl blur-2xl -z-10" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            variants={itemVariants}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 p-12 md:p-16 text-center"
          >
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Pronto para encontrar os melhores talentos?
              </h2>
              <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
                Junte-se a centenas de empresas que ja transformaram seu
                processo de contratacao
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/login?tab=signup&role=company">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="text-lg px-8 py-6"
                  >
                    Cadastrar Empresa
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 py-6 bg-transparent border-white text-white hover:bg-white/10"
                >
                  Falar com Consultor
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
