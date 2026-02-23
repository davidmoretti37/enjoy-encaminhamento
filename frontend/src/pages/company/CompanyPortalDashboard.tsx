import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import ContentTransition from "@/components/ui/ContentTransition";
import { StatsCardsSkeleton, ListSkeleton, PageHeaderSkeleton } from "@/components/ui/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { trpc } from "@/lib/trpc";
import {
  Calendar,
  Users,
  UserCheck,
  DollarSign,
  ArrowRight
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Briefcase } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { statusToStep } from "@/components/JobProgressBar";

export default function CompanyPortalDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const autoplayPlugin = useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true, stopOnMouseEnter: true })
  );

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  const { data: stats, isLoading: statsLoading } = trpc.company.getDashboardStats.useQuery(
    undefined,
    { enabled: !!user && user.role === 'company' }
  );
  const { data: upcomingEvents, isLoading: eventsLoading } = trpc.company.getUpcomingEvents.useQuery(
    undefined,
    { enabled: !!user && user.role === 'company' }
  );
  const { data: pendingActions } = trpc.company.getPendingActions.useQuery(
    undefined,
    { enabled: !!user && user.role === 'company' }
  );
  const { data: jobs, isLoading: jobsLoading } = trpc.company.getJobs.useQuery(
    undefined,
    { enabled: !!user && user.role === 'company' }
  );

  // Set default selected job when jobs load
  useEffect(() => {
    if (jobs && jobs.length > 0 && !selectedJobId) {
      setSelectedJobId(jobs[0].id);
    }
  }, [jobs, selectedJobId]);

  if (!user || user.role !== 'company') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Você precisa ser uma empresa para acessar esta página.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button>Voltar para Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoading = statsLoading || eventsLoading;

  // Calculate pending payments total
  const pendingPaymentsTotal = pendingActions?.overduePayments?.reduce(
    (sum: number, p: any) => sum + (p.amount || 0), 0
  ) || 0;

  // Get pending selection count (candidates awaiting review)
  const pendingSelectionCount = stats?.pendingSelection ?? 0;

  // Slide data for carousel (simplified - glassmorphism style)
  const slides = [
    {
      id: 'candidates',
      title: 'Candidatos Aguardando',
      value: isLoading ? '...' : pendingSelectionCount,
      description: 'aguardando sua análise',
      buttonText: 'Revisar candidatos',
      href: '/company/selection',
      icon: UserCheck,
    },
    {
      id: 'interviews',
      title: 'Próximas Entrevistas',
      value: isLoading ? '...' : stats?.pendingInterviews ?? 0,
      description: 'entrevistas agendadas',
      buttonText: 'Ver agenda',
      href: '/company/scheduling',
      icon: Calendar,
    },
    {
      id: 'employees',
      title: 'Funcionários Ativos',
      value: isLoading ? '...' : stats?.activeEmployees ?? 0,
      description: 'contratos ativos',
      buttonText: 'Ver funcionários',
      href: '/company/employees',
      icon: Users,
    },
    {
      id: 'payments',
      title: 'Pagamentos',
      value: isLoading ? '...' : `R$ ${pendingPaymentsTotal.toLocaleString('pt-BR')}`,
      description: pendingPaymentsTotal > 0 ? 'valor pendente' : 'tudo em dia',
      buttonText: 'Ver pagamentos',
      href: '/company/payments',
      icon: DollarSign,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center py-4">
          <h1 className="text-3xl font-bold text-gray-900">
            Olá, {user.name || 'Empresa'}!
          </h1>
          <p className="text-gray-500 mt-1">
            Bem-vindo ao seu portal de recrutamento
          </p>
        </div>

        {/* Recruitment Progress Tracker */}
        <style>{`
          @keyframes pulse-dot {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(17, 24, 39, 0.4); }
            50% { transform: scale(1.15); box-shadow: 0 0 0 8px rgba(17, 24, 39, 0); }
          }
        `}</style>
        {(() => {
          const selectedJob = jobs?.find((job: any) => job.id === selectedJobId);
          const currentStep = selectedJob ? (statusToStep[selectedJob.status] || 1) : 1;
          const steps = [
            { id: 1, label: 'Buscando candidatos', shortLabel: 'Busca' },
            { id: 2, label: 'Candidatos encontrados', shortLabel: 'Encontrados' },
            { id: 3, label: 'Pré-seleção em andamento', shortLabel: 'Pré-seleção' },
            { id: 4, label: 'Lista enviada', shortLabel: 'Enviado' },
          ];

          // Show loader while loading
          if (jobsLoading) {
            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="flex items-center justify-between">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center flex-1 last:flex-none">
                      <Skeleton className="w-6 h-6 rounded-full" />
                      {i < 4 && <Skeleton className="flex-1 h-1.5 mx-1 rounded" />}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-3 w-20" />
                  ))}
                </div>
              </div>
            );
          }

          // If no jobs, show wireframe style demo progress bar
          if (!jobs || jobs.length === 0) {
            return (
              <div
                className="relative group cursor-pointer"
                onClick={() => setLocation('/company/jobs')}
              >
                {/* Wireframe demo progress bar */}
                <div className="border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50/50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-36 bg-gray-200 rounded" />
                      <div className="h-5 w-28 bg-gray-200 rounded-full" />
                    </div>
                    <div className="h-3 w-20 bg-gray-200 rounded" />
                  </div>

                  {/* Wireframe progress dots with dashed lines */}
                  <div className="flex items-center justify-between">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center flex-1 last:flex-none">
                        <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-400 bg-white" />
                        {i < 4 && (
                          <div className="flex-1 border-t-2 border-dashed border-gray-300 mx-1" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Step labels placeholder */}
                  <div className="flex justify-between mt-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-3 w-20 bg-gray-200 rounded" />
                    ))}
                  </div>
                </div>

                {/* Subtle overlay always visible, darkens on hover */}
                <div className="absolute inset-0 bg-gray-400/20 group-hover:bg-gray-900/50 transition-all duration-300 flex items-center justify-center rounded-2xl">
                  <Button className="opacity-60 group-hover:opacity-100 transition-all duration-300 bg-white text-gray-900 hover:bg-gray-100 shadow-lg group-hover:shadow-xl group-hover:scale-105">
                    <Briefcase className="mr-2 h-4 w-4" />
                    Solicitar Vaga
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">Progresso do recrutamento</span>
                  {/* Job Selector - Only show if multiple jobs */}
                  {jobs && jobs.length > 1 && (
                    <Select
                      value={selectedJobId || ''}
                      onValueChange={(value) => setSelectedJobId(value)}
                    >
                      <SelectTrigger className="w-[200px] h-8 text-xs">
                        <SelectValue placeholder="Selecione uma vaga" />
                      </SelectTrigger>
                      <SelectContent>
                        {jobs.map((job: any) => (
                          <SelectItem key={job.id} value={job.id} className="text-xs">
                            {job.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {/* Show job title if only one job */}
                  {jobs && jobs.length === 1 && (
                    <Badge variant="secondary" className="text-xs">
                      {jobs[0].title}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-gray-500">Etapa {currentStep} de {steps.length}</span>
              </div>

              {/* Progress steps with tapered lines */}
              <div className="relative flex items-center justify-between">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center flex-1 last:flex-none">
                    {/* Dot */}
                    <div
                      className={`relative z-10 w-6 h-6 rounded-full border-2 transition-all flex-shrink-0 ${
                        step.id < currentStep
                          ? 'bg-gray-900 border-gray-900'
                          : step.id === currentStep
                            ? 'bg-gray-900 border-gray-900'
                            : 'bg-white border-gray-300'
                      }`}
                      style={step.id === currentStep ? {
                        animation: 'pulse-dot 2s ease-in-out infinite',
                      } : undefined}
                    >
                      {step.id < currentStep && (
                        <svg className="w-full h-full text-white p-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>

                    {/* Tapered connector line - needle point at end */}
                    {index < steps.length - 1 && (
                      <div className="flex-1 mx-0.5 h-6 flex items-center">
                        <div
                          className="w-full"
                          style={{
                            height: '6px',
                            background: step.id < currentStep ? '#111827' : '#d1d5db',
                            clipPath: 'polygon(0% 10%, 100% 48%, 100% 52%, 0% 90%)',
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Step labels */}
              <div className="flex justify-between mt-4">
                {steps.map((step) => (
                  <div key={step.id} className="flex-1 text-center first:text-left last:text-right">
                    <span className={`text-xs ${
                      step.id <= currentStep ? 'text-gray-900 font-medium' : 'text-gray-400'
                    }`}>
                      <span className="hidden sm:inline">{step.label}</span>
                      <span className="sm:hidden">{step.shortLabel}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Stats Carousel - Dark Corporate Style */}
        <div className="px-4">
          <div className="relative">
            <Carousel
              setApi={setApi}
              opts={{ loop: true, align: "center" }}
              plugins={[autoplayPlugin.current]}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {slides.map((slide) => {
                  const Icon = slide.icon;
                  return (
                    <CarouselItem key={slide.id} className="pl-2 md:pl-4 md:basis-full lg:basis-full">
                      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 shadow-2xl">
                        {/* Subtle accent glow */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl" />

                        <div className="relative p-8 md:p-12 flex flex-col items-center justify-center text-center min-h-[320px]">
                          {/* Icon */}
                          <div className="bg-white/10 p-4 rounded-2xl mb-6 border border-white/10">
                            <Icon className="h-10 w-10 text-white" />
                          </div>

                          {/* Value */}
                          <div className="text-6xl md:text-7xl font-bold text-white mb-2">
                            {slide.value}
                          </div>

                          {/* Title */}
                          <h3 className="text-xl font-semibold text-white mb-1">
                            {slide.title}
                          </h3>

                          {/* Description */}
                          <p className="text-gray-400 mb-8">
                            {slide.description}
                          </p>

                          {/* Action Button */}
                          <Button
                            onClick={() => setLocation(slide.href)}
                            className="bg-white text-gray-900 hover:bg-gray-100 shadow-lg px-8 font-medium"
                            size="lg"
                          >
                            {slide.buttonText}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
            </Carousel>

            {/* Simple arrow buttons */}
            <button
              onClick={() => api?.scrollPrev()}
              className="absolute left-6 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-10 w-10" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => api?.scrollNext()}
              className="absolute right-6 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
              aria-label="Next slide"
            >
              <ChevronRight className="h-10 w-10" strokeWidth={1.5} />
            </button>
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center gap-2 mt-4">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  current === index ? 'bg-gray-900' : 'bg-gray-300'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Quick Navigation Guide */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6">
          {[
            {
              icon: UserCheck,
              title: 'Candidatos',
              description: 'Receba a pré-seleção feita pela escola',
              href: '/company/selection',
            },
            {
              icon: Calendar,
              title: 'Entrevistas',
              description: 'Agende entrevistas na sua empresa',
              href: '/company/scheduling',
            },
            {
              icon: Users,
              title: 'Funcionários',
              description: 'Acompanhe seus contratos ativos',
              href: '/company/employees',
            },
            {
              icon: DollarSign,
              title: 'Pagamentos',
              description: 'Gerencie faturas e pagamentos',
              href: '/company/payments',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.title}
                onClick={() => setLocation(item.href)}
                className="flex flex-col items-center text-center p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group"
              >
                <div className="p-3 rounded-xl bg-white shadow-sm mb-3 group-hover:shadow transition-shadow">
                  <Icon className="h-6 w-6 text-gray-700" />
                </div>
                <h4 className="font-medium text-gray-900 mb-1">{item.title}</h4>
                <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
              </button>
            );
          })}
        </div>

        {/* Upcoming Events - Simplified */}
        {upcomingEvents && upcomingEvents.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
                Próximos Eventos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingEvents.slice(0, 3).map((event: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="secondary"
                        className={event.type === 'visit' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}
                      >
                        {event.type === 'visit' ? 'Visita' : 'Entrevista'}
                      </Badge>
                      <div>
                        <p className="font-medium text-gray-900">
                          {format(new Date(event.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </p>
                        <p className="text-sm text-gray-600">{event.title}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {upcomingEvents.length > 3 && (
                <Link href="/company/scheduling">
                  <Button variant="link" className="w-full mt-3 text-blue-600">
                    Ver todos os eventos
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions - Only show if there are pending items */}
        {((pendingActions?.pendingFeedback?.length ?? 0) > 0 || (pendingActions?.pendingAvailability?.length ?? 0) > 0) && (
          <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-amber-700">Ações Necessárias</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(pendingActions?.pendingFeedback?.length ?? 0) > 0 && (
                <Link href="/company/scheduling">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-white hover:bg-amber-50 cursor-pointer transition-colors">
                    <span className="text-gray-700">
                      {pendingActions?.pendingFeedback?.length} feedback(s) de entrevista pendente(s)
                    </span>
                    <ArrowRight className="h-4 w-4 text-amber-600" />
                  </div>
                </Link>
              )}
              {(pendingActions?.pendingAvailability?.length ?? 0) > 0 && (
                <Link href="/company/scheduling">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-white hover:bg-amber-50 cursor-pointer transition-colors">
                    <span className="text-gray-700">
                      {pendingActions?.pendingAvailability?.length} visita(s) aguardando disponibilidade
                    </span>
                    <ArrowRight className="h-4 w-4 text-amber-600" />
                  </div>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
