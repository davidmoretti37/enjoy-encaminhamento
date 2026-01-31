import { motion } from "motion/react";
import { MapPin } from "lucide-react";

const regions = [
  { city: "São Paulo", state: "SP" },
  { city: "Uberlândia", state: "MG" },
  { city: "Ipatinga", state: "MG" },
  { city: "Governador Valadares", state: "MG" },
];

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.1,
      type: "spring",
      stiffness: 100,
    },
  }),
};

export default function RegionsSection() {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={itemVariants}
          className="text-center mb-10"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Atuamos em{" "}
            <span className="text-gradient">Todo o Brasil</span>
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Conectando talentos e empresas nas principais regiões do país
          </p>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
          {regions.map((region, index) => (
            <motion.div
              key={index}
              custom={index}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={cardVariants}
              whileHover={{ scale: 1.05, y: -2 }}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-white border-2 border-slate-200 hover:border-[#FF6B35]/50 transition-colors shadow-sm"
            >
              <MapPin className="h-5 w-5 text-[#FF6B35]" />
              <span className="font-semibold text-slate-900">{region.city}</span>
              <span className="text-slate-500 text-sm">({region.state})</span>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={itemVariants}
          className="text-center text-slate-500 mt-8"
        >
          E expandindo para novas regiões em breve!
        </motion.p>
      </div>
    </section>
  );
}
