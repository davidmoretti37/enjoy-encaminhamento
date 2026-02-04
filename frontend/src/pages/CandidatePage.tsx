// @ts-nocheck
import { useAuth } from "@/_core/hooks/useAuth";
import ClassicLoader from "@/components/ui/ClassicLoader";
import { useAgencyContext } from "@/contexts/AgencyContext";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  Users,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  UserCheck,
  UserX,
  Building,
  FileText,
  Clock,
  Calendar,
  Upload,
  X,
  Loader2,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import ImportCandidatesModal from "@/components/ImportCandidatesModal";
import { useState } from "react";
import { toast } from "sonner";

export default function CandidatePage() {
  const { user, loading: authLoading } = useAuth();
  const { currentAgency, isAllAgenciesMode } = useAgencyContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [applicationSearchTerm, setApplicationSearchTerm] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [smartSearchIds, setSmartSearchIds] = useState<Set<string> | null>(null);

  const smartSearchMutation = trpc.candidate.smartSearch.useMutation({
    onSuccess: (results) => {
      if (results.length === 0) {
        toast.info('Nenhum candidato encontrado para essa busca');
        setSmartSearchIds(null);
      } else {
        setSmartSearchIds(new Set(results.map((r: any) => r.candidateId)));
        toast.success(`${results.length} candidato(s) encontrado(s)`);
      }
    },
    onError: () => {
      toast.error('Erro ao realizar busca inteligente');
    },
  });

  const handleSmartSearch = () => {
    if (searchTerm.trim().length >= 3) {
      smartSearchMutation.mutate({ query: searchTerm.trim() });
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSmartSearchIds(null);
  };

  // Determine role capabilities
  const isAffiliate = user?.role === 'admin';
  const isAgency = user?.role === 'agency';
  const isAdmin = isAffiliate; // Affiliates have admin-like capabilities

  // Conditional tRPC queries based on role
  // Affiliate uses affiliate queries with agency filtering
  // Pass null explicitly for "All Agencies" mode (currentAgency is null)
  const affiliateCandidatesQuery = trpc.affiliate.getCandidates.useQuery(
    { agencyId: currentAgency?.id ?? null },
    { enabled: isAffiliate }
  );
  const affiliateApplicationsQuery = trpc.affiliate.getApplications.useQuery(
    { agencyId: currentAgency?.id ?? null },
    { enabled: isAffiliate }
  );

  // Agency uses agency queries
  const agencyCandidatesQuery = trpc.agency.getCandidates.useQuery(undefined, { enabled: isAgency });
  const agencyApplicationsQuery = trpc.agency.getApplications.useQuery(undefined, { enabled: isAgency });

  // Select the right data based on role
  const candidates = isAffiliate ? affiliateCandidatesQuery.data : agencyCandidatesQuery.data;
  const applications = isAffiliate ? affiliateApplicationsQuery.data : agencyApplicationsQuery.data;
  const refetchCandidates = isAffiliate ? affiliateCandidatesQuery.refetch : agencyCandidatesQuery.refetch;
  const refetchApplications = isAffiliate ? affiliateApplicationsQuery.refetch : agencyApplicationsQuery.refetch;

  const candidatesLoading = affiliateCandidatesQuery.isLoading || agencyCandidatesQuery.isLoading;
  const applicationsLoading = affiliateApplicationsQuery.isLoading || agencyApplicationsQuery.isLoading;

  // Mutations (admin only)
  const updateCandidateStatusMutation = trpc.candidate.updateStatus.useMutation({
    onSuccess: () => refetchCandidates()
  });

  const updateApplicationStatusMutation = trpc.admin.updateApplicationStatus.useMutation({
    onSuccess: () => refetchApplications()
  });

  const isLoading = authLoading || candidatesLoading || applicationsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClassicLoader />
      </div>
    );
  }

  if (!user || !['admin', 'agency'].includes(user.role)) {
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
  const handleActivate = async (candidateId: string) => {
    await updateCandidateStatusMutation.mutateAsync({ id: candidateId, status: 'active' });
  };

  const handleDeactivate = async (candidateId: string) => {
    await updateCandidateStatusMutation.mutateAsync({ id: candidateId, status: 'inactive' });
  };

  const handleMarkEmployed = async (candidateId: string) => {
    await updateCandidateStatusMutation.mutateAsync({ id: candidateId, status: 'employed' });
  };

  const handleApprove = async (applicationId: string) => {
    await updateApplicationStatusMutation.mutateAsync({ id: applicationId, status: 'selected' });
  };

  const handleReject = async (applicationId: string) => {
    await updateApplicationStatusMutation.mutateAsync({ id: applicationId, status: 'rejected' });
  };

  const handleScheduleInterview = async (applicationId: string) => {
    await updateApplicationStatusMutation.mutateAsync({ id: applicationId, status: 'interview-scheduled' });
  };

  const getCandidateStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Ativo</Badge>;
      case 'employed':
        return <Badge className="bg-blue-500">Empregado</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-500">Inativo</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getApplicationStatusBadge = (status: string) => {
    switch (status) {
      case 'applied':
        return <Badge className="bg-blue-500">Candidatado</Badge>;
      case 'screening':
        return <Badge className="bg-purple-500">Triagem</Badge>;
      case 'interview-scheduled':
        return <Badge className="bg-yellow-500">Entrevista Agendada</Badge>;
      case 'interviewed':
        return <Badge className="bg-orange-500">Entrevistado</Badge>;
      case 'selected':
        return <Badge className="bg-green-500">Selecionado</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">Rejeitado</Badge>;
      case 'withdrawn':
        return <Badge className="bg-gray-500">Desistiu</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getEducationLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      'fundamental': 'Fundamental',
      'medio': 'Médio',
      'superior': 'Superior',
      'pos-graduacao': 'Pós-graduação',
      'mestrado': 'Mestrado',
      'doutorado': 'Doutorado'
    };
    return labels[level] || level;
  };

  // Filter candidates
  const filteredCandidates = candidates?.filter((candidate: any) => {
    // AI search active: filter by matching IDs
    if (smartSearchIds) {
      return smartSearchIds.has(candidate.id);
    }
    // Text search
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const email = isAdmin ? candidate.users?.email : candidate.email;
    return (
      candidate.full_name?.toLowerCase().includes(searchLower) ||
      candidate.cpf?.includes(searchTerm) ||
      email?.toLowerCase().includes(searchLower) ||
      candidate.city?.toLowerCase().includes(searchLower) ||
      candidate.agency?.name?.toLowerCase().includes(searchLower)
    );
  });

  // Filter applications
  const filteredApplications = applications?.filter((app: any) => {
    if (!applicationSearchTerm) return true;
    const searchLower = applicationSearchTerm.toLowerCase();
    const candidateName = isAdmin ? app.candidates?.full_name : app.candidate?.full_name;
    const jobTitle = isAdmin ? app.jobs?.title : app.job?.title;
    const companyName = app.job?.company?.company_name;
    const email = isAdmin ? app.candidates?.email : app.candidate?.email;
    return (
      candidateName?.toLowerCase().includes(searchLower) ||
      jobTitle?.toLowerCase().includes(searchLower) ||
      companyName?.toLowerCase().includes(searchLower) ||
      email?.toLowerCase().includes(searchLower)
    );
  });

  const getDescriptionText = () => {
    if (isAdmin) return 'Lista completa de candidatos cadastrados na plataforma';
    if (isAffiliate) return 'Lista de candidatos cadastrados nas escolas da sua região';
    return 'Lista de candidatos cadastrados na sua escola';
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Candidatos</h1>
            <p className="text-gray-500 mt-1">Gerencie candidatos e processos seletivos</p>
          </div>
          {(isAgency || isAffiliate) && (
            <Button onClick={() => setShowImportModal(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              Importar Candidatos
            </Button>
          )}
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar candidatos... (Enter para busca inteligente)"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (!e.target.value) {
                  setSmartSearchIds(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSmartSearch();
                }
              }}
              className="pl-9 pr-10"
            />
            {(searchTerm || smartSearchIds) && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={handleSmartSearch}
            disabled={smartSearchMutation.isPending || searchTerm.trim().length < 3}
          >
            {smartSearchMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
          {smartSearchIds && (
            <Badge variant="secondary" className="whitespace-nowrap">
              {smartSearchIds.size} resultado(s)
            </Badge>
          )}
        </div>

        {/* Tabs */}
        <div className="flex justify-center">
          <Tabs defaultValue="profiles" className="space-y-6 w-full">
            <div className="flex justify-center">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="profiles" className="gap-2">
                  <Users className="h-4 w-4" />
                  Banco de Talentos
                </TabsTrigger>
                <TabsTrigger value="applications" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Processos Seletivos
                </TabsTrigger>
              </TabsList>
            </div>

          {/* PROFILES TAB */}
          <TabsContent value="profiles" className="space-y-6">
            {/* Summary Cards */}
            <div className={`grid gap-6 ${isAdmin ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
              {!isAdmin && (
                <Card className="border-slate-200 shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Total de Candidatos</CardTitle>
                    <Users className="h-5 w-5 text-slate-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold mb-1 text-slate-900">{candidates?.length || 0}</div>
                    <p className="text-xs text-slate-500">Candidatos cadastrados</p>
                  </CardContent>
                </Card>
              )}

              <Card className="border-emerald-200 bg-emerald-50/50 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-700">Candidatos Ativos</CardTitle>
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold mb-1 text-emerald-900">
                    {candidates?.filter((c: any) => c.status === 'active').length || 0}
                  </div>
                  <p className="text-xs text-emerald-600">Disponíveis para vagas</p>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50/50 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700">Empregados</CardTitle>
                  <UserCheck className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold mb-1 text-blue-900">
                    {candidates?.filter((c: any) => c.status === 'employed').length || 0}
                  </div>
                  <p className="text-xs text-blue-600">Contratados</p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-slate-50/50 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-700">Inativos</CardTitle>
                  <UserX className="h-5 w-5 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold mb-1 text-slate-900">
                    {candidates?.filter((c: any) => c.status === 'inactive').length || 0}
                  </div>
                  <p className="text-xs text-slate-600">Desativados</p>
                </CardContent>
              </Card>
            </div>

            {/* Candidates Table */}
            <Card>
              <CardHeader>
                <CardTitle>{isAdmin ? 'Todos os Candidatos' : 'Candidatos'}</CardTitle>
                <CardDescription>{getDescriptionText()}</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredCandidates && filteredCandidates.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        {isAllAgenciesMode && <TableHead>Escola</TableHead>}
                        <TableHead>Escolaridade</TableHead>
                        <TableHead>Cidade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Cadastro</TableHead>
                        {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCandidates.map((candidate: any) => (
                        <TableRow key={candidate.id}>
                          <TableCell className="font-medium">{candidate.full_name || 'N/A'}</TableCell>
                          <TableCell>{(isAdmin ? candidate.users?.email : candidate.email) || 'N/A'}</TableCell>
                          {isAllAgenciesMode && (
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-slate-400" />
                                <span className="text-sm">{candidate.agency?.name || 'N/A'}</span>
                              </div>
                            </TableCell>
                          )}
                          <TableCell>{candidate.education_level ? getEducationLevelLabel(candidate.education_level) : 'N/A'}</TableCell>
                          <TableCell>{candidate.city || 'N/A'}</TableCell>
                          <TableCell>{getCandidateStatusBadge(candidate.status)}</TableCell>
                          <TableCell>{new Date(candidate.created_at).toLocaleDateString('pt-BR')}</TableCell>
                          {isAdmin && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {candidate.status === 'inactive' && (
                                  <Button size="sm" variant="default" onClick={() => handleActivate(candidate.id)} disabled={updateCandidateStatusMutation.isPending}>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Ativar
                                  </Button>
                                )}
                                {candidate.status === 'active' && (
                                  <>
                                    <Button size="sm" variant="outline" onClick={() => handleMarkEmployed(candidate.id)} disabled={updateCandidateStatusMutation.isPending}>
                                      <UserCheck className="h-4 w-4 mr-1" />
                                      Empregar
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleDeactivate(candidate.id)} disabled={updateCandidateStatusMutation.isPending}>
                                      <UserX className="h-4 w-4 mr-1" />
                                      Desativar
                                    </Button>
                                  </>
                                )}
                                {candidate.status === 'employed' && (
                                  <Button size="sm" variant="default" onClick={() => handleActivate(candidate.id)} disabled={updateCandidateStatusMutation.isPending}>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Reativar
                                  </Button>
                                )}
                                <Button size="sm" variant="outline" onClick={() => setSelectedCandidate(candidate.id)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-20 h-24 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50 flex flex-col items-center justify-center gap-2 mb-6">
                      <Users className="h-8 w-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-500 mb-1">
                      {searchTerm ? 'Nenhum candidato encontrado' : 'Nenhum candidato cadastrado'}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {searchTerm ? 'Tente ajustar os termos de busca' : 'Candidatos aparecerão aqui quando se cadastrarem'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* APPLICATIONS TAB */}
          <TabsContent value="applications" className="space-y-6">
            {/* Summary Cards */}
            <div className={`grid gap-6 ${isAdmin ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
              {!isAdmin && (
                <Card className="border-slate-200 shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Total de Candidaturas</CardTitle>
                    <FileText className="h-5 w-5 text-slate-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold mb-1 text-slate-900">{applications?.length || 0}</div>
                    <p className="text-xs text-slate-500">Candidaturas registradas</p>
                  </CardContent>
                </Card>
              )}

              <Card className="border-blue-200 bg-blue-50/50 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700">{isAdmin ? 'Novas Candidaturas' : 'Candidaturas Ativas'}</CardTitle>
                  <Clock className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold mb-1 text-blue-900">
                    {applications?.filter((a: any) => isAdmin ? a.status === 'applied' : ['applied', 'screening', 'interview-scheduled', 'interviewed'].includes(a.status)).length || 0}
                  </div>
                  <p className="text-xs text-blue-600">{isAdmin ? 'Aguardando triagem' : 'Em processo'}</p>
                </CardContent>
              </Card>

              <Card className="border-emerald-200 bg-emerald-50/50 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-700">Selecionados</CardTitle>
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold mb-1 text-emerald-900">
                    {applications?.filter((a: any) => a.status === 'selected').length || 0}
                  </div>
                  <p className="text-xs text-emerald-600">{isAdmin ? 'Candidatos aprovados' : 'Aprovados'}</p>
                </CardContent>
              </Card>

              {isAdmin ? (
                <Card className="border-amber-200 bg-amber-50/50 shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-amber-700">Entrevistas Agendadas</CardTitle>
                    <Calendar className="h-5 w-5 text-amber-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold mb-1 text-amber-900">
                      {applications?.filter((a: any) => a.status === 'interview-scheduled').length || 0}
                    </div>
                    <p className="text-xs text-amber-600">Entrevistas pendentes</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-red-200 bg-red-50/50 shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-red-700">Rejeitados</CardTitle>
                    <XCircle className="h-5 w-5 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold mb-1 text-red-900">
                      {applications?.filter((a: any) => a.status === 'rejected').length || 0}
                    </div>
                    <p className="text-xs text-red-600">Não aprovados</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Applications Table */}
            <Card>
              <CardHeader>
                <CardTitle>{isAdmin ? 'Todas as Candidaturas' : 'Candidaturas'}</CardTitle>
                <CardDescription>
                  {isAdmin ? 'Lista completa de candidaturas na plataforma' : 'Lista de candidaturas para vagas'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredApplications && filteredApplications.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Candidato</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Vaga</TableHead>
                        {!isAdmin && <TableHead>Empresa</TableHead>}
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredApplications.map((app: any) => {
                        const candidateName = isAdmin ? app.candidates?.full_name : app.candidate?.full_name;
                        const candidateEmail = isAdmin ? app.candidates?.email : app.candidate?.email;
                        const jobTitle = isAdmin ? app.jobs?.title : app.job?.title;
                        const companyName = app.job?.company?.company_name;
                        return (
                          <TableRow key={app.id}>
                            <TableCell className="font-medium">{candidateName || 'N/A'}</TableCell>
                            <TableCell>{candidateEmail || 'N/A'}</TableCell>
                            <TableCell>{jobTitle || 'N/A'}</TableCell>
                            {!isAdmin && <TableCell>{companyName || 'N/A'}</TableCell>}
                            <TableCell>{getApplicationStatusBadge(app.status)}</TableCell>
                            <TableCell>{new Date(app.created_at).toLocaleDateString('pt-BR')}</TableCell>
                            {isAdmin && (
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  {app.status === 'applied' && (
                                    <>
                                      <Button size="sm" variant="default" onClick={() => handleScheduleInterview(app.id)} disabled={updateApplicationStatusMutation.isPending}>
                                        <Calendar className="h-4 w-4 mr-1" />
                                        Agendar
                                      </Button>
                                      <Button size="sm" variant="destructive" onClick={() => handleReject(app.id)} disabled={updateApplicationStatusMutation.isPending}>
                                        <XCircle className="h-4 w-4 mr-1" />
                                        Rejeitar
                                      </Button>
                                    </>
                                  )}
                                  {(app.status === 'interview-scheduled' || app.status === 'interviewed') && (
                                    <>
                                      <Button size="sm" variant="default" onClick={() => handleApprove(app.id)} disabled={updateApplicationStatusMutation.isPending}>
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Aprovar
                                      </Button>
                                      <Button size="sm" variant="destructive" onClick={() => handleReject(app.id)} disabled={updateApplicationStatusMutation.isPending}>
                                        <XCircle className="h-4 w-4 mr-1" />
                                        Rejeitar
                                      </Button>
                                    </>
                                  )}
                                  <Button size="sm" variant="outline">
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
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-20 h-24 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50 flex flex-col items-center justify-center gap-2 mb-6">
                      <FileText className="h-8 w-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-500 mb-1">
                      {applicationSearchTerm ? 'Nenhuma candidatura encontrada' : 'Nenhuma candidatura registrada'}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {applicationSearchTerm ? 'Tente ajustar os termos de busca' : 'Candidaturas aparecerão aqui quando candidatos se inscreverem em vagas'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Import Modal */}
      {(isAgency || isAffiliate) && (
        <ImportCandidatesModal
          open={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            refetchCandidates();
          }}
        />
      )}
    </DashboardLayout>
  );
}
