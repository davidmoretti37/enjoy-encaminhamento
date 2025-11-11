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
  Loader2,
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

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: statsLoading } = trpc.dashboard.getStats.useQuery();
  const { data: adminStats, isLoading: adminStatsLoading } = trpc.admin.getStats.useQuery();
  const { data: companies, isLoading: companiesLoading } = trpc.company.getAll.useQuery();
  const { data: candidates, isLoading: candidatesLoading } = trpc.candidate.getAll.useQuery();

  if (authLoading || statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

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
      <div className="space-y-8">
        {/* Hero Header with Gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
          <div className="relative">
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <GraduationCap className="h-10 w-10" />
              Dashboard Administrativo
            </h1>
          </div>
        </div>

        {/* Stats Overview */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Visão Geral da Plataforma</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-100">Empresas</CardTitle>
                <Building2 className="h-5 w-5 text-blue-200" />
              </CardHeader>
              <CardContent>
                {adminStatsLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <>
                    <div className="text-3xl font-bold mb-1">{adminStats?.totalCompanies || 0}</div>
                    <p className="text-xs text-blue-100">
                      {adminStats?.activeCompanies || 0} ativas • {adminStats?.pendingCompanies || 0} pendentes
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-100">Candidatos</CardTitle>
                <Users className="h-5 w-5 text-green-200" />
              </CardHeader>
              <CardContent>
                {adminStatsLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <>
                    <div className="text-3xl font-bold mb-1">{adminStats?.totalCandidates || 0}</div>
                    <p className="text-xs text-green-100">
                      {adminStats?.activeCandidates || 0} ativos • {adminStats?.employedCandidates || 0} empregados
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-100">Vagas</CardTitle>
                <Briefcase className="h-5 w-5 text-orange-200" />
              </CardHeader>
              <CardContent>
                {adminStatsLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <>
                    <div className="text-3xl font-bold mb-1">{adminStats?.totalJobs || 0}</div>
                    <p className="text-xs text-orange-100">
                      {adminStats?.openJobs || 0} abertas • {adminStats?.filledJobs || 0} preenchidas
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-100">Candidaturas</CardTitle>
                <FileText className="h-5 w-5 text-purple-200" />
              </CardHeader>
              <CardContent>
                {adminStatsLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <>
                    <div className="text-3xl font-bold mb-1">{adminStats?.totalApplications || 0}</div>
                    <p className="text-xs text-purple-100">
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
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : companies && companies.length > 0 ? (
                <div className="space-y-3">
                  {companies.slice(0, 5).map((company) => (
                    <div
                      key={company.id}
                      className="flex items-center justify-between p-4 border-2 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 cursor-pointer group"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm group-hover:text-blue-600 transition-colors">{company.companyName}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {company.email} • {company.city || 'Sem localização'}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={company.status === 'active' ? 'default' : company.status === 'pending' ? 'secondary' : 'destructive'} className="mb-1">
                          {company.status === 'active' ? 'Ativa' : company.status === 'pending' ? 'Pendente' : 'Suspensa'}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          {new Date(company.createdAt).toLocaleDateString('pt-BR')}
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
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : candidates && candidates.length > 0 ? (
                <div className="space-y-3">
                  {candidates.slice(0, 5).map((candidate) => (
                    <div
                      key={candidate.id}
                      className="flex items-center justify-between p-4 border-2 rounded-xl hover:border-green-300 hover:bg-green-50/50 transition-all duration-200 cursor-pointer group"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm group-hover:text-green-600 transition-colors">{candidate.fullName}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {candidate.email} • {candidate.educationLevel || 'Sem escolaridade'}
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
                          {new Date(candidate.createdAt).toLocaleDateString('pt-BR')}
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
    </DashboardLayout>
  );
}
