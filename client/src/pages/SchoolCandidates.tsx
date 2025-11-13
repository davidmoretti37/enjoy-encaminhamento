import { useAuth } from "@/_core/hooks/useAuth";
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
import { Users, ArrowLeft, Search, FileText, Briefcase } from "lucide-react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import ClassicLoader from "@/components/ui/ClassicLoader";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SchoolCandidates() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: candidates, isLoading: candidatesLoading } = trpc.school.getCandidates.useQuery();
  const { data: applications, isLoading: applicationsLoading } = trpc.school.getApplications.useQuery();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClassicLoader />
      </div>
    );
  }

  if (!user || user.role !== 'school') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Você precisa ser uma escola para acessar esta página.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/')}>Voltar para Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredCandidates = candidates?.filter((candidate: any) =>
    candidate.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.education_level?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredApplications = applications?.filter((application: any) =>
    application.candidates?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    application.jobs?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    application.jobs?.companies?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            onClick={() => setLocation('/school/dashboard')}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Candidatos e Candidaturas
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualize e gerencie candidatos e suas candidaturas
          </p>
        </div>

        <Tabs defaultValue="candidates" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="candidates" className="gap-2">
              <Users className="h-4 w-4" />
              Banco de Talentos
            </TabsTrigger>
            <TabsTrigger value="applications" className="gap-2">
              <FileText className="h-4 w-4" />
              Candidaturas
            </TabsTrigger>
          </TabsList>

          {/* CANDIDATES TAB */}
          <TabsContent value="candidates" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="border-emerald-200 bg-emerald-50/50 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-700">Candidatos Ativos</CardTitle>
                  <Users className="h-5 w-5 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold mb-1 text-emerald-900">
                    {candidates?.filter((c: any) => c.status === 'active').length || 0}
                  </div>
                  <p className="text-xs text-emerald-600">Disponíveis para vagas</p>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50/50 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700">Empregados</CardTitle>
                  <Briefcase className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold mb-1 text-blue-900">
                    {candidates?.filter((c: any) => c.status === 'employed').length || 0}
                  </div>
                  <p className="text-xs text-blue-600">Atualmente trabalhando</p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-slate-50/50 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-700">Inativos</CardTitle>
                  <Users className="h-5 w-5 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold mb-1 text-slate-900">
                    {candidates?.filter((c: any) => c.status === 'inactive').length || 0}
                  </div>
                  <p className="text-xs text-slate-600">Sem buscar vagas</p>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou escolaridade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Candidates Table */}
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
                <CardTitle>Candidatos</CardTitle>
                <CardDescription>Lista de todos os candidatos da escola</CardDescription>
              </CardHeader>
              <CardContent>
                {candidatesLoading ? (
                  <div className="flex justify-center py-8">
                    <ClassicLoader />
                  </div>
                ) : filteredCandidates.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Escolaridade</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Cadastro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCandidates.map((candidate: any) => (
                        <TableRow key={candidate.id}>
                          <TableCell className="font-medium">{candidate.full_name}</TableCell>
                          <TableCell>{candidate.users?.email}</TableCell>
                          <TableCell>{candidate.education_level || '-'}</TableCell>
                          <TableCell>{candidate.phone || '-'}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                candidate.status === 'active' ? 'default' :
                                candidate.status === 'employed' ? 'secondary' :
                                'outline'
                              }
                            >
                              {candidate.status === 'active' ? 'Ativo' :
                               candidate.status === 'employed' ? 'Empregado' :
                               'Inativo'}
                            </Badge>
                          </TableCell>
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
                        : 'Os candidatos cadastrados pela escola aparecerão aqui'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* APPLICATIONS TAB */}
          <TabsContent value="applications" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="border-blue-200 bg-blue-50/50 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700">Em Andamento</CardTitle>
                  <FileText className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold mb-1 text-blue-900">
                    {applications?.filter((a: any) => a.status === 'in_progress').length || 0}
                  </div>
                  <p className="text-xs text-blue-600">Aguardando análise</p>
                </CardContent>
              </Card>

              <Card className="border-purple-200 bg-purple-50/50 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-700">Entrevistas</CardTitle>
                  <Users className="h-5 w-5 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold mb-1 text-purple-900">
                    {applications?.filter((a: any) => a.status === 'interviewing').length || 0}
                  </div>
                  <p className="text-xs text-purple-600">Agendadas ou em processo</p>
                </CardContent>
              </Card>

              <Card className="border-emerald-200 bg-emerald-50/50 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-700">Selecionados</CardTitle>
                  <Briefcase className="h-5 w-5 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold mb-1 text-emerald-900">
                    {applications?.filter((a: any) => a.status === 'selected').length || 0}
                  </div>
                  <p className="text-xs text-emerald-600">Aprovados para contratação</p>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por candidato, vaga ou empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Applications Table */}
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle>Candidaturas</CardTitle>
                <CardDescription>Todas as candidaturas dos seus alunos</CardDescription>
              </CardHeader>
              <CardContent>
                {applicationsLoading ? (
                  <div className="flex justify-center py-8">
                    <ClassicLoader />
                  </div>
                ) : filteredApplications.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Candidato</TableHead>
                        <TableHead>Vaga</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredApplications.map((application: any) => (
                        <TableRow key={application.id}>
                          <TableCell className="font-medium">
                            {application.candidates?.full_name}
                          </TableCell>
                          <TableCell>{application.jobs?.title}</TableCell>
                          <TableCell>{application.jobs?.companies?.company_name}</TableCell>
                          <TableCell>
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
                               application.status === 'rejected' ? 'Rejeitado' :
                               'Pendente'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(application.applied_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {searchTerm ? 'Nenhuma candidatura encontrada' : 'Nenhuma candidatura'}
                    </h3>
                    <p className="text-muted-foreground">
                      {searchTerm
                        ? 'Tente ajustar os termos de busca'
                        : 'As candidaturas dos seus alunos aparecerão aqui'}
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
