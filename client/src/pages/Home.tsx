import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { APP_TITLE, getLoginUrl } from "@/const";
import { 
  Briefcase, 
  Users, 
  FileText, 
  TrendingUp, 
  Sparkles, 
  CheckCircle2,
  ArrowRight,
  Building2,
  GraduationCap,
  Zap
} from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Briefcase className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-gradient">{APP_TITLE}</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Funcionalidades
              </a>
              <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                Como Funciona
              </a>
              <a href="#benefits" className="text-muted-foreground hover:text-foreground transition-colors">
                Benefícios
              </a>
            </div>
            
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button>
                    Ir para Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost">Entrar</Button>
                  </Link>
                  <Link href="/login">
                    <Button className="bg-gradient-brand shadow-glow">
                      Começar Agora
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.623_0.214_259.815_/_0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,oklch(0.7_0.25_280_/_0.08),transparent_50%)]" />
        
        <div className="container relative">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-8 animate-slide-up">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Plataforma de Recrutamento com IA</span>
            </div>
            
            <h1 className="mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Conecte Talentos com
              <span className="text-gradient"> Oportunidades</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.2s' }}>
              A plataforma completa para gestão de contratos de estágio, menor aprendiz e CLT. 
              Automatize processos, encontre candidatos perfeitos com IA e gerencie tudo em um só lugar.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <Link href="/login">
                <Button size="lg" className="bg-gradient-brand shadow-glow text-lg px-8 py-6">
                  Começar Gratuitamente
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                Ver Demonstração
              </Button>
            </div>
            
            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span>Sem cartão de crédito</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span>Setup em 5 minutos</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span>Suporte dedicado</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="mb-4">
              Tudo que você precisa para
              <span className="text-gradient"> gerenciar recrutamento</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Ferramentas poderosas que simplificam cada etapa do processo de recrutamento e gestão de contratos
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Sparkles,
                title: "Matching com IA",
                description: "Inteligência artificial encontra os candidatos perfeitos para cada vaga automaticamente"
              },
              {
                icon: Users,
                title: "Banco de Talentos",
                description: "Gerencie milhares de candidatos com perfis completos, testes e avaliações"
              },
              {
                icon: FileText,
                title: "Contratos Automatizados",
                description: "Gere e assine contratos digitalmente com templates personalizados"
              },
              {
                icon: TrendingUp,
                title: "Analytics Avançado",
                description: "Dashboards completos com métricas e insights sobre seu processo de recrutamento"
              },
              {
                icon: Zap,
                title: "Automação Total",
                description: "Notificações, feedbacks e lembretes automáticos para economizar tempo"
              },
              {
                icon: Building2,
                title: "Multi-empresa",
                description: "Gerencie múltiplas empresas e franquias em uma única plataforma"
              }
            ].map((feature, index) => (
              <Card key={index} className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-medium group">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="mb-4">Como Funciona</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Processo simples e eficiente em 4 passos
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {[
              {
                step: "1",
                title: "Cadastre sua Empresa",
                description: "Crie sua conta e configure o perfil da empresa em minutos"
              },
              {
                step: "2",
                title: "Publique Vagas",
                description: "Descreva a vaga e os requisitos que você procura"
              },
              {
                step: "3",
                title: "IA Encontra Candidatos",
                description: "Nossa IA analisa e recomenda os melhores candidatos"
              },
              {
                step: "4",
                title: "Gerencie Contratos",
                description: "Assine contratos digitalmente e acompanhe tudo"
              }
            ].map((step, index) => (
              <div key={index} className="relative">
                <div className="text-center">
                  <div className="h-16 w-16 rounded-full bg-gradient-brand text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-glow">
                    {step.step}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm">{step.description}</p>
                </div>
                {index < 3 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 bg-muted/30">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="mb-6">
                Por que escolher nossa
                <span className="text-gradient"> plataforma?</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Transforme seu processo de recrutamento com tecnologia de ponta e automação inteligente
              </p>
              
              <div className="space-y-4">
                {[
                  "Reduza tempo de contratação em até 70%",
                  "Matching preciso com IA avançada",
                  "Gestão completa de contratos e pagamentos",
                  "Feedbacks automatizados mensais",
                  "Suporte dedicado e treinamento",
                  "Conformidade legal garantida"
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-lg">{benefit}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-8">
                <Link href="/login">
                  <Button size="lg" className="bg-gradient-brand shadow-glow">
                    Começar Agora
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="relative">
              <div className="relative z-10 bg-card border-2 border-border rounded-2xl p-8 shadow-medium">
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <GraduationCap className="h-8 w-8 text-primary" />
                      <div>
                        <div className="font-semibold">1,247 Candidatos</div>
                        <div className="text-sm text-muted-foreground">Ativos na plataforma</div>
                      </div>
                    </div>
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-8 w-8 text-primary" />
                      <div>
                        <div className="font-semibold">89 Empresas</div>
                        <div className="text-sm text-muted-foreground">Parceiras ativas</div>
                      </div>
                    </div>
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Briefcase className="h-8 w-8 text-primary" />
                      <div>
                        <div className="font-semibold">342 Contratos</div>
                        <div className="text-sm text-muted-foreground">Ativos este mês</div>
                      </div>
                    </div>
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-brand opacity-10 blur-3xl" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-brand p-12 md:p-16 text-center shadow-glow">
            <div className="relative z-10">
              <h2 className="text-white mb-4">
                Pronto para revolucionar seu recrutamento?
              </h2>
              <p className="text-white/90 text-xl mb-8 max-w-2xl mx-auto">
                Junte-se a centenas de empresas que já transformaram seu processo de contratação
              </p>
              <Link href="/login">
                <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
                  Começar Gratuitamente
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-muted/30">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Briefcase className="h-6 w-6 text-primary" />
                <span className="text-lg font-bold">{APP_TITLE}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Plataforma completa para gestão de recrutamento e contratos de trabalho.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Funcionalidades</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Preços</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Casos de Uso</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Sobre</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contato</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Termos</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Segurança</a></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>© 2025 {APP_TITLE}. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
