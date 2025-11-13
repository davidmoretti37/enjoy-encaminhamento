import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  Users,
  FileText,
  CheckCircle,
  TrendingUp,
  GraduationCap,
  ShieldCheck,
  Briefcase
} from "lucide-react";
import { Link, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import ClassicLoader from "@/components/ui/ClassicLoader";

export default function SchoolDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: statsLoading } = trpc.school.getDashboardStats.useQuery();
  const { data: school, isLoading: schoolLoading } = trpc.school.getProfile.useQuery();
  const { data: candidates, isLoading: candidatesLoading } = trpc.school.getCandidates.useQuery();
  const { data: applications, isLoading: applicationsLoading } = trpc.school.getApplications.useQuery();

  if (authLoading || statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <ClassicLoader />
          </div>
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'school') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Card className="max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-red-500" />
              Acesso Negado
            </CardTitle>
            <CardDescription>Você precisa ser uma escola para acessar esta página.</CardDescription>
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
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white shadow-lg">
          <div className="relative">
            <h1 className="text-4xl font-semibold flex items-center gap-3">
              <GraduationCap className="h-10 w-10" />
              Dashboard da Escola
            </h1>
            <p className="mt-2 text-blue-100">
              Bem-vindo(a), {school?.school_name || user?.name}!
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Visão Geral</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-emerald-200 bg-emerald-50/50 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-emerald-700">Candidatos Ativos</CardTitle>
                <Users className="h-5 w-5 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold mb-1 text-emerald-900">{stats?.activeCandidates || 0}</div>
                <p className="text-xs text-emerald-600">
                  {stats?.totalCandidates || 0} total cadastrados
                </p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/50 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-700">Candidaturas Ativas</CardTitle>
                <FileText className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold mb-1 text-blue-900">{stats?.activeApplications || 0}</div>
                <p className="text-xs text-blue-600">
                  {stats?.totalApplications || 0} candidaturas totais
                </p>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50/50 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-700">Candidatos Contratados</CardTitle>
                <CheckCircle className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold mb-1 text-purple-900">{stats?.totalHired || 0}</div>
                <p className="text-xs text-purple-600">
                  {stats?.employedCandidates || 0} atualmente empregados
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Candidates */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
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
                  <ClassicLoader />
                </div>
              ) : candidates && candidates.length > 0 ? (
                <div className="space-y-3">
                  {candidates.slice(0, 5).map((candidate: any) => (
                    <div
                      key={candidate.id}
                      className="flex items-center justify-between p-4 border-2 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 cursor-pointer group"
                      onClick={() => setLocation('/school/candidates')}
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm group-hover:text-blue-600 transition-colors">{candidate.full_name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {candidate.users?.email} • {candidate.education_level || 'Sem escolaridade'}
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
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => setLocation('/school/candidates')}
                  >
                    Ver Todos os Candidatos
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Nenhum candidato cadastrado</h3>
                  <p className="text-muted-foreground text-sm">
                    Cadastre candidatos para começar
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Applications */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-green-600" />
                    Candidaturas Recentes
                  </CardTitle>
                  <CardDescription>Últimas candidaturas dos seus alunos</CardDescription>
                </div>
                <Badge variant="secondary">{applications?.length || 0}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {applicationsLoading ? (
                <div className="flex justify-center py-8">
                  <ClassicLoader />
                </div>
              ) : applications && applications.length > 0 ? (
                <div className="space-y-3">
                  {applications.slice(0, 5).map((application: any) => (
                    <div
                      key={application.id}
                      className="flex items-center justify-between p-4 border-2 rounded-xl hover:border-green-300 hover:bg-green-50/50 transition-all duration-200"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{application.candidates?.full_name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {application.jobs?.title} • {application.jobs?.companies?.company_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            application.status === 'selected' ? 'default' :
                            application.status === 'interviewing' ? 'secondary' :
                            'outline'
                          }
                          className="mb-1"
                        >
                          {application.status === 'selected' ? 'Selecionado' :
                           application.status === 'interviewing' ? 'Entrevista' :
                           application.status === 'in_progress' ? 'Em Análise' :
                           'Pendente'}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          {new Date(application.applied_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Nenhuma candidatura</h3>
                  <p className="text-muted-foreground text-sm">
                    Candidaturas aparecerão aqui quando seus alunos se candidatarem
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
