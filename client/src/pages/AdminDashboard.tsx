import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  Briefcase,
  Users,
  FileText,
  Building2,
  TrendingUp,
  Loader2
} from "lucide-react";
import { Link, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: statsLoading } = trpc.dashboard.getStats.useQuery();
  const { data: companies, isLoading: companiesLoading } = trpc.company.getAll.useQuery();
  const { data: candidates, isLoading: candidatesLoading } = trpc.candidate.getAll.useQuery();

  if (authLoading || statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Você precisa ser um administrador para acessar esta página.</CardDescription>
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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard Administrativo</h1>
            <p className="text-muted-foreground">
              Bem-vindo, {user.name || user.email}
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.totalCompanies || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Empresas cadastradas
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Candidatos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.totalCandidates || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Candidatos ativos
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vagas Abertas</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.totalOpenJobs || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Vagas disponíveis
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
                    Contratos em andamento
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aplicações Pendentes</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.pendingApplications || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Aguardando análise
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Companies */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Empresas Recentes</CardTitle>
                <CardDescription>Últimas empresas cadastradas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {companiesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : companies && companies.length > 0 ? (
              <div className="space-y-4">
                {companies.slice(0, 5).map((company) => (
                  <div
                    key={company.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold">{company.companyName}</h4>
                      <p className="text-sm text-muted-foreground">
                        {company.email} • {company.city || 'Sem localização'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {company.status === 'active' ? (
                          <span className="text-green-600">Ativa</span>
                        ) : company.status === 'pending' ? (
                          <span className="text-yellow-600">Pendente</span>
                        ) : (
                          <span className="text-gray-600">Suspensa</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(company.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma empresa cadastrada</h3>
                <p className="text-muted-foreground">
                  Empresas aparecerão aqui quando se cadastrarem
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Candidates */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Candidatos Recentes</CardTitle>
                <CardDescription>Últimos candidatos cadastrados</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {candidatesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : candidates && candidates.length > 0 ? (
              <div className="space-y-4">
                {candidates.slice(0, 5).map((candidate) => (
                  <div
                    key={candidate.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold">{candidate.fullName}</h4>
                      <p className="text-sm text-muted-foreground">
                        {candidate.email} • {candidate.educationLevel || 'Sem escolaridade'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {candidate.status === 'active' ? (
                          <span className="text-green-600">Ativo</span>
                        ) : candidate.status === 'employed' ? (
                          <span className="text-blue-600">Empregado</span>
                        ) : (
                          <span className="text-gray-600">Inativo</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(candidate.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum candidato cadastrado</h3>
                <p className="text-muted-foreground">
                  Candidatos aparecerão aqui quando se cadastrarem
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
