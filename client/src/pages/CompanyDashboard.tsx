import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { 
  Briefcase, 
  Users, 
  FileText, 
  Plus,
  TrendingUp,
  Building2,
  Loader2
} from "lucide-react";
import { Link, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";

export default function CompanyDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  const { data: companyProfile, isLoading: profileLoading } = trpc.company.getProfile.useQuery(undefined, {
    enabled: !!user && (user.role === 'company' || user.role === 'admin'),
  });
  
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.getCompanyStats.useQuery();
  const { data: jobs, isLoading: jobsLoading } = trpc.job.getByCompany.useQuery();
  const { data: contracts, isLoading: contractsLoading } = trpc.contract.getByCompany.useQuery();

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || (user.role !== 'company' && user.role !== 'admin' && user.role !== 'super_admin')) {
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

  if (!companyProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Complete seu Perfil</CardTitle>
            <CardDescription>
              Antes de começar, precisamos de algumas informações sobre sua empresa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/company/setup">
              <Button className="w-full">
                Configurar Perfil da Empresa
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard da Empresa</h1>
            <p className="text-muted-foreground">
              Bem-vindo, {companyProfile.companyName}
            </p>
          </div>
          <Link href="/company/jobs/new">
            <Button className="bg-gradient-brand shadow-glow">
              <Plus className="mr-2 h-4 w-4" />
              Nova Vaga
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Vagas</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.totalJobs || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.openJobs || 0} abertas
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contratos Ativos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.activeContracts || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.totalContracts || 0} total
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Preenchimento</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">85%</div>
              <p className="text-xs text-muted-foreground">
                +12% este mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Candidatos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">156</div>
              <p className="text-xs text-muted-foreground">
                23 novos esta semana
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Jobs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Vagas Recentes</CardTitle>
                <CardDescription>Suas últimas vagas publicadas</CardDescription>
              </div>
              <Link href="/company/jobs">
                <Button variant="outline" size="sm">Ver Todas</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : jobs && jobs.length > 0 ? (
              <div className="space-y-4">
                {jobs.slice(0, 5).map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setLocation(`/company/jobs/${job.id}`)}
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold">{job.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {job.contractType} • {job.workType} • {job.location || 'Remoto'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {job.status === 'open' ? (
                            <span className="text-green-600">Aberta</span>
                          ) : job.status === 'closed' ? (
                            <span className="text-gray-600">Fechada</span>
                          ) : (
                            <span className="text-yellow-600">Rascunho</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {job.openings} vaga{job.openings > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma vaga ainda</h3>
                <p className="text-muted-foreground mb-4">
                  Comece criando sua primeira vaga
                </p>
                <Link href="/company/jobs/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Vaga
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Contracts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Contratos Ativos</CardTitle>
                <CardDescription>Contratos em andamento</CardDescription>
              </div>
              <Link href="/company/contracts">
                <Button variant="outline" size="sm">Ver Todos</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {contractsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : contracts && contracts.filter(c => c.status === 'active').length > 0 ? (
              <div className="space-y-4">
                {contracts
                  .filter(c => c.status === 'active')
                  .slice(0, 5)
                  .map((contract) => (
                    <div
                      key={contract.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold">Contrato #{contract.contractNumber}</h4>
                        <p className="text-sm text-muted-foreground">
                          {contract.contractType} • Início: {new Date(contract.startDate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-600">Ativo</div>
                        <div className="text-xs text-muted-foreground">
                          R$ {(contract.monthlySalary / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum contrato ativo</h3>
                <p className="text-muted-foreground">
                  Contratos aparecerão aqui quando candidatos forem contratados
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
