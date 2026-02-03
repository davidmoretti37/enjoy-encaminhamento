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
    description:
      "Encontre a oportunidade ideal para iniciar sua carreira. Estágio, jovem aprendiz ou CLT — conectamos você às melhores empresas.",
    href: "/jovem-aprendiz",
    color: "#FF6B35",
    bgColor: "bg-[#FF6B35]/10",
    image:
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&q=80&fit=crop",
  },
  {
    icon: Building2,
    title: "Empresas",
    description:
      "Contrate os melhores talentos para sua equipe. IA + curadoria humana para preencher vagas em dias, não meses.",
    href: "/empresas",
    color: "#0A2342",
    bgColor: "bg-[#0A2342]/10",
    image:
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&q=80&fit=crop",
  },
  {
    icon: School,
    title: "Instituições",
    description:
      "Ofereça as melhores oportunidades para seus alunos. Parcerias que aumentam a empregabilidade e a reputação da sua instituição.",
    href: "/assessoria",
    color: "#FF6B35",
    bgColor: "bg-[#FF6B35]/10",
    image:
      "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&q=80&fit=crop",
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
                  <div className="h-full rounded-2xl border-2 border-slate-200 bg-white hover:border-[#FF6B35]/30 hover:shadow-lg transition-all cursor-pointer overflow-hidden">
                    {/* Card Image */}
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={persona.image}
                        alt={persona.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                      <div
                        className={`absolute top-4 left-4 w-10 h-10 rounded-lg ${persona.bgColor} backdrop-blur-sm flex items-center justify-center`}
                      >
                        <Icon
                          className="h-5 w-5"
                          style={{ color: persona.color }}
                        />
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-[#0A2342] mb-3">
                        {persona.title}
                      </h3>
                      <p className="text-slate-600 mb-6 leading-relaxed text-sm">
                        {persona.description}
                      </p>
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#FF6B35]">
                        Saiba Mais
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
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
