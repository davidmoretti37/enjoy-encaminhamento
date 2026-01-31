import { motion } from "motion/react";
import { Building2, Users, Star, Clock, Shield, BadgeCheck } from "lucide-react";
import AnimatedCounter from "./AnimatedCounter";

const stats = [
  {
    icon: Users,
    value: 6000,
    suffix: "+",
    label: "Candidatos Conectados",
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
    icon: Star,
    value: 95,
    suffix: "%",
    label: "Taxa de Satisfação",
    color: "text-[#FF6B35]",
    bgColor: "bg-[#FF6B35]/10",
  },
  {
    icon: Clock,
    value: 5,
    suffix: " dias",
    label: "Tempo Médio de Contratação",
    color: "text-[#0A2342]",
    bgColor: "bg-[#0A2342]/10",
  },
];

const trustBadges = [
  { icon: Shield, label: "Conformidade Legal" },
  { icon: BadgeCheck, label: "Matching com IA" },
];

// Partner company logos - Subway first
const partnerLogos = [
  { name: "Subway", src: "/logos/partner-09.jpeg" },
  { name: "M", src: "/logos/m-logo.png" },
  { name: "Havaianas", src: "/logos/havaianas.png" },
  { name: "Martins", src: "/logos/martins.jpeg" },
  { name: "5àsec", src: "/logos/partner-08.jpeg" },
  { name: "Callink", src: "/logos/callink.jpeg" },
  { name: "Certweb", src: "/logos/certweb.jpeg" },
  { name: "Certybase", src: "/logos/certybase.png" },
  { name: "Ridenes Lima", src: "/logos/ridenes-lima.png" },
  { name: "Informa Coletiva", src: "/logos/informa-coletiva.png" },
  { name: "Dois Quartos", src: "/logos/dois-quartos.jpg" },
  { name: "Peixoto", src: "/logos/peixoto.png" },
  { name: "Donna Balt", src: "/logos/donna-balt.jpg" },
  { name: "Partner", src: "/logos/partner-01.jpeg" },
  { name: "Florescer Jardinagem", src: "/logos/florescer.jpg" },
  { name: "Top Celular", src: "/logos/partner-02.jpeg" },
  { name: "Kemy", src: "/logos/kemy.jpg" },
  { name: "Annel", src: "/logos/partner-03.jpeg" },
  { name: "Partner", src: "/logos/partner-04.jpeg" },
  { name: "Rei do Led", src: "/logos/rei-do-led.png" },
  { name: "Partner", src: "/logos/partner-05.jpeg" },
  { name: "Triade", src: "/logos/partner-06.jpeg" },
  { name: "Zelle", src: "/logos/partner-07.jpeg" },
];

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Logo Marquee Component - Seamless Infinite Scroll
function LogoMarquee({ logos }: { logos: { name: string; src: string }[] }) {
  return (
    <div className="text-center mb-12">
      <p className="text-sm text-slate-500 uppercase tracking-wider mb-8 font-medium">
        Empresas que confiam na ANEC RG
      </p>
      <div className="relative overflow-hidden">
        {/* Gradient fade on edges */}
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

        {/* Marquee track - hover to pause */}
        <div className="marquee-container flex hover:[&>.marquee-track]:pause">
          {/* Two identical tracks for seamless loop */}
          <div className="marquee-track flex shrink-0 items-center gap-10">
            {logos.map((logo, index) => (
              <div
                key={`a-${index}`}
                className="flex-shrink-0 flex items-center justify-center h-14 w-24 md:h-16 md:w-32 mx-2"
              >
                <img
                  src={logo.src}
                  alt={logo.name}
                  className="max-h-full max-w-full object-contain"
                  draggable={false}
                />
              </div>
            ))}
          </div>
          <div className="marquee-track flex shrink-0 items-center gap-10">
            {logos.map((logo, index) => (
              <div
                key={`b-${index}`}
                className="flex-shrink-0 flex items-center justify-center h-14 w-24 md:h-16 md:w-32 mx-2"
              >
                <img
                  src={logo.src}
                  alt={logo.name}
                  className="max-h-full max-w-full object-contain"
                  draggable={false}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        .marquee-track {
          animation: marquee 40s linear infinite;
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .marquee-container:hover .marquee-track {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}

export default function TrustBadgesSection() {
  return (
    <section className="py-16 border-y border-slate-200 bg-white">
      <div className="container mx-auto px-4">
        {/* Partner Logos - Infinite Scrolling Marquee with Drag */}
        <LogoMarquee logos={partnerLogos} />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-12">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <div
                className={`inline-flex items-center justify-center h-14 w-14 rounded-2xl ${stat.bgColor} mb-4`}
              >
                <stat.icon className={`h-7 w-7 ${stat.color}`} />
              </div>
              <div className="text-3xl md:text-4xl font-bold text-slate-900 mb-1">
                <AnimatedCounter
                  end={stat.value}
                  suffix={stat.suffix}
                  duration={2}
                />
              </div>
              <p className="text-sm text-slate-600">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Trust Badges */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={itemVariants}
          className="flex flex-wrap justify-center gap-4"
        >
          {trustBadges.map((badge, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200 text-green-700"
            >
              <badge.icon className="h-4 w-4" />
              <span className="text-sm font-medium">{badge.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
