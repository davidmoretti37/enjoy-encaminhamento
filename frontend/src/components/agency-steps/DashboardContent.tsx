import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  Users,
  FileText,
  CheckCircle,
  Briefcase
} from "lucide-react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/_core/hooks/useAuth";
import { useAgencyContext } from "@/contexts/AgencyContext";

export default function DashboardContent() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { isAllAgenciesMode, isServerSynced } = useAgencyContext();
  const isTodasMode = (user?.role === 'admin' || user?.role === 'super_admin') && isAllAgenciesMode;
  const agencyQueriesEnabled = !isTodasMode && isServerSynced;

  // Agency-specific queries (disabled in Todas mode or before server sync)
  const { data: agencyStats } = trpc.agency.getDashboardStats.useQuery(undefined, { enabled: agencyQueriesEnabled });
  const { data: agencyCandidates, isLoading: agencyCandidatesLoading } = trpc.agency.getCandidates.useQuery(undefined, { enabled: agencyQueriesEnabled });
  const { data: agencyApplications, isLoading: agencyApplicationsLoading } = trpc.agency.getApplications.useQuery(undefined, { enabled: agencyQueriesEnabled });

  // Affiliate-level queries (enabled in Todas mode)
  const { data: affiliateStats } = trpc.affiliate.getDashboardStats.useQuery({ agencyId: null }, { enabled: isTodasMode });
  const { data: affiliateCandidates, isLoading: affiliateCandidatesLoading } = trpc.affiliate.getCandidates.useQuery({ agencyId: null }, { enabled: isTodasMode });
  const { data: affiliateApplications, isLoading: affiliateApplicationsLoading } = trpc.affiliate.getApplications.useQuery({ agencyId: null }, { enabled: isTodasMode });

  const stats = isTodasMode ? affiliateStats : agencyStats;
  const candidates = isTodasMode ? affiliateCandidates : agencyCandidates;
  const candidatesLoading = isTodasMode ? affiliateCandidatesLoading : agencyCandidatesLoading;
  const applications = isTodasMode ? affiliateApplications : agencyApplications;
  const applicationsLoading = isTodasMode ? affiliateApplicationsLoading : agencyApplicationsLoading;

  return (
    <div className="space-y-8">
      {/* Header - Centered */}
      <div className="text-center py-4">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Acompanhe seus candidatos e candidaturas</p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:border-gray-300 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Candidatos Ativos</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-gray-900 flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats?.activeCandidates || 0}</div>
            <p className="text-sm text-gray-500 mt-1">
              {stats?.totalCandidates || 0} total cadastrados
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-gray-300 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Candidaturas Ativas</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-gray-900 flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats?.activeApplications || 0}</div>
            <p className="text-sm text-gray-500 mt-1">
              {stats?.totalApplications || 0} candidaturas totais
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-gray-300 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Candidatos Contratados</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-gray-900 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats?.totalHired || 0}</div>
            <p className="text-sm text-gray-500 mt-1">
              {stats?.employedCandidates || 0} atualmente empregados
            </p>
          </CardContent>
        </Card>

        <button onClick={() => setLocation("/agency/portal?tab=job-description")}>
          <Card className="hover:border-orange-500 hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-orange-50 to-amber-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-900">Vagas e Candidatos</CardTitle>
              <div className="h-9 w-9 rounded-lg bg-orange-600 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">Gerenciar</div>
              <p className="text-sm text-orange-700 mt-1">
                Ver vagas de empresas parceiras
              </p>
            </CardContent>
          </Card>
        </button>
      </div>

      {/* Recent Activity Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Candidates */}
        <Card className="hover:border-gray-300 transition-colors">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Candidatos Recentes</CardTitle>
                <CardDescription>Últimos candidatos cadastrados</CardDescription>
              </div>
              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                {candidates?.length || 0}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {candidatesLoading ? (
              <div className="space-y-3 py-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : candidates && candidates.length > 0 ? (
              <div className="space-y-2">
                {candidates.slice(0, 5).map((candidate: any) => (
                  <div
                    key={candidate.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                    onClick={() => setLocation('/agency/portal?tab=management')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gray-900 flex items-center justify-center text-white font-medium text-sm">
                        {candidate.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-gray-900 group-hover:text-gray-700">{candidate.full_name}</h4>
                        <p className="text-xs text-gray-500">
                          {candidate.education_level || 'Sem escolaridade'}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        candidate.status === 'active' ? 'default' :
                        candidate.status === 'employed' ? 'secondary' :
                        'outline'
                      }
                    >
                      {candidate.status === 'active' ? 'Ativo' : candidate.status === 'employed' ? 'Empregado' : 'Inativo'}
                    </Badge>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  className="w-full mt-2 text-gray-600 hover:text-gray-900"
                  onClick={() => setLocation('/agency/portal?tab=management')}
                >
                  Ver todos os candidatos
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-base font-medium text-gray-700 mb-1">Nenhum candidato</h3>
                <p className="text-gray-500 text-sm">Cadastre candidatos para começar</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Applications */}
        <Card className="hover:border-gray-300 transition-colors">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Candidaturas Recentes</CardTitle>
                <CardDescription>Últimas candidaturas dos seus alunos</CardDescription>
              </div>
              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                {applications?.length || 0}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {applicationsLoading ? (
              <div className="space-y-3 py-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : applications && applications.length > 0 ? (
              <div className="space-y-2">
                {applications.slice(0, 5).map((application: any) => (
                  <div
                    key={application.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gray-900 flex items-center justify-center text-white font-medium text-sm">
                        {application.candidates?.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-gray-900">{application.candidates?.full_name}</h4>
                        <p className="text-xs text-gray-500">
                          {application.jobs?.title}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        application.status === 'selected' ? 'default' :
                        application.status === 'interviewing' ? 'secondary' :
                        'outline'
                      }
                    >
                      {application.status === 'selected' ? 'Selecionado' :
                       application.status === 'interviewing' ? 'Entrevista' :
                       application.status === 'in_progress' ? 'Em Análise' :
                       'Pendente'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-base font-medium text-gray-700 mb-1">Nenhuma candidatura</h3>
                <p className="text-gray-500 text-sm text-center">Candidaturas aparecerão aqui quando<br/>seus alunos se candidatarem</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
