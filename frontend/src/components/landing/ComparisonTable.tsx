import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const rows = [
  { label: "Idade Mínima", clt: "16+ (com responsável)", estagio: "16+ (estudante)", aprendiz: "14 a 24 anos" },
  { label: "Duração", clt: "Indeterminado", estagio: "Até 2 anos", aprendiz: "Até 2 anos" },
  { label: "FGTS", clt: "8%", estagio: "Não", aprendiz: "2%" },
  { label: "Férias", clt: "30 dias + 1/3", estagio: "30 dias recesso", aprendiz: "Coincide com escola" },
  { label: "13º Salário", clt: "Sim", estagio: "Não", aprendiz: "Sim" },
  { label: "INSS", clt: "Sim", estagio: "Não", aprendiz: "Sim" },
  { label: "Vínculo", clt: "Empregado", estagio: "Não é empregado", aprendiz: "Empregado especial" },
  { label: "Carga Horária", clt: "Até 44h/semana", estagio: "Até 30h/semana", aprendiz: "Até 30h/semana" },
  { label: "Base Legal", clt: "Decreto-Lei 5.452", estagio: "Lei 11.788/2008", aprendiz: "Lei 10.097/2000" },
];

interface ComparisonTableProps {
  highlight?: "clt" | "estagio" | "aprendiz";
}

export default function ComparisonTable({ highlight }: ComparisonTableProps) {
  return (
    <section className="py-20 bg-slate-50/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={itemVariants}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-[#0A2342] mb-4">
            Comparativo de <span className="text-gradient">Modalidades</span>
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Entenda as diferenças entre CLT, Estágio e Jovem Aprendiz.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={itemVariants}
          className="max-w-4xl mx-auto"
        >
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-4 font-semibold text-slate-500 bg-slate-50 w-1/4">
                    Aspecto
                  </th>
                  <th
                    className={`text-center p-4 font-bold w-1/4 ${
                      highlight === "clt"
                        ? "bg-[#0A2342] text-white"
                        : "bg-slate-50 text-[#0A2342]"
                    }`}
                  >
                    CLT
                  </th>
                  <th
                    className={`text-center p-4 font-bold w-1/4 ${
                      highlight === "estagio"
                        ? "bg-[#0A2342] text-white"
                        : "bg-slate-50 text-[#0A2342]"
                    }`}
                  >
                    Estágio
                  </th>
                  <th
                    className={`text-center p-4 font-bold w-1/4 ${
                      highlight === "aprendiz"
                        ? "bg-[#0A2342] text-white"
                        : "bg-slate-50 text-[#0A2342]"
                    }`}
                  >
                    Jovem Aprendiz
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={row.label}
                    className={index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                  >
                    <td className="p-4 font-medium text-slate-700 border-r border-slate-100">
                      {row.label}
                    </td>
                    <td
                      className={`p-4 text-center ${
                        highlight === "clt"
                          ? "font-semibold text-[#0A2342] bg-[#0A2342]/5"
                          : "text-slate-600"
                      }`}
                    >
                      {row.clt}
                    </td>
                    <td
                      className={`p-4 text-center ${
                        highlight === "estagio"
                          ? "font-semibold text-[#0A2342] bg-[#0A2342]/5"
                          : "text-slate-600"
                      }`}
                    >
                      {row.estagio}
                    </td>
                    <td
                      className={`p-4 text-center ${
                        highlight === "aprendiz"
                          ? "font-semibold text-[#0A2342] bg-[#0A2342]/5"
                          : "text-slate-600"
                      }`}
                    >
                      {row.aprendiz}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Links to each page */}
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <Link
              href="/clt"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#0A2342] hover:text-[#FF6B35] transition-colors"
            >
              Saiba mais sobre CLT <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/estagio"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#0A2342] hover:text-[#FF6B35] transition-colors"
            >
              Saiba mais sobre Estágio <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/jovem-aprendiz"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#0A2342] hover:text-[#FF6B35] transition-colors"
            >
              Saiba mais sobre Jovem Aprendiz <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
