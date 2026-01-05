import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  ArrowRight,
  UserPlus,
  Brain,
  Bell,
  Trophy,
  Briefcase,
  Clock,
  Shield,
  Sparkles,
  Gift,
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

export default function CandidateContent() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, y: -20 }}
      variants={containerVariants}
    >
      {/* How It Works Section */}
      <section className="py-20 bg-[#FF6B35]/5">
        <div className="container mx-auto px-4">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] mb-6">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Simples e Gratuito</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Como a <span className="text-gradient">ANEC</span> Impulsiona Sua Carreira
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Cadastre-se gratuitamente e conecte-se com oportunidades de emprego
              em empresas parceiras em todo o Brasil
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto overflow-hidden">
            {[
              {
                step: "1",
                icon: UserPlus,
                title: "Cadastre seu Perfil",
                description:
                  "Complete suas informações, habilidades e objetivos de carreira",
              },
              {
                step: "2",
                icon: Brain,
                title: "ANEC Conecta Você",
                description:
                  "Nosso sistema integra seu perfil com oportunidades ideais",
              },
              {
                step: "3",
                icon: Bell,
                title: "Seja Descoberto",
                description:
                  "Empresas parceiras visualizam seu perfil e iniciam contato",
              },
              {
                step: "4",
                icon: Trophy,
                title: "Construa sua Carreira",
                description:
                  "Desenvolva-se profissionalmente com nosso acompanhamento",
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
                <Card className="h-full border-2 border-slate-200 hover:border-[#FF6B35]/50 transition-colors">
                  <CardContent className="p-6 text-center">
                    <div className="relative mx-auto mb-4">
                      <div className="h-16 w-16 rounded-2xl bg-[#FF6B35] flex items-center justify-center mx-auto shadow-lg">
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

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <motion.div variants={itemVariants} className="order-2 lg:order-1">
              <div className="bg-white rounded-2xl border-2 border-slate-200 p-8 shadow-xl">
                {/* Free badge */}
                <div className="flex items-center justify-center mb-8">
                  <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#FF6B35] text-white">
                    <Gift className="h-5 w-5" />
                    <span className="font-bold text-lg">100% Gratuito</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      icon: Briefcase,
                      title: "Vagas Exclusivas",
                      description: "Acesso a oportunidades de empresas parceiras",
                    },
                    {
                      icon: Brain,
                      title: "Matching Inteligente",
                      description: "IA combina seu perfil com vagas ideais",
                    },
                    {
                      icon: Clock,
                      title: "Acompanhamento em Tempo Real",
                      description: "Saiba o status de cada candidatura",
                    },
                    {
                      icon: Shield,
                      title: "Dados Protegidos",
                      description: "Suas informações em segurança",
                    },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <div className="h-10 w-10 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center flex-shrink-0">
                        <item.icon className="h-5 w-5 text-[#FF6B35]" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">
                          {item.title}
                        </h4>
                        <p className="text-sm text-slate-600">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -inset-4 bg-gradient-to-r from-[#FF6B35]/20 to-[#FF6B35]/10 rounded-3xl blur-2xl -z-10" />
            </motion.div>

            <motion.div variants={itemVariants} className="order-1 lg:order-2">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                Sua Carreira <span className="text-gradient">Começa Aqui</span>
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                A ANEC conecta você com oportunidades de crescimento profissional
                em empresas de todo o Brasil
              </p>

              <div className="space-y-4">
                {[
                  "Conexão direta com empresas parceiras em âmbito nacional",
                  "Oportunidades alinhadas ao seu perfil e objetivos",
                  "Acompanhamento do seu desenvolvimento profissional",
                  "Suporte para construir uma carreira sólida",
                  "100% gratuito para candidatos",
                  "Integração completa durante todo o processo",
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
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#FF6B35]/5">
        <div className="container mx-auto px-4">
          <motion.div
            variants={itemVariants}
            className="relative overflow-hidden rounded-3xl bg-[#FF6B35] p-12 md:p-16 text-center"
          >
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Comece a construir sua carreira hoje
              </h2>
              <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
                Milhares de profissionais já se conectaram com oportunidades através da ANEC.
                Faça parte dessa rede nacional de talentos!
              </p>
              <Link href="/login?tab=signup&role=candidate">
                <Button
                  size="lg"
                  variant="secondary"
                  className="text-lg px-8 py-6"
                >
                  Cadastrar Agora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <p className="text-white/70 text-sm mt-4">
                Cadastro gratuito em menos de 2 minutos
              </p>
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.08),transparent_40%)]" />
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
}
