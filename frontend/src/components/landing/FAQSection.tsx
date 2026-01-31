import { motion } from "motion/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "Quanto custa para empresas utilizarem a plataforma?",
    answer:
      "Trabalhamos com diferentes modelos de contrato: Estágio, CLT e Menor Aprendiz. Cada modalidade possui sua própria estrutura de custos. Entre em contato conosco para uma proposta personalizada de acordo com suas necessidades.",
  },
  {
    question: "O cadastro é realmente gratuito para candidatos?",
    answer:
      "Sim! O cadastro na plataforma é 100% gratuito para candidatos. Você pode criar seu perfil, ser encontrado por empresas e receber oportunidades sem nenhum custo.",
  },
  {
    question: "Como funciona o matching com Inteligência Artificial?",
    answer:
      "Nossa IA analisa o perfil do candidato (habilidades, experiência, objetivos) e compara com os requisitos das vagas. Além disso, nossa equipe faz uma curadoria humana para garantir a melhor compatibilidade entre candidatos e empresas.",
  },
  {
    question: "Quais regiões vocês atendem?",
    answer:
      "Atualmente atendemos São Paulo (SP), Uberlândia (MG), Ipatinga (MG) e Governador Valadares (MG). Estamos em constante expansão para novas regiões do Brasil.",
  },
  {
    question: "Quanto tempo leva para ser contratado?",
    answer:
      "O tempo médio de contratação através da ANEC RG é de 5 dias. Porém, isso pode variar de acordo com o perfil da vaga e a disponibilidade do candidato para entrevistas.",
  },
  {
    question: "A ANEC RG oferece suporte durante o contrato?",
    answer:
      "Sim! Oferecemos acompanhamento contínuo tanto para empresas quanto para candidatos. Isso inclui feedbacks mensais, suporte dedicado e, em alguns planos, desenvolvimento pessoal e profissional.",
  },
];

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function FAQSection() {
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0A2342]/10 text-[#0A2342] mb-6">
            <HelpCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Dúvidas Frequentes</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Perguntas <span className="text-gradient">Frequentes</span>
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Tire suas dúvidas sobre como a ANEC RG pode ajudar você ou sua empresa
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={itemVariants}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-white mb-3 rounded-xl border-2 border-slate-200 px-6 data-[state=open]:border-[#FF6B35]/30"
              >
                <AccordionTrigger className="text-left font-semibold text-slate-900 hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={itemVariants}
          className="text-center text-slate-500 mt-8"
        >
          Ainda tem dúvidas?{" "}
          <a
            href="#"
            className="text-[#FF6B35] font-medium hover:underline"
          >
            Fale com nossa equipe
          </a>
        </motion.p>
      </div>
    </section>
  );
}
