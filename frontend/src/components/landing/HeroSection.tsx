import { Building2, User, CheckCircle2 } from "lucide-react";
import PersonaCard from "./PersonaCard";
import { motion } from "motion/react";

interface HeroSectionProps {
  selectedPersona: "none" | "company" | "candidate";
  onPersonaSelect: (persona: "company" | "candidate") => void;
}

const trustPoints = [
  "IA + Curadoria Humana",
  "Conformidade Legal",
  "Suporte Dedicado",
];

export default function HeroSection({
  selectedPersona,
  onPersonaSelect,
}: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-16 px-4 overflow-hidden">
      {/* Background gradients - Enhanced */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-orange-50/40" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(10,35,66,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,107,53,0.12),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(10,35,66,0.04),transparent_60%)]" />

      {/* Decorative floating elements */}
      <motion.div
        className="absolute top-32 left-10 w-20 h-20 rounded-full bg-[#FF6B35]/10 blur-2xl"
        animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-40 right-10 w-32 h-32 rounded-full bg-[#0A2342]/10 blur-3xl"
        animate={{ y: [0, 20, 0], x: [0, -10, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 w-full max-w-5xl mx-auto">
        {/* Main Content */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Main Headline - Outcome Focused */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#0A2342] mb-4 leading-tight">
            Contrate Talentos em{" "}
            <span className="text-gradient">Dias</span>
          </h1>
          <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-400 mb-8">
            <span className="line-through decoration-[#FF6B35]/50">Não em Meses</span>
          </p>

          {/* Subheadline - Value Proposition */}
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-8">
            Combinamos <strong>Inteligência Artificial</strong> com{" "}
            <strong>curadoria humana</strong> para conectar empresas aos
            melhores profissionais de estágio, CLT e menor aprendiz.
          </p>

          {/* Trust Points */}
          <motion.div
            className="flex flex-wrap justify-center gap-6 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {trustPoints.map((point, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-2 text-sm text-slate-600 bg-white/60 px-4 py-2 rounded-full border border-slate-200"
              >
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>{point}</span>
              </div>
            ))}
          </motion.div>

          {/* Social Proof Statement */}
          <motion.p
            className="text-sm text-slate-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Mais de <strong className="text-[#0A2342]">6.000 profissionais</strong> já
            encontraram oportunidades através da ANEC RG
          </motion.p>
        </motion.div>

        {/* Selection prompt */}
        <motion.p
          className="text-center text-slate-500 mb-8 font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Como podemos ajudar você hoje?
        </motion.p>

        {/* Persona cards - Enhanced copy */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <PersonaCard
            type="company"
            icon={Building2}
            title="Quero Contratar"
            subtitle="Publique vagas e receba candidatos pré-selecionados em até 5 dias. Nossa IA + equipe especializada fazem a curadoria para você."
            ctaText="Começar a Contratar"
            selected={selectedPersona === "company"}
            onClick={() => onPersonaSelect("company")}
          />
          <PersonaCard
            type="candidate"
            icon={User}
            title="Busco Oportunidade"
            subtitle="Cadastre-se gratuitamente e seja descoberto por empresas parceiras. Acompanhamento profissional durante todo o processo."
            ctaText="Criar Meu Perfil — Grátis"
            selected={selectedPersona === "candidate"}
            onClick={() => onPersonaSelect("candidate")}
          />
        </div>

        {/* Scroll indicator when persona selected */}
        {selectedPersona !== "none" && (
          <motion.div
            className="flex flex-col items-center mt-12 text-slate-400"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="text-sm mb-2">Role para saber mais</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </motion.div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
