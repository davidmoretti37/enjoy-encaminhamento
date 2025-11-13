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
import { trpc } from "@/lib/trpc";
import {
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  ArrowLeft,
  Clock,
  UserCheck,
  Calendar
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { useLocation } from "wouter";

export default function ApplicationManagement() {
  useAgentContext('candidaturas');
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: applications, isLoading, refetch } = trpc.admin.getAllApplications.useQuery();
  const updateStatusMutation = trpc.admin.updateApplicationStatus.useMutation({
    onSuccess: () => {
      refetch();
    }
  });

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

  const handleApprove = async (applicationId: string) => {
    await updateStatusMutation.mutateAsync({ id: applicationId, status: 'selected' });
  };

  const handleReject = async (applicationId: string) => {
    await updateStatusMutation.mutateAsync({ id: applicationId, status: 'rejected' });
  };

  const handleScheduleInterview = async (applicationId: string) => {
    await updateStatusMutation.mutateAsync({ id: applicationId, status: 'interview-scheduled' });
  };

  const getStatusBadge = (status: string) => {
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

  // Filter applications based on search term
  const filteredApplications = applications?.filter((app: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
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
              <FileText className="h-10 w-10" />
              Gerenciamento de Candidaturas
            </h1>
            <p className="text-slate-300 text-lg">
              Monitorar e gerenciar todas as candidaturas da plataforma
            </p>
          </div>
        </div>

        {/* Summary Cards */}
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

        {/* Search and Filter */}
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
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                      <TableCell>{getStatusBadge(application.status)}</TableCell>
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
                                disabled={updateStatusMutation.isLoading}
                              >
                                <Calendar className="h-4 w-4 mr-1" />
                                Agendar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(application.id)}
                                disabled={updateStatusMutation.isLoading}
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
                                disabled={updateStatusMutation.isLoading}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(application.id)}
                                disabled={updateStatusMutation.isLoading}
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
            ) : searchTerm && (!filteredApplications || filteredApplications.length === 0) ? (
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
      </div>
    </DashboardLayout>
  );
}
