import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Quote, Star } from "lucide-react";

const testimonials = [
  {
    name: "Ana Carolina Silva",
    role: "Estagiária de Administração",
    company: "Empresa de Tecnologia em SP",
    quote:
      "Em apenas 3 dias após meu cadastro, já estava em entrevista. A equipe da ANEC me preparou para cada etapa. Hoje sou estagiária e já tenho proposta de efetivação!",
    initials: "AC",
    rating: 5,
    highlight: "Contratada em 3 dias",
    bgColor: "bg-[#FF6B35]",
  },
  {
    name: "Lucas Mendes",
    role: "Ex-aprendiz, hoje Assistente Administrativo",
    company: "Indústria em Uberlândia",
    quote:
      "Comecei como jovem aprendiz através da ANEC. O acompanhamento foi incrível - feedbacks mensais, orientação de carreira. Após 1 ano, fui efetivado como CLT!",
    initials: "LM",
    rating: 5,
    highlight: "De aprendiz a CLT",
    bgColor: "bg-[#0A2342]",
  },
  {
    name: "Mariana Oliveira",
    role: "Estagiária de Marketing",
    company: "Agência Digital em Ipatinga",
    quote:
      "Estava há 6 meses procurando estágio sem sucesso. Na ANEC, em 1 semana recebi 3 propostas de empresas. O match com IA realmente funciona!",
    initials: "MO",
    rating: 5,
    highlight: "3 propostas em 1 semana",
    bgColor: "bg-[#FF6B35]",
  },
  {
    name: "Pedro Henrique Costa",
    role: "Estagiário de TI",
    company: "Startup em Gov. Valadares",
    quote:
      "O diferencial foi a pré-seleção humana. A equipe entendeu exatamente o que eu buscava e me conectou com uma empresa que tem tudo a ver com meu perfil.",
    initials: "PH",
    rating: 5,
    highlight: "Match perfeito",
    bgColor: "bg-[#0A2342]",
  },
  {
    name: "Juliana Santos",
    role: "Analista Júnior (ex-estagiária)",
    company: "Consultoria em São Paulo",
    quote:
      "A ANEC me acompanhou durante todo o estágio. Os feedbacks mensais me ajudaram a crescer, e quando surgiu a vaga CLT, eu estava preparada. Recomendo demais!",
    initials: "JS",
    rating: 5,
    highlight: "Efetivada após estágio",
    bgColor: "bg-[#FF6B35]",
  },
];

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating ? "text-yellow-400 fill-yellow-400" : "text-slate-300"
          }`}
        />
      ))}
    </div>
  );
}

export default function TestimonialsSection() {
  return (
    <section id="depoimentos" className="py-20 bg-white scroll-mt-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={itemVariants}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] mb-6">
            <Quote className="h-4 w-4" />
            <span className="text-sm font-medium">Histórias Reais</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Veja Quem Já <span className="text-gradient">Transformou</span> Sua
            Carreira
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Milhares de profissionais encontraram oportunidades através da ANEC
            RG. Conheça algumas histórias de sucesso.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={itemVariants}
          className="max-w-6xl mx-auto"
        >
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {testimonials.map((testimonial, index) => (
                <CarouselItem
                  key={index}
                  className="pl-4 md:basis-1/2 lg:basis-1/3"
                >
                  <Card className="h-full border-2 border-slate-200 hover:border-[#FF6B35]/30 transition-all hover:shadow-lg">
                    <CardContent className="p-6 flex flex-col h-full">
                      {/* Highlight Badge */}
                      <div className="mb-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold text-white ${testimonial.bgColor}`}
                        >
                          {testimonial.highlight}
                        </span>
                      </div>

                      {/* Rating */}
                      <div className="mb-4">
                        <StarRating rating={testimonial.rating} />
                      </div>

                      {/* Quote */}
                      <p className="text-slate-600 flex-grow mb-6 leading-relaxed">
                        "{testimonial.quote}"
                      </p>

                      {/* Author */}
                      <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                        <Avatar className={`h-12 w-12 ${testimonial.bgColor}`}>
                          <AvatarFallback
                            className={`${testimonial.bgColor} text-white font-semibold`}
                          >
                            {testimonial.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {testimonial.name}
                          </p>
                          <p className="text-sm text-slate-500">
                            {testimonial.role}
                          </p>
                          <p className="text-xs text-slate-400">
                            {testimonial.company}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-12" />
            <CarouselNext className="hidden md:flex -right-12" />
          </Carousel>

          {/* Mobile scroll hint */}
          <p className="text-center text-sm text-slate-400 mt-4 md:hidden">
            Deslize para ver mais depoimentos
          </p>
        </motion.div>
      </div>
    </section>
  );
}
