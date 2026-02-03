import { motion } from "motion/react";
import { Scale, BookOpen, GraduationCap, ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const legalTopics = [
  {
    icon: Scale,
    title: "CLT e PCD",
    description:
      "Direitos, benefícios e regulamentações para emprego formal. Conformidade total com o Decreto-Lei nº 5.452.",
    href: "/clt-pcd",
    reference: "Decreto-Lei nº 5.452",
  },
  {
    icon: BookOpen,
    title: "Estágio",
    description:
      "Leis e diretrizes para estágios. Tudo sobre a Lei nº 11.788 e os direitos do estagiário.",
    href: "/estagio",
    reference: "Lei nº 11.788",
  },
  {
    icon: GraduationCap,
    title: "Jovem Aprendiz",
    description:
      "Regulamentações do programa de jovem aprendiz. Conheça a Lei nº 10.097 e seus benefícios.",
    href: "/jovem-aprendiz",
    reference: "Lei nº 10.097",
  },
];

export default function CredibilitySection() {
  return (
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
            <ShieldCheck className="h-4 w-4" />
            <span className="text-sm font-medium">Conformidade Legal</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Profissionalismo e{" "}
            <span className="text-[#FF6B35]">Transparência</span>
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            A ANEC garante total conformidade com a legislação trabalhista brasileira.
            Conheça os detalhes legais de cada modalidade.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
        >
          {legalTopics.map((topic) => {
            const Icon = topic.icon;
            return (
              <motion.div
                key={topic.title}
                variants={itemVariants}
                whileHover={{ scale: 1.03, y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Link href={topic.href} className="block h-full">
                  <div className="h-full p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-[#FF6B35]/40 hover:bg-white/10 transition-all cursor-pointer">
                    <div className="w-12 h-12 rounded-lg bg-[#FF6B35]/20 flex items-center justify-center mb-6">
                      <Icon className="h-6 w-6 text-[#FF6B35]" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {topic.title}
                    </h3>
                    <p className="text-xs font-medium text-[#FF6B35] mb-4">
                      {topic.reference}
                    </p>
                    <p className="text-white/60 leading-relaxed mb-6">
                      {topic.description}
                    </p>
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#FF6B35]">
                      Saiba Mais
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
