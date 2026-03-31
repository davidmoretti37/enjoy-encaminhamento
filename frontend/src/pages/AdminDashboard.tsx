import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  Briefcase,
  Users,
  FileText,
  Building2,
  TrendingUp,
  ArrowUpRight,
  GraduationCap,
  ShieldCheck,
  FileCheck,
  DollarSign,
  MessageSquare,
  Brain
} from "lucide-react";
import { Link, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import ContentTransition from "@/components/ui/ContentTransition";
import { StatsCardsSkeleton, ListSkeleton, PageHeaderSkeleton } from "@/components/ui/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: statsLoading } = trpc.dashboard.getStats.useQuery();
  const { data: adminStats, isLoading: adminStatsLoading } = trpc.admin.getStats.useQuery();
  const { data: companies, isLoading: companiesLoading } = trpc.company.getAll.useQuery();
  const { data: candidates, isLoading: candidatesLoading } = trpc.candidate.getAll.useQuery();

  const isLoading = authLoading || statsLoading;

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Card className="max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-red-500" />
              Acesso Negado
            </CardTitle>
            <CardDescription>Você precisa ser um administrador para acessar esta página.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="w-full">Voltar para Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <ContentTransition
        isLoading={isLoading}
        skeleton={
          <div className="space-y-8">
            <PageHeaderSkeleton />
            <StatsCardsSkeleton count={4} />
            <div className="grid gap-4 md:grid-cols-2">
              <ListSkeleton count={3} />
              <ListSkeleton count={3} />
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <ListSkeleton count={5} />
              <ListSkeleton count={5} />
            </div>
          </div>
        }
      >
        <div className="space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Briefcase className="h-7 w-7 text-blue-600" />
            Dashboard
          </h1>
        </div>

        {/* Stats Overview */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Visão Geral da Plataforma</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-slate-200 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Empresas</CardTitle>
                <Building2 className="h-5 w-5 text-slate-400" />
              </CardHeader>
              <CardContent>
                {adminStatsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-semibold mb-1 text-slate-900">{adminStats?.totalCompanies || 0}</div>
                    <p className="text-xs text-slate-500">
                      {adminStats?.activeCompanies || 0} ativas • {adminStats?.pendingCompanies || 0} pendentes
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-emerald-200 bg-emerald-50/50 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-emerald-700">Candidatos</CardTitle>
                <Users className="h-5 w-5 text-emerald-600" />
              </CardHeader>
              <CardContent>
                {adminStatsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-semibold mb-1 text-emerald-900">{adminStats?.totalCandidates || 0}</div>
                    <p className="text-xs text-emerald-600">
                      {adminStats?.activeCandidates || 0} ativos • {adminStats?.employedCandidates || 0} empregados
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/50 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-700">Vagas</CardTitle>
                <Briefcase className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                {adminStatsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-semibold mb-1 text-blue-900">{adminStats?.totalJobs || 0}</div>
                    <p className="text-xs text-blue-600">
                      {adminStats?.openJobs || 0} abertas • {adminStats?.filledJobs || 0} preenchidas
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50/50 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-700">Candidaturas</CardTitle>
                <FileText className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                {adminStatsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-semibold mb-1 text-purple-900">{adminStats?.totalApplications || 0}</div>
                    <p className="text-xs text-purple-600">
                      {adminStats?.pendingApplications || 0} pendentes • {adminStats?.selectedApplications || 0} selecionados
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Contracts & Revenue Analytics */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-teal-600" />
                Contratos
              </CardTitle>
              <CardDescription>Status dos contratos na plataforma</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {adminStatsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-8 w-24 mt-4" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium">Ativos</span>
                    </div>
                    <span className="text-2xl font-bold">{adminStats?.activeContracts || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                      <span className="text-sm font-medium">Pendentes</span>
                    </div>
                    <span className="text-2xl font-bold">{adminStats?.pendingContracts || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm font-medium">Concluídos</span>
                    </div>
                    <span className="text-2xl font-bold">{adminStats?.completedContracts || 0}</span>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-muted-foreground">Total</span>
                      <span className="text-3xl font-bold text-primary">{adminStats?.totalContracts || 0}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                Receita
              </CardTitle>
              <CardDescription>Métricas financeiras da plataforma</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {adminStatsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-8 w-24 mt-4" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Receita Recebida</p>
                    <p className="text-3xl font-bold text-green-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((adminStats?.totalRevenue || 0) / 100)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{adminStats?.paidPayments || 0} pagamentos</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Receita Pendente</p>
                    <p className="text-3xl font-bold text-yellow-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((adminStats?.pendingRevenue || 0) / 100)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{adminStats?.pendingPayments || 0} pagamentos</p>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Pagamentos Atrasados</span>
                      <Badge variant="destructive">{adminStats?.overduePayments || 0}</Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Companies */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    Empresas Recentes
                  </CardTitle>
                  <CardDescription>Últimas empresas cadastradas</CardDescription>
                </div>
                <Badge variant="secondary">{companies?.length || 0}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {companiesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border-2 rounded-xl">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <div className="text-right space-y-2">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-3 w-12 ml-auto" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : companies && companies.length > 0 ? (
                <div className="space-y-3">
                  {companies.slice(0, 5).map((company: any) => (
                    <div
                      key={company.id}
                      className="flex items-center justify-between p-4 border-2 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 cursor-pointer group"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm group-hover:text-blue-600 transition-colors">{company.company_name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {company.email} • {company.city || 'Sem localização'}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={company.status === 'active' ? 'default' : company.status === 'pending' ? 'secondary' : 'destructive'} className="mb-1">
                          {company.status === 'active' ? 'Ativa' : company.status === 'pending' ? 'Pendente' : 'Suspensa'}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          {new Date(company.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Nenhuma empresa cadastrada</h3>
                  <p className="text-muted-foreground text-sm">
                    Empresas aparecerão aqui quando se cadastrarem
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Candidates */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-600" />
                    Candidatos Recentes
                  </CardTitle>
                  <CardDescription>Últimos candidatos cadastrados</CardDescription>
                </div>
                <Badge variant="secondary">{candidates?.length || 0}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {candidatesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border-2 rounded-xl">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <div className="text-right space-y-2">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-3 w-12 ml-auto" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : candidates && candidates.length > 0 ? (
                <div className="space-y-3">
                  {candidates.slice(0, 5).map((candidate) => (
                    <div
                      key={candidate.id}
                      className="flex items-center justify-between p-4 border-2 rounded-xl hover:border-green-300 hover:bg-green-50/50 transition-all duration-200 cursor-pointer group"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm group-hover:text-green-600 transition-colors">{candidate.full_name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {candidate.email} • {candidate.education_level || 'Sem escolaridade'}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            candidate.status === 'active' ? 'default' :
                            candidate.status === 'employed' ? 'secondary' :
                            'outline'
                          }
                          className="mb-1"
                        >
                          {candidate.status === 'active' ? 'Ativo' : candidate.status === 'employed' ? 'Empregado' : 'Inativo'}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          {new Date(candidate.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Nenhum candidato cadastrado</h3>
                  <p className="text-muted-foreground text-sm">
                    Candidatos aparecerão aqui quando se cadastrarem
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </ContentTransition>
    </DashboardLayout>
  );
}
