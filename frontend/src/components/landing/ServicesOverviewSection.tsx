import { motion } from "motion/react";
import { Compass, TrendingUp, FileText, ArrowRight } from "lucide-react";
import { Link } from "wouter";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const services = [
  {
    icon: Compass,
    title: "Assessoria",
    description:
      "Orientação de carreira e consultoria profissional personalizada para jovens que buscam sua primeira oportunidade no mercado de trabalho.",
    href: "/assessoria",
  },
  {
    icon: TrendingUp,
    title: "Desenvolvimento Contínuo",
    description:
      "Mentoria e acompanhamento contínuo para crescimento profissional, com feedbacks periódicos e planos de desenvolvimento individual.",
    href: "/assessoria",
  },
  {
    icon: FileText,
    title: "Gestão Contratual",
    description:
      "Realizamos toda a documentação e gestão contratual de estagiários e jovens aprendizes com total conformidade legal.",
    href: "/clt-pcd",
  },
];

export default function ServicesOverviewSection() {
  return (
    <section id="servicos" className="py-20 bg-slate-50/50 scroll-mt-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={itemVariants}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] mb-6">
            <Compass className="h-4 w-4" />
            <span className="text-sm font-medium">Nossos Serviços</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#0A2342] mb-4">
            Soluções que <span className="text-gradient">Transformam</span>
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Da assessoria inicial à gestão contratual, oferecemos suporte
            completo em todas as etapas da jornada profissional.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
        >
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={service.title}
                variants={itemVariants}
                whileHover={{ scale: 1.02, y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Link href={service.href} className="block h-full">
                  <div className="h-full p-8 rounded-2xl bg-white border border-slate-200 hover:border-[#FF6B35]/30 hover:shadow-lg transition-all cursor-pointer">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#0A2342] to-[#FF6B35] flex items-center justify-center mb-6">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-[#0A2342] mb-3">
                      {service.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed mb-6">
                      {service.description}
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
