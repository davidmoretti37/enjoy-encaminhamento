import { APP_TITLE, APP_LOGO } from "@/const";

export default function LandingFooter() {
  return (
    <footer className="border-t border-border py-12 bg-[#F5F5F5]">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <img src={APP_LOGO} alt="ANEC Logo" className="h-12 w-auto" />
              <span className="text-lg font-bold text-[#0A2342]">{APP_TITLE}</span>
            </div>
            <p className="text-sm text-[#0A2342]/70 font-medium mb-2">
              Conectando Talentos • Construindo Carreiras
            </p>
            <p className="text-sm text-muted-foreground">
              Agência Nacional de Emprego e Carreira
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Produto</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href="#"
                  className="hover:text-foreground transition-colors"
                >
                  Funcionalidades
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-foreground transition-colors"
                >
                  Precos
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-foreground transition-colors"
                >
                  Casos de Uso
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Empresa</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href="#"
                  className="hover:text-foreground transition-colors"
                >
                  Sobre
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-foreground transition-colors"
                >
                  Blog
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-foreground transition-colors"
                >
                  Contato
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href="#"
                  className="hover:text-foreground transition-colors"
                >
                  Privacidade
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-foreground transition-colors"
                >
                  Termos
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-foreground transition-colors"
                >
                  Seguranca
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>&copy; 2025 {APP_TITLE}. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
