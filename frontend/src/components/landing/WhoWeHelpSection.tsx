import { motion } from "motion/react";
import { GraduationCap, Building2, School, ArrowRight } from "lucide-react";
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

const personas = [
  {
    icon: GraduationCap,
    title: "Jovens",
    description: "Encontre a oportunidade ideal para iniciar sua carreira.",
    href: "/jovem-aprendiz",
    color: "#FF6B35",
    bgColor: "bg-[#FF6B35]/10",
  },
  {
    icon: Building2,
    title: "Empresas",
    description: "Contrate os melhores talentos para sua equipe.",
    href: "/empresas",
    color: "#0A2342",
    bgColor: "bg-[#0A2342]/10",
  },
  {
    icon: School,
    title: "Instituições",
    description: "Ofereça as melhores oportunidades para seus alunos.",
    href: "/assessoria",
    color: "#FF6B35",
    bgColor: "bg-[#FF6B35]/10",
  },
];

export default function WhoWeHelpSection() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={itemVariants}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0A2342]/5 text-[#0A2342] mb-6">
            <span className="text-sm font-medium">Para quem é a ANEC</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#0A2342] mb-4">
            Quem Nós <span className="text-gradient">Ajudamos</span>
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Soluções personalizadas para cada perfil. Descubra como a ANEC pode
            transformar sua jornada profissional.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
        >
          {personas.map((persona) => {
            const Icon = persona.icon;
            return (
              <motion.div
                key={persona.title}
                variants={itemVariants}
                whileHover={{ scale: 1.03, y: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Link href={persona.href} className="block h-full">
                  <div className="h-full p-8 rounded-2xl border-2 border-slate-200 bg-white hover:border-[#FF6B35]/30 hover:shadow-lg transition-all cursor-pointer">
                    <div
                      className={`w-14 h-14 rounded-xl ${persona.bgColor} flex items-center justify-center mb-6`}
                    >
                      <Icon className="h-7 w-7" style={{ color: persona.color }} />
                    </div>
                    <h3 className="text-xl font-bold text-[#0A2342] mb-3">
                      {persona.title}
                    </h3>
                    <p className="text-slate-600 mb-6 leading-relaxed">
                      {persona.description}
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
