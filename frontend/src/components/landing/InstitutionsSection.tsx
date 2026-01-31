import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  GraduationCap,
  Users,
  Building2,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Link } from "wouter";

const benefits = [
  {
    icon: Users,
    title: "Gestão de Alunos",
    description: "Acompanhe o desenvolvimento profissional dos seus estudantes",
  },
  {
    icon: Building2,
    title: "Conexão com Empresas",
    description: "Acesso a uma rede de empresas parceiras em busca de talentos",
  },
  {
    icon: TrendingUp,
    title: "Relatórios e Métricas",
    description: "Dados sobre empregabilidade e desempenho dos alunos",
  },
];

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function InstitutionsSection() {
  return (
    <section className="py-20 bg-[#0A2342]">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={itemVariants}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white mb-6">
              <GraduationCap className="h-4 w-4" />
              <span className="text-sm font-medium">Para Instituições de Ensino</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Seja uma{" "}
              <span className="text-[#FF6B35]">Instituição Parceira</span>
            </h2>
            <p className="text-lg text-white/80 mb-8">
              Conecte seus alunos ao mercado de trabalho e acompanhe seu
              desenvolvimento profissional através da nossa plataforma
            </p>

            <div className="space-y-4 mb-8">
              {[
                "Plataforma completa para gestão de estágios",
                "Conexão direta com empresas parceiras",
                "Acompanhamento do desenvolvimento dos alunos",
                "Conformidade legal garantida",
                "Suporte dedicado para sua instituição",
              ].map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <CheckCircle2 className="h-5 w-5 text-[#FF6B35] flex-shrink-0" />
                  <span className="text-white/90">{benefit}</span>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/login?tab=signup&role=agency">
                <Button
                  size="lg"
                  className="bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white"
                >
                  Quero ser parceiro
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-white text-white hover:bg-white/10"
              >
                Saber mais
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={itemVariants}
            className="grid gap-4"
          >
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
              >
                <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-[#FF6B35] flex items-center justify-center flex-shrink-0">
                      <benefit.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">
                        {benefit.title}
                      </h3>
                      <p className="text-white/70 text-sm">
                        {benefit.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
