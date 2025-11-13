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
  Search,
  UserCheck,
  UserX,
  ArrowLeft,
  Building,
  FileText,
  Clock
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { useLocation } from "wouter";

export default function AffiliateCandidates() {
  useAgentContext('candidatos');
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [applicationSearchTerm, setApplicationSearchTerm] = useState("");

  const { data: affiliate, isLoading: affiliateLoading } = trpc.affiliate.getByUserId.useQuery();
  const { data: candidates, isLoading: candidatesLoading } = trpc.affiliate.getCandidates.useQuery();
  const { data: applications, isLoading: applicationsLoading } = trpc.affiliate.getApplications.useQuery();

  const isLoading = authLoading || affiliateLoading || candidatesLoading || applicationsLoading;

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
      candidate.email?.toLowerCase().includes(searchLower) ||
      candidate.city?.toLowerCase().includes(searchLower) ||
      candidate.school?.school_name?.toLowerCase().includes(searchLower)
    );
  });

  // Filter applications based on search term
  const filteredApplications = applications?.filter((app: any) => {
    if (!applicationSearchTerm) return true;
    const searchLower = applicationSearchTerm.toLowerCase();
    return (
      app.candidate?.full_name?.toLowerCase().includes(searchLower) ||
      app.job?.title?.toLowerCase().includes(searchLower) ||
      app.job?.company?.company_name?.toLowerCase().includes(searchLower) ||
      app.candidate?.email?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation("/affiliate/dashboard")}
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
              Candidatos da Região
            </h1>
            <p className="text-slate-300 text-lg">
              Visualizar candidatos e candidaturas da região: {affiliate.region}
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
            <div className="grid gap-6 md:grid-cols-4">
              <Card className="border-slate-200 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Total de Candidatos</CardTitle>
                  <Users className="h-5 w-5 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold mb-1 text-slate-900">{candidates?.length || 0}</div>
                  <p className="text-xs text-slate-500">
                    Candidatos cadastrados
                  </p>
                </CardContent>
              </Card>

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
                      placeholder="Buscar por nome, CPF, email, cidade ou escola..."
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
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-600" />
                  <div>
                    <CardTitle>Candidatos da Região</CardTitle>
                    <CardDescription>
                      Lista de candidatos cadastrados nas escolas da sua região
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
                        <TableHead>Escola</TableHead>
                        <TableHead>Escolaridade</TableHead>
                        <TableHead>Cidade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Cadastro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCandidates.map((candidate: any) => (
                        <TableRow key={candidate.id}>
                          <TableCell className="font-medium">{candidate.full_name}</TableCell>
                          <TableCell>{candidate.email || 'N/A'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-slate-400" />
                              <span className="text-sm">{candidate.school?.school_name || 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getEducationLevelLabel(candidate.education_level)}</TableCell>
                          <TableCell>{candidate.city || 'N/A'}</TableCell>
                          <TableCell>{getCandidateStatusBadge(candidate.status)}</TableCell>
                          <TableCell>
                            {new Date(candidate.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {searchTerm ? 'Nenhum candidato encontrado' : 'Nenhum candidato cadastrado'}
                    </h3>
                    <p className="text-muted-foreground">
                      {searchTerm
                        ? 'Tente ajustar os termos de busca'
                        : 'Candidatos aparecerão aqui quando se cadastrarem nas escolas da sua região'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* APPLICATIONS TAB */}
          <TabsContent value="applications" className="space-y-6">
            {/* Summary Cards - Applications */}
            <div className="grid gap-6 md:grid-cols-4">
              <Card className="border-slate-200 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Total de Candidaturas</CardTitle>
                  <FileText className="h-5 w-5 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold mb-1 text-slate-900">{applications?.length || 0}</div>
                  <p className="text-xs text-slate-500">
                    Candidaturas registradas
                  </p>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50/50 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700">Candidaturas Ativas</CardTitle>
                  <Clock className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold mb-1 text-blue-900">
                    {applications?.filter((a: any) => ['applied', 'screening', 'interview-scheduled', 'interviewed'].includes(a.status)).length || 0}
                  </div>
                  <p className="text-xs text-blue-600">
                    Em processo
                  </p>
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
                  <p className="text-xs text-emerald-600">
                    Aprovados
                  </p>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50/50 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-red-700">Rejeitados</CardTitle>
                  <XCircle className="h-5 w-5 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold mb-1 text-red-900">
                    {applications?.filter((a: any) => a.status === 'rejected').length || 0}
                  </div>
                  <p className="text-xs text-red-600">
                    Não aprovados
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
                      placeholder="Buscar por candidato, vaga, empresa ou email..."
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
              <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  <div>
                    <CardTitle>Candidaturas da Região</CardTitle>
                    <CardDescription>
                      Lista de candidaturas para vagas na sua região
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
                        <TableHead>Email</TableHead>
                        <TableHead>Vaga</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredApplications.map((app: any) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">{app.candidate?.full_name || 'N/A'}</TableCell>
                          <TableCell>{app.candidate?.email || 'N/A'}</TableCell>
                          <TableCell>{app.job?.title || 'N/A'}</TableCell>
                          <TableCell>{app.job?.company?.company_name || 'N/A'}</TableCell>
                          <TableCell>{getApplicationStatusBadge(app.status)}</TableCell>
                          <TableCell>
                            {new Date(app.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {applicationSearchTerm ? 'Nenhuma candidatura encontrada' : 'Nenhuma candidatura registrada'}
                    </h3>
                    <p className="text-muted-foreground">
                      {applicationSearchTerm
                        ? 'Tente ajustar os termos de busca'
                        : 'Candidaturas aparecerão aqui quando candidatos se inscreverem em vagas da sua região'}
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
