import { useAuth } from "@/_core/hooks/useAuth";
import ContentTransition from "@/components/ui/ContentTransition";
import { StatsCardsSkeleton, ListSkeleton, PageHeaderSkeleton } from "@/components/ui/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  Building,
  Users,
  Briefcase,
  FileText,
  FileCheck,
  MapPin,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  DollarSign,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAgencyContext } from "@/contexts/AgencyContext";
import { useLocation } from "wouter";

export default function AffiliateDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { currentAgency } = useAgencyContext();

  const { data: affiliate, isLoading: affiliateLoading } = trpc.affiliate.getByUserId.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.affiliate.getDashboardStats.useQuery({ agencyId: currentAgency?.id ?? null });
  const { data: agencies, isLoading: agenciesLoading } = trpc.affiliate.getAgencies.useQuery();

  const isLoading = authLoading || affiliateLoading || statsLoading;

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Você precisa ser um franqueado para acessar esta página.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Perfil Não Encontrado</CardTitle>
            <CardDescription>Não foi possível encontrar seu perfil de franqueado.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const pendingAgencies = agencies?.filter((s: any) => s.status === 'pending') || [];

  return (
    <DashboardLayout>
      <ContentTransition
        isLoading={isLoading}
        skeleton={
          <div className="space-y-8">
            <PageHeaderSkeleton centered />
            <StatsCardsSkeleton count={4} />
            <ListSkeleton count={3} />
            <ListSkeleton count={5} />
          </div>
        }
      >
      <div className="space-y-8">
        {/* Header - Centered */}
        <div className="text-center py-4">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Gerencie sua região e acompanhe o desempenho</p>
        </div>

        {/* Pending Approvals Alert */}
        {pendingAgencies.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50 shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <CardTitle className="text-amber-900">
                    {pendingAgencies.length} {pendingAgencies.length === 1 ? 'Agência Aguardando' : 'Agências Aguardando'} Aprovação
                  </CardTitle>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setLocation('/admin/agencies')}
                  className="gap-2"
                >
                  Revisar Agora
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Summary Cards */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Visão Geral da Região</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-slate-200 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total de Agências</CardTitle>
                <Building className="h-5 w-5 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold mb-1 text-slate-900">
                  {stats?.totalAgencies || 0}
                </div>
                <p className="text-xs text-slate-500">
                  {stats?.activeAgencies || 0} ativas • {stats?.pendingAgencies || 0} pendentes
                </p>
              </CardContent>
            </Card>

            <Card className="border-emerald-200 bg-emerald-50/50 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-emerald-700">Candidatos</CardTitle>
                <Users className="h-5 w-5 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold mb-1 text-emerald-900">
                  {stats?.totalCandidates || 0}
                </div>
                <p className="text-xs text-emerald-600">
                  Cadastrados na região
                </p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/50 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-700">Vagas</CardTitle>
                <Briefcase className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold mb-1 text-blue-900">
                  {stats?.totalJobs || 0}
                </div>
                <p className="text-xs text-blue-600">
                  {stats?.openJobs || 0} abertas
                </p>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50/50 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-700">Contratos</CardTitle>
                <FileText className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold mb-1 text-purple-900">
                  {stats?.totalContracts || 0}
                </div>
                <p className="text-xs text-purple-600">
                  {stats?.activeContracts || 0} ativos
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Ações Rápidas</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow border-slate-200"
              onClick={() => setLocation('/admin/agencies')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building className="h-5 w-5 text-slate-600" />
                  Gerenciar Agências
                </CardTitle>
                <CardDescription>
                  Aprovar e gerenciar agências da sua região
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingAgencies.length > 0 && (
                  <Badge className="bg-amber-500">
                    {pendingAgencies.length} pendente{pendingAgencies.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow border-slate-200"
              onClick={() => setLocation('/companies')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building className="h-5 w-5 text-slate-600" />
                  Ver Empresas
                </CardTitle>
                <CardDescription>
                  Empresas cadastradas na região
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow border-slate-200"
              onClick={() => setLocation('/jobs')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Briefcase className="h-5 w-5 text-slate-600" />
                  Ver Vagas
                </CardTitle>
                <CardDescription>
                  {stats?.openJobs || 0} vagas abertas
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow border-slate-200"
              onClick={() => setLocation('/candidates')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-slate-600" />
                  Ver Candidatos
                </CardTitle>
                <CardDescription>
                  Candidatos da região
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow border-slate-200"
              onClick={() => setLocation('/contracts')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileCheck className="h-5 w-5 text-slate-600" />
                  Ver Contratos
                </CardTitle>
                <CardDescription>
                  {stats?.activeContracts || 0} contratos ativos
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow border-slate-200"
              onClick={() => setLocation('/payments')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5 text-slate-600" />
                  Ver Pagamentos
                </CardTitle>
                <CardDescription>
                  Receitas e comissões
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Recent Agencies */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Agências Recentes</CardTitle>
                <CardDescription>
                  Últimas agências cadastradas na sua região
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation('/admin/agencies')}
              >
                Ver Todas
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {agenciesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : agencies && agencies.length > 0 ? (
              <div className="space-y-3">
                {agencies.slice(0, 5).map((agency: any) => (
                  <div
                    key={agency.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Building className="h-8 w-8 text-slate-400" />
                      <div>
                        <p className="font-medium">{agency.agency_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {agency.city || 'Cidade não informada'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {agency.status === 'pending' && (
                        <Badge className="bg-amber-500">
                          <Clock className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
                      )}
                      {agency.status === 'active' && (
                        <Badge className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Ativa
                        </Badge>
                      )}
                      {agency.status === 'suspended' && (
                        <Badge className="bg-red-500">
                          Suspensa
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-20 h-24 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50 flex flex-col items-center justify-center gap-2 mb-6">
                  <Building className="h-8 w-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-500 mb-1">Nenhuma agência cadastrada</h3>
                <p className="text-gray-400 text-sm">Agências aparecerão aqui quando se registrarem na sua região</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </ContentTransition>
    </DashboardLayout>
  );
}
