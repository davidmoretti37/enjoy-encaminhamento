import { Link } from "wouter";
import { APP_LOGO } from "@/const";

const serviceLinks = [
  { label: "Jovem Aprendiz", href: "/jovem-aprendiz" },
  { label: "Empresas", href: "/empresas" },
  { label: "Assessoria", href: "/assessoria" },
  { label: "CLT", href: "/clt" },
  { label: "Estágio", href: "/estagio" },
];

const resourceLinks = [
  { label: "Vagas", href: "/vagas" },
  { label: "Depoimentos", href: "/#depoimentos" },
  { label: "Perguntas Frequentes", href: "/#faq" },
];

const legalLinks = [
  { label: "Privacidade", href: "#" },
  { label: "Termos de Uso", href: "#" },
  { label: "Segurança", href: "#" },
];

export default function LandingFooter() {
  return (
    <footer className="border-t border-border py-12 bg-[#0A2342]">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <img src={APP_LOGO} alt="ANEC Logo" className="h-12 w-auto brightness-0 invert" />
              <span className="text-lg font-bold text-white">ANEC</span>
            </div>
            <p className="text-sm text-white/60 font-medium mb-2">
              Conectando Talentos a Empresas
            </p>
            <p className="text-sm text-white/40">
              Construindo carreiras em todo o Brasil
            </p>
          </div>

          {/* Serviços */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Serviços</h4>
            <ul className="space-y-2 text-sm">
              {serviceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/60 hover:text-[#FF6B35] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Recursos */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Recursos</h4>
            <ul className="space-y-2 text-sm">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/60 hover:text-[#FF6B35] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Legal</h4>
            <ul className="space-y-2 text-sm">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-white/60 hover:text-[#FF6B35] transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-center text-sm text-white/40">
          <p>&copy; {new Date().getFullYear()} ANEC — Agência Nacional de Emprego e Carreira. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
