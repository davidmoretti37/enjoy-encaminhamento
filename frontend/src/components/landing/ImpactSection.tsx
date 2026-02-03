import { motion } from "motion/react";
import { ShieldCheck, Award, MapPin, Users, Building2, Calendar } from "lucide-react";
import AnimatedCounter from "./AnimatedCounter";

const stats = [
  {
    icon: Users,
    value: 6000,
    suffix: "+",
    label: "Profissionais Encaminhados",
    color: "text-[#FF6B35]",
    bgColor: "bg-[#FF6B35]/10",
  },
  {
    icon: Building2,
    value: 500,
    suffix: "+",
    label: "Empresas Parceiras",
    color: "text-[#0A2342]",
    bgColor: "bg-[#0A2342]/10",
  },
  {
    icon: Award,
    value: 95,
    suffix: "%",
    label: "Taxa de Satisfação",
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  {
    icon: MapPin,
    value: 4,
    suffix: "",
    label: "Regiões Atendidas",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
];

const trustSignals = [
  "Conformidade 100% com a legislação trabalhista",
  "Equipe especializada em recrutamento e seleção",
  "Inteligência Artificial + Curadoria Humana",
  "Suporte dedicado durante todo o contrato",
];

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

export default function ImpactSection() {
  return (
    <section className="py-20 bg-[#0A2342] text-white overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={itemVariants}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/80 mb-6">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">Nosso Impacto</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Números que <span className="text-[#FF6B35]">Falam por Nós</span>
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Desde a nossa fundação, conectamos milhares de talentos a empresas em todo o Brasil.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-16 max-w-4xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
        >
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                variants={itemVariants}
                className="text-center"
              >
                <div
                  className={`inline-flex items-center justify-center h-14 w-14 rounded-2xl ${stat.bgColor} mb-4`}
                >
                  <Icon className={`h-7 w-7 ${stat.color}`} />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                  <AnimatedCounter target={stat.value} duration={2000} />
                  {stat.suffix}
                </div>
                <p className="text-sm text-white/50">{stat.label}</p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Trust Signals */}
        <motion.div
          className="max-w-3xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {trustSignals.map((signal) => (
              <motion.div
                key={signal}
                variants={itemVariants}
                className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <ShieldCheck className="h-5 w-5 text-[#FF6B35] shrink-0" />
                <span className="text-sm text-white/70">{signal}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
