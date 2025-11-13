import { useAuth } from "@/_core/hooks/useAuth";
import ClassicLoader from "@/components/ui/ClassicLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  Brain,
  Loader2,
  TrendingUp,
  Target,
  Search,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { useLocation } from "wouter";

export default function AIMatchingManagement() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: matchingStats, isLoading: statsLoading } = trpc.admin.getAIMatchingStats.useQuery();
  const { data: applications, isLoading: appsLoading } = trpc.admin.getApplicationsWithScores.useQuery();

  const isLoading = statsLoading || appsLoading;

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClassicLoader />
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Você precisa ser um administrador para acessar esta página.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const getScoreBadge = (score: number | null) => {
    if (score === null || score === undefined) {
      return <Badge variant="outline">Sem Score</Badge>;
    }

    if (score >= 75) {
      return (
        <Badge className="bg-green-500 text-white">
          Alta Qualidade ({score}%)
        </Badge>
      );
    } else if (score >= 50) {
      return (
        <Badge className="bg-yellow-500 text-white">
          Média ({score}%)
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-500 text-white">
          Baixa ({score}%)
        </Badge>
      );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'selected':
        return <Badge className="bg-green-500">Selecionado</Badge>;
      case 'interview-scheduled':
      case 'interviewed':
        return <Badge className="bg-blue-500">Em Entrevista</Badge>;
      case 'screening':
        return <Badge className="bg-yellow-500">Triagem</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">Rejeitado</Badge>;
      case 'withdrawn':
        return <Badge className="bg-gray-500">Desistiu</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Filter applications based on search term
  const filteredApplications = applications?.filter((app: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      app.candidates?.full_name?.toLowerCase().includes(searchLower) ||
      app.jobs?.title?.toLowerCase().includes(searchLower) ||
      app.companies?.companies?.company_name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation("/admin/dashboard")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Dashboard
        </Button>

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-lg bg-slate-900 p-8 text-white shadow-lg border border-slate-800">
          <div className="relative">
            <h1 className="text-4xl font-semibold flex items-center gap-3 mb-2">
              <Brain className="h-10 w-10" />
              Supervisão de Matching IA
            </h1>
            <p className="text-slate-300 text-lg">
              Monitorar qualidade e eficácia do sistema de matching inteligente
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="border-slate-200 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total de Matches</CardTitle>
              <Brain className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-slate-900">{matchingStats?.totalMatches || 0}</div>
              <p className="text-xs text-slate-500">Candidaturas analisadas</p>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-700">Score Médio</CardTitle>
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-amber-900">{matchingStats?.averageScore || 0}%</div>
              <p className="text-xs text-amber-600">Qualidade geral dos matches</p>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700">Alta Qualidade</CardTitle>
              <Target className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-emerald-900">{matchingStats?.highQualityMatches || 0}</div>
              <p className="text-xs text-emerald-600">Matches ≥75%</p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Taxa de Sucesso</CardTitle>
              <Sparkles className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-blue-900">{matchingStats?.successRate || 0}%</div>
              <p className="text-xs text-blue-600">Conversão para seleção</p>
            </CardContent>
          </Card>
        </div>

        {/* Quality Distribution */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <div>
                <CardTitle>Distribuição de Qualidade</CardTitle>
                <CardDescription>Breakdown dos scores de matching</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-red-50">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-red-900">Baixa Qualidade</p>
                    <p className="text-xs text-red-600">&lt; 50%</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {matchingStats?.lowScoreMatches || 0}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-8 w-8 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Qualidade Média</p>
                    <p className="text-xs text-yellow-600">50-74%</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-yellow-600">
                  {matchingStats?.mediumScoreMatches || 0}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Alta Qualidade</p>
                    <p className="text-xs text-green-600">≥ 75%</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {matchingStats?.highQualityMatches || 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-slate-600" />
              <CardTitle>Buscar Candidaturas</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por candidato, vaga ou empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Applications with Scores Table */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-orange-600" />
              <div>
                <CardTitle>Candidaturas com Score IA</CardTitle>
                <CardDescription>Todas as candidaturas analisadas pelo sistema de matching</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredApplications && filteredApplications.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidato</TableHead>
                    <TableHead>Vaga</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Score IA</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data de Candidatura</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((application: any) => (
                    <TableRow key={application.id}>
                      <TableCell className="font-medium">
                        {application.candidates?.full_name || 'N/A'}
                      </TableCell>
                      <TableCell>{application.jobs?.title || 'N/A'}</TableCell>
                      <TableCell>
                        {application.companies?.companies?.company_name ||
                         application.jobs?.companies?.company_name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {getScoreBadge(application.ai_match_score)}
                      </TableCell>
                      <TableCell>{getStatusBadge(application.status)}</TableCell>
                      <TableCell>
                        {application.applied_at
                          ? new Date(application.applied_at).toLocaleDateString('pt-BR')
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma candidatura encontrada</h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? 'Tente ajustar seus critérios de busca'
                    : 'Candidaturas com score IA aparecerão aqui quando forem analisadas'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
