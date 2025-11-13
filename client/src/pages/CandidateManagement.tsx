import { useAuth } from "@/_core/hooks/useAuth";
import ClassicLoader from "@/components/ui/ClassicLoader";
import { useAgentContext } from "@/hooks/useAgentContext";
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
  ArrowLeft,
  FileText,
  Clock,
  Calendar
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { useLocation } from "wouter";

export default function CandidateManagement() {
  useAgentContext('candidatos');
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [applicationSearchTerm, setApplicationSearchTerm] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);

  const { data: candidates, isLoading: candidatesLoading, refetch: refetchCandidates } = trpc.candidate.getAllForAdmin.useQuery();
  const { data: applications, isLoading: applicationsLoading, refetch: refetchApplications } = trpc.admin.getAllApplications.useQuery();

  const updateCandidateStatusMutation = trpc.candidate.updateStatus.useMutation({
    onSuccess: () => {
      refetchCandidates();
    }
  });

  const updateApplicationStatusMutation = trpc.admin.updateApplicationStatus.useMutation({
    onSuccess: () => {
      refetchApplications();
    }
  });

  if (authLoading || candidatesLoading || applicationsLoading) {
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

  // Candidate handlers
  const handleActivate = async (candidateId: string) => {
    await updateCandidateStatusMutation.mutateAsync({ id: candidateId, status: 'active' });
  };

  const handleDeactivate = async (candidateId: string) => {
    await updateCandidateStatusMutation.mutateAsync({ id: candidateId, status: 'inactive' });
  };

  const handleMarkEmployed = async (candidateId: string) => {
    await updateCandidateStatusMutation.mutateAsync({ id: candidateId, status: 'employed' });
  };

  // Application handlers
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

  // Filter candidates based on search term
  const filteredCandidates = candidates?.filter((candidate: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      candidate.full_name?.toLowerCase().includes(searchLower) ||
      candidate.cpf?.includes(searchTerm) ||
      candidate.users?.email?.toLowerCase().includes(searchLower) ||
      candidate.city?.toLowerCase().includes(searchLower)
    );
  });

  // Filter applications based on search term
  const filteredApplications = applications?.filter((app: any) => {
    if (!applicationSearchTerm) return true;
    const searchLower = applicationSearchTerm.toLowerCase();
    return (
      app.candidates?.full_name?.toLowerCase().includes(searchLower) ||
      app.jobs?.title?.toLowerCase().includes(searchLower) ||
      app.candidates?.email?.toLowerCase().includes(searchLower)
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
              <Users className="h-10 w-10" />
              Gerenciamento de Candidatos
            </h1>
            <p className="text-slate-300 text-lg">
              Visualizar e gerenciar candidatos e candidaturas da plataforma
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="profiles" className="space-y-6">
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

          {/* PROFILES TAB */}
          <TabsContent value="profiles" className="space-y-6">
            {/* Summary Cards - Candidates */}
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="border-emerald-200 bg-emerald-50/50 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-700">Candidatos Ativos</CardTitle>
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold mb-1 text-emerald-900">
                    {candidates?.filter((c: any) => c.status === 'active').length || 0}
                  </div>
                  <p className="text-xs text-emerald-600">
                    Disponíveis para vagas
                  </p>
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
                  <p className="text-xs text-blue-600">
                    Contratados
                  </p>
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
                  <p className="text-xs text-slate-600">
                    Desativados
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filter - Candidates */}
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50">
                <div className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-slate-600" />
                  <CardTitle>Buscar Candidatos</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome, CPF, email ou cidade..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Candidates Table */}
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-600" />
                  <div>
                    <CardTitle>Todos os Candidatos</CardTitle>
                    <CardDescription>
                      Lista completa de candidatos cadastrados na plataforma
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredCandidates && filteredCandidates.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Escolaridade</TableHead>
                        <TableHead>Cidade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Cadastro</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCandidates.map((candidate: any) => (
                        <TableRow key={candidate.id}>
                          <TableCell className="font-medium">
                            {candidate.full_name || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {candidate.users?.email || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {candidate.education_level
                              ? getEducationLevelLabel(candidate.education_level)
                              : 'N/A'
                            }
                          </TableCell>
                          <TableCell>{candidate.city || 'N/A'}</TableCell>
                          <TableCell>{getCandidateStatusBadge(candidate.status)}</TableCell>
                          <TableCell>
                            {new Date(candidate.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {candidate.status === 'inactive' && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleActivate(candidate.id)}
                                  disabled={updateCandidateStatusMutation.isLoading}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Ativar
                                </Button>
                              )}
                              {candidate.status === 'active' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleMarkEmployed(candidate.id)}
                                    disabled={updateCandidateStatusMutation.isLoading}
                                  >
                                    <UserCheck className="h-4 w-4 mr-1" />
                                    Empregar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeactivate(candidate.id)}
                                    disabled={updateCandidateStatusMutation.isLoading}
                                  >
                                    <UserX className="h-4 w-4 mr-1" />
                                    Desativar
                                  </Button>
                                </>
                              )}
                              {candidate.status === 'employed' && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleActivate(candidate.id)}
                                  disabled={updateCandidateStatusMutation.isLoading}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Reativar
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedCandidate(candidate.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : searchTerm && (!filteredCandidates || filteredCandidates.length === 0) ? (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum candidato encontrado</h3>
                    <p className="text-muted-foreground">
                      Tente ajustar seus critérios de busca
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum candidato cadastrado</h3>
                    <p className="text-muted-foreground">
                      Candidatos aparecerão aqui quando se cadastrarem na plataforma
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* APPLICATIONS TAB */}
          <TabsContent value="applications" className="space-y-6">
            {/* Summary Cards - Applications */}
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="border-blue-200 bg-blue-50/50 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700">Novas Candidaturas</CardTitle>
                  <Clock className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold mb-1 text-blue-900">
                    {applications?.filter((a: any) => a.status === 'applied').length || 0}
                  </div>
                  <p className="text-xs text-blue-600">
                    Aguardando triagem
                  </p>
                </CardContent>
              </Card>

              <Card className="border-emerald-200 bg-emerald-50/50 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-700">Selecionados</CardTitle>
                  <UserCheck className="h-5 w-5 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold mb-1 text-emerald-900">
                    {applications?.filter((a: any) => a.status === 'selected').length || 0}
                  </div>
                  <p className="text-xs text-emerald-600">
                    Candidatos aprovados
                  </p>
                </CardContent>
              </Card>

              <Card className="border-amber-200 bg-amber-50/50 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-amber-700">Entrevistas Agendadas</CardTitle>
                  <Calendar className="h-5 w-5 text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold mb-1 text-amber-900">
                    {applications?.filter((a: any) => a.status === 'interview-scheduled').length || 0}
                  </div>
                  <p className="text-xs text-amber-600">
                    Entrevistas pendentes
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filter - Applications */}
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50">
                <div className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-slate-600" />
                  <CardTitle>Buscar Candidaturas</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por candidato, vaga ou email..."
                      value={applicationSearchTerm}
                      onChange={(e) => setApplicationSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Applications Table */}
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  <div>
                    <CardTitle>Todas as Candidaturas</CardTitle>
                    <CardDescription>
                      Lista completa de candidaturas na plataforma
                    </CardDescription>
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
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredApplications.map((application: any) => (
                        <TableRow key={application.id}>
                          <TableCell className="font-medium">
                            {application.candidates?.full_name || 'N/A'}
                          </TableCell>
                          <TableCell>{application.jobs?.title || 'N/A'}</TableCell>
                          <TableCell>{application.candidates?.email || 'N/A'}</TableCell>
                          <TableCell>{getApplicationStatusBadge(application.status)}</TableCell>
                          <TableCell>
                            {application.created_at ? new Date(application.created_at).toLocaleDateString('pt-BR') : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {application.status === 'applied' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleScheduleInterview(application.id)}
                                    disabled={updateApplicationStatusMutation.isLoading}
                                  >
                                    <Calendar className="h-4 w-4 mr-1" />
                                    Agendar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleReject(application.id)}
                                    disabled={updateApplicationStatusMutation.isLoading}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Rejeitar
                                  </Button>
                                </>
                              )}
                              {(application.status === 'interview-scheduled' || application.status === 'interviewed') && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleApprove(application.id)}
                                    disabled={updateApplicationStatusMutation.isLoading}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Aprovar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleReject(application.id)}
                                    disabled={updateApplicationStatusMutation.isLoading}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Rejeitar
                                  </Button>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : applicationSearchTerm && (!filteredApplications || filteredApplications.length === 0) ? (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhuma candidatura encontrada</h3>
                    <p className="text-muted-foreground">
                      Tente ajustar seus critérios de busca
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhuma candidatura cadastrada</h3>
                    <p className="text-muted-foreground">
                      Candidaturas aparecerão aqui quando candidatos se inscreverem em vagas
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
