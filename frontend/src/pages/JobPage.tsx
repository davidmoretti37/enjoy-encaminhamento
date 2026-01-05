// @ts-nocheck
import { useAuth } from "@/_core/hooks/useAuth";
import ClassicLoader from "@/components/ui/ClassicLoader";
import { useSchoolContext } from "@/contexts/SchoolContext";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import {
  Briefcase,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  Ban,
  Clock,
  Building,
  Users,
  Sparkles,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";

export default function JobPage() {
  const { user, loading: authLoading } = useAuth();
  const { currentSchool, isAllSchoolsMode } = useSchoolContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [matchingJobId, setMatchingJobId] = useState<string | null>(null);
  const [showMatchesDialog, setShowMatchesDialog] = useState(false);
  const [selectedJobForMatches, setSelectedJobForMatches] = useState<any>(null);

  // Determine role capabilities
  const isAffiliate = user?.role === 'affiliate';
  const isSchool = user?.role === 'school';
  const isAdmin = isAffiliate; // Affiliates have admin-like capabilities

  // Conditional tRPC queries based on role
  // Pass null explicitly for "All Schools" mode (currentSchool is null)
  const affiliateJobsQuery = trpc.affiliate.getJobs.useQuery(
    { schoolId: currentSchool?.id ?? null },
    { enabled: isAffiliate }
  );
  const schoolJobsQuery = trpc.school.getJobs.useQuery(undefined, { enabled: isSchool });

  // Select the right data based on role
  const jobs = isAffiliate ? affiliateJobsQuery.data : schoolJobsQuery.data;
  const refetchJobs = isAffiliate ? affiliateJobsQuery.refetch : schoolJobsQuery.refetch;
  const jobsLoading = affiliateJobsQuery.isLoading || schoolJobsQuery.isLoading;

  // Mutations (admin only)
  const updateStatusMutation = trpc.job.updateStatus.useMutation({
    onSuccess: () => refetchJobs()
  });

  // AI Matching mutations and queries
  const findCandidatesMutation = trpc.job.findCandidates.useMutation({
    onSuccess: () => {
      setMatchingJobId(null);
    },
    onError: (error) => {
      console.error('Matching error:', error);
      setMatchingJobId(null);
    }
  });

  const matchesQuery = trpc.job.getMatches.useQuery(
    { jobId: selectedJobForMatches?.id || '' },
    { enabled: !!selectedJobForMatches?.id && showMatchesDialog }
  );

  const isLoading = authLoading || jobsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClassicLoader />
      </div>
    );
  }

  if (!user || !['affiliate', 'school'].includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Você não tem permissão para acessar esta página.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Handlers (admin only)
  const handlePublish = async (jobId: string) => {
    await updateStatusMutation.mutateAsync({ id: jobId, status: 'open' });
  };

  const handleClose = async (jobId: string) => {
    await updateStatusMutation.mutateAsync({ id: jobId, status: 'closed' });
  };

  const handleMarkFilled = async (jobId: string) => {
    await updateStatusMutation.mutateAsync({ id: jobId, status: 'filled' });
  };

  // AI Matching handlers
  const handleFindCandidates = async (job: any) => {
    setMatchingJobId(job.id);
    try {
      await findCandidatesMutation.mutateAsync({ jobId: job.id, maxCandidates: 20 });
      // Open matches dialog after finding candidates
      setSelectedJobForMatches(job);
      setShowMatchesDialog(true);
    } catch (error) {
      console.error('Error finding candidates:', error);
    }
  };

  const handleViewMatches = (job: any) => {
    setSelectedJobForMatches(job);
    setShowMatchesDialog(true);
  };

  const getRecommendationBadge = (recommendation: string) => {
    switch (recommendation) {
      case 'highly_recommended':
        return <Badge className="bg-green-500">Altamente Recomendado</Badge>;
      case 'recommended':
        return <Badge className="bg-blue-500">Recomendado</Badge>;
      case 'consider':
        return <Badge className="bg-yellow-500 text-black">Considerar</Badge>;
      case 'not_recommended':
        return <Badge className="bg-red-500">Não Recomendado</Badge>;
      default:
        return <Badge>{recommendation}</Badge>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-green-500">Aberta</Badge>;
      case 'draft':
        return <Badge className="bg-gray-500">Rascunho</Badge>;
      case 'closed':
        return <Badge className="bg-red-500">Fechada</Badge>;
      case 'filled':
        return <Badge className="bg-blue-500">Preenchida</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getJobTypeBadge = (jobType: string) => {
    const types: Record<string, string> = {
      'full_time': 'Tempo Integral',
      'part_time': 'Meio Período',
      'contract': 'Contrato',
      'temporary': 'Temporário',
      'internship': 'Estágio'
    };
    return <Badge variant="outline">{types[jobType] || jobType}</Badge>;
  };

  // Filter jobs
  const filteredJobs = jobs?.filter((job: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const companyName = isAdmin ? job.companies?.company_name : job.company?.company_name;
    return (
      job.title?.toLowerCase().includes(searchLower) ||
      companyName?.toLowerCase().includes(searchLower) ||
      job.school?.school_name?.toLowerCase().includes(searchLower) ||
      job.city?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Briefcase className="h-7 w-7 text-blue-600" />
            Vagas
          </h1>
        </div>

        {/* Summary Cards */}
        <div className={`grid gap-6 ${isAdmin ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
          {!isAdmin && (
            <Card className="border-slate-200 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total de Vagas</CardTitle>
                <Briefcase className="h-5 w-5 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold mb-1 text-slate-900">{jobs?.length || 0}</div>
                <p className="text-xs text-slate-500">Vagas publicadas</p>
              </CardContent>
            </Card>
          )}

          <Card className="border-emerald-200 bg-emerald-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700">Vagas Abertas</CardTitle>
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-emerald-900">
                {jobs?.filter((j: any) => j.status === 'open').length || 0}
              </div>
              <p className="text-xs text-emerald-600">{isAdmin ? 'Atualmente disponíveis' : 'Aceitando candidaturas'}</p>
            </CardContent>
          </Card>

          {isAdmin ? (
            <Card className="border-slate-200 bg-slate-50/50 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700">Rascunhos</CardTitle>
                <Clock className="h-5 w-5 text-slate-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold mb-1 text-slate-900">
                  {jobs?.filter((j: any) => j.status === 'draft').length || 0}
                </div>
                <p className="text-xs text-slate-600">Aguardando publicação</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-blue-200 bg-blue-50/50 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-700">Preenchidas</CardTitle>
                <CheckCircle className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold mb-1 text-blue-900">
                  {jobs?.filter((j: any) => j.status === 'filled').length || 0}
                </div>
                <p className="text-xs text-blue-600">Vagas completas</p>
              </CardContent>
            </Card>
          )}

          <Card className={`${isAdmin ? "border-blue-200 bg-blue-50/50" : "border-red-200 bg-red-50/50"} shadow-md hover:shadow-lg transition-shadow`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${isAdmin ? 'text-blue-700' : 'text-red-700'}`}>
                {isAdmin ? 'Preenchidas' : 'Fechadas'}
              </CardTitle>
              {isAdmin ? <CheckCircle className="h-5 w-5 text-blue-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-semibold mb-1 ${isAdmin ? 'text-blue-900' : 'text-red-900'}`}>
                {jobs?.filter((j: any) => j.status === (isAdmin ? 'filled' : 'closed')).length || 0}
              </div>
              <p className={`text-xs ${isAdmin ? 'text-blue-600' : 'text-red-600'}`}>
                {isAdmin ? 'Vagas concluídas' : 'Não ativas'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-slate-600" />
              <CardTitle>Buscar Vagas</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={isAdmin ? "Buscar por título, empresa ou cidade..." : "Buscar por título, empresa, escola ou cidade..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Jobs Table */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle>{isAdmin ? 'Todas as Vagas' : 'Vagas da Região'}</CardTitle>
                <CardDescription>
                  {isAdmin ? 'Lista completa de vagas cadastradas na plataforma' : 'Lista de vagas publicadas pelas empresas na sua região'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredJobs && filteredJobs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Empresa</TableHead>
                    {isAllSchoolsMode && <TableHead>Escola</TableHead>}
                    <TableHead>Tipo</TableHead>
                    <TableHead>{isAdmin ? 'Localização' : 'Cidade'}</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Publicado</TableHead>
                    {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job: any) => {
                    const companyName = isAdmin ? job.companies?.company_name : job.company?.company_name;
                    return (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">{job.title}</TableCell>
                        <TableCell>{companyName || 'N/A'}</TableCell>
                        {isAllSchoolsMode && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-slate-400" />
                              <span className="text-sm">{job.school?.school_name || 'N/A'}</span>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>{getJobTypeBadge(job.job_type)}</TableCell>
                        <TableCell>
                          {isAdmin && job.remote ? (
                            <Badge variant="outline" className="bg-blue-50">Remoto</Badge>
                          ) : (
                            job.city || 'N/A'
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(job.status)}</TableCell>
                        <TableCell>
                          {(job.published_at || job.created_at) ? new Date(job.published_at || job.created_at).toLocaleDateString('pt-BR') : '-'}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {/* AI Matching buttons */}
                              {job.status === 'open' && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleFindCandidates(job)}
                                  disabled={matchingJobId === job.id || findCandidatesMutation.isPending}
                                  className="bg-purple-100 hover:bg-purple-200 text-purple-700"
                                >
                                  {matchingJobId === job.id ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                      Buscando...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="h-4 w-4 mr-1" />
                                      IA Buscar
                                    </>
                                  )}
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewMatches(job)}
                              >
                                <Users className="h-4 w-4 mr-1" />
                                Matches
                              </Button>
                              {job.status === 'draft' && (
                                <Button size="sm" variant="default" onClick={() => handlePublish(job.id)} disabled={updateStatusMutation.isPending}>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Publicar
                                </Button>
                              )}
                              {job.status === 'open' && (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => handleMarkFilled(job.id)} disabled={updateStatusMutation.isPending}>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Preencher
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleClose(job.id)} disabled={updateStatusMutation.isPending}>
                                    <Ban className="h-4 w-4 mr-1" />
                                    Fechar
                                  </Button>
                                </>
                              )}
                              {(job.status === 'closed' || job.status === 'filled') && (
                                <Button size="sm" variant="default" onClick={() => handlePublish(job.id)} disabled={updateStatusMutation.isPending}>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Reabrir
                                </Button>
                              )}
                              <Button size="sm" variant="outline" onClick={() => setSelectedJob(job.id)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm ? 'Nenhuma vaga encontrada' : 'Nenhuma vaga publicada'}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Tente ajustar os termos de busca' : 'Vagas aparecerão aqui quando forem publicadas'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Matches Dialog */}
        <Dialog open={showMatchesDialog} onOpenChange={setShowMatchesDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Candidatos Encontrados por IA
              </DialogTitle>
              <DialogDescription>
                {selectedJobForMatches?.title} - {selectedJobForMatches?.companies?.company_name}
              </DialogDescription>
            </DialogHeader>

            {matchesQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                <span className="ml-2">Carregando candidatos...</span>
              </div>
            ) : matchesQuery.data && matchesQuery.data.length > 0 ? (
              <div className="space-y-4">
                {matchesQuery.data.map((match: any) => (
                  <Card key={match.id} className="border hover:shadow-md transition-shadow">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            {match.candidates?.photo_url ? (
                              <img src={match.candidates.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <Users className="h-5 w-5 text-gray-500" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold">{match.candidates?.full_name || 'Candidato'}</h4>
                            <p className="text-sm text-muted-foreground">
                              {match.candidates?.city}, {match.candidates?.state} | {match.candidates?.education_level}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${getScoreColor(match.match_score)}`}>
                            {match.match_score}%
                          </div>
                          {getRecommendationBadge(match.recommendation)}
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-3 italic">
                        "{match.match_explanation}"
                      </p>

                      <div className="grid md:grid-cols-2 gap-4">
                        {match.strengths && match.strengths.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium flex items-center gap-1 text-green-700 mb-2">
                              <ThumbsUp className="h-4 w-4" />
                              Pontos Fortes
                            </h5>
                            <ul className="text-sm space-y-1">
                              {match.strengths.map((s: string, i: number) => (
                                <li key={i} className="flex items-start gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {match.concerns && match.concerns.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium flex items-center gap-1 text-amber-700 mb-2">
                              <AlertTriangle className="h-4 w-4" />
                              Pontos de Atencao
                            </h5>
                            <ul className="text-sm space-y-1">
                              {match.concerns.map((c: string, i: number) => (
                                <li key={i} className="flex items-start gap-2">
                                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                  <span>{c}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {match.candidates?.skills && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex flex-wrap gap-1">
                            {(Array.isArray(match.candidates.skills) ? match.candidates.skills : []).slice(0, 6).map((skill: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum candidato encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  Clique em "IA Buscar" para encontrar candidatos compativeis com esta vaga.
                </p>
                {selectedJobForMatches?.status === 'open' && (
                  <Button
                    onClick={() => {
                      setShowMatchesDialog(false);
                      handleFindCandidates(selectedJobForMatches);
                    }}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Buscar Candidatos com IA
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
