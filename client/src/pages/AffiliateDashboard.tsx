import { useAuth } from "@/_core/hooks/useAuth";
import ClassicLoader from "@/components/ui/ClassicLoader";
import { useAgentContext } from "@/hooks/useAgentContext";
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
import { useLocation } from "wouter";

export default function AffiliateDashboard() {
  useAgentContext('escolas');
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: affiliate, isLoading: affiliateLoading } = trpc.affiliate.getByUserId.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.affiliate.getDashboardStats.useQuery();
  const { data: schools, isLoading: schoolsLoading } = trpc.affiliate.getSchools.useQuery();

  const isLoading = authLoading || affiliateLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClassicLoader />
      </div>
    );
  }

  if (!user || user.role !== 'affiliate') {
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

  const pendingSchools = schools?.filter((s: any) => s.status === 'pending') || [];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-lg bg-slate-900 p-8 text-white shadow-lg border border-slate-800">
          <div className="relative">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-semibold flex items-center gap-3 mb-2">
                  <MapPin className="h-10 w-10" />
                  Dashboard Franqueado
                </h1>
                <p className="text-slate-300 text-lg">
                  Bem-vindo, {affiliate.name}
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  Cidade: {affiliate.city} • Comissão: {affiliate.commission_rate}%
                </p>
              </div>
              {!affiliate.is_active && (
                <Badge className="bg-red-500 text-white">
                  Conta Inativa
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Pending Approvals Alert */}
        {pendingSchools.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50 shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <CardTitle className="text-amber-900">
                    {pendingSchools.length} {pendingSchools.length === 1 ? 'Escola Aguardando' : 'Escolas Aguardando'} Aprovação
                  </CardTitle>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setLocation('/affiliate/schools')}
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
                <CardTitle className="text-sm font-medium text-slate-600">Total de Escolas</CardTitle>
                <Building className="h-5 w-5 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold mb-1 text-slate-900">
                  {stats?.totalSchools || 0}
                </div>
                <p className="text-xs text-slate-500">
                  {stats?.activeSchools || 0} ativas • {stats?.pendingSchools || 0} pendentes
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
              onClick={() => setLocation('/affiliate/schools')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building className="h-5 w-5 text-slate-600" />
                  Gerenciar Escolas
                </CardTitle>
                <CardDescription>
                  Aprovar e gerenciar escolas da sua região
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingSchools.length > 0 && (
                  <Badge className="bg-amber-500">
                    {pendingSchools.length} pendente{pendingSchools.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow border-slate-200"
              onClick={() => setLocation('/affiliate/companies')}
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
              onClick={() => setLocation('/affiliate/jobs')}
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
              onClick={() => setLocation('/affiliate/candidates')}
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
              onClick={() => setLocation('/affiliate/contracts')}
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
              onClick={() => setLocation('/affiliate/payments')}
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

        {/* Recent Schools */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Escolas Recentes</CardTitle>
                <CardDescription>
                  Últimas escolas cadastradas na sua região
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation('/affiliate/schools')}
              >
                Ver Todas
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {schoolsLoading ? (
              <div className="flex justify-center py-8">
                <ClassicLoader />
              </div>
            ) : schools && schools.length > 0 ? (
              <div className="space-y-3">
                {schools.slice(0, 5).map((school: any) => (
                  <div
                    key={school.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Building className="h-8 w-8 text-slate-400" />
                      <div>
                        <p className="font-medium">{school.school_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {school.city || 'Cidade não informada'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {school.status === 'pending' && (
                        <Badge className="bg-amber-500">
                          <Clock className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
                      )}
                      {school.status === 'active' && (
                        <Badge className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Ativa
                        </Badge>
                      )}
                      {school.status === 'suspended' && (
                        <Badge className="bg-red-500">
                          Suspensa
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma escola cadastrada</h3>
                <p className="text-muted-foreground">
                  Escolas aparecerão aqui quando se registrarem na sua região
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
