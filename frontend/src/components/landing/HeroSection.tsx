import { Building2, User } from "lucide-react";
import PersonaCard from "./PersonaCard";
import { APP_TITLE, APP_LOGO } from "@/const";
import { motion } from "motion/react";

interface HeroSectionProps {
  selectedPersona: "none" | "company" | "candidate";
  onPersonaSelect: (persona: "company" | "candidate") => void;
}

export default function HeroSection({
  selectedPersona,
  onPersonaSelect,
}: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center py-20 px-4 overflow-hidden">
      {/* Background gradients - ANEC colors */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-orange-50/30" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(10,35,66,0.06),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,107,53,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(10,35,66,0.03),transparent_60%)]" />

      <div className="relative z-10 w-full max-w-5xl mx-auto">
        {/* Logo and title */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col items-center justify-center gap-4 mb-8">
            <img
              src={APP_LOGO}
              alt="ANEC Logo"
              className="h-24 md:h-32 w-auto"
            />
            <div className="text-center">
              <span className="text-3xl md:text-4xl font-bold text-anec-navy">{APP_TITLE}</span>
              <p className="text-sm md:text-base text-gray-500 mt-1">Agência Nacional de Emprego e Carreira</p>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-anec-navy mb-4">
            Conectando <span className="text-gradient">Talentos</span> a{" "}
            <span className="text-gradient">Empresas</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Agência integradora que facilita o encontro entre profissionais qualificados
            e oportunidades de emprego, construindo carreiras sólidas em todo o Brasil
          </p>
        </motion.div>

        {/* Selection prompt */}
        <motion.p
          className="text-center text-slate-500 mb-8 font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Como podemos ajudar você hoje?
        </motion.p>

        {/* Persona cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <PersonaCard
            type="company"
            icon={Building2}
            title="Sou uma Empresa"
            subtitle="Encontre os melhores talentos com inteligência artificial. Nossa plataforma analisa seu perfil e apresenta candidatos ideais."
            ctaText="Conhecer Soluções"
            selected={selectedPersona === "company"}
            onClick={() => onPersonaSelect("company")}
          />
          <PersonaCard
            type="candidate"
            icon={User}
            title="Sou um Candidato"
            subtitle="Encontre oportunidades perfeitas para sua carreira. Cadastre-se gratuitamente e seja encontrado por empresas parceiras."
            ctaText="Ver Oportunidades"
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
