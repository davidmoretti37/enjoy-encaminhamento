import { useAuth } from "@/_core/hooks/useAuth";
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
  Briefcase,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  Ban,
  ArrowLeft,
  Clock
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { useLocation } from "wouter";

export default function JobManagement() {
  useAgentContext('vagas');
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJob, setSelectedJob] = useState<string | null>(null);

  const { data: jobs, isLoading, refetch } = trpc.job.getAll.useQuery();
  const updateStatusMutation = trpc.job.updateStatus.useMutation({
    onSuccess: () => {
      refetch();
    }
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  const handlePublish = async (jobId: string) => {
    await updateStatusMutation.mutateAsync({ id: jobId, status: 'open' });
  };

  const handleClose = async (jobId: string) => {
    await updateStatusMutation.mutateAsync({ id: jobId, status: 'closed' });
  };

  const handleMarkFilled = async (jobId: string) => {
    await updateStatusMutation.mutateAsync({ id: jobId, status: 'filled' });
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

  // Filter jobs based on search term
  const filteredJobs = jobs?.filter((job: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      job.title?.toLowerCase().includes(searchLower) ||
      job.companies?.company_name?.toLowerCase().includes(searchLower) ||
      job.city?.toLowerCase().includes(searchLower)
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

        {/* Hero Header with Gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-600 via-red-600 to-pink-600 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
          <div className="relative">
            <h1 className="text-4xl font-bold flex items-center gap-3 mb-2">
              <Briefcase className="h-10 w-10" />
              Gerenciamento de Vagas
            </h1>
            <p className="text-orange-100 text-lg">
              Monitorar e gerenciar todas as vagas publicadas pelas empresas
            </p>
          </div>
        </div>

        {/* Summary Cards - Vibrant Gradients */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-100">Total de Vagas</CardTitle>
              <Briefcase className="h-5 w-5 text-orange-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{jobs?.length || 0}</div>
              <p className="text-xs text-orange-100">
                Vagas cadastradas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-100">Vagas Abertas</CardTitle>
              <CheckCircle className="h-5 w-5 text-green-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {jobs?.filter((j: any) => j.status === 'open').length || 0}
              </div>
              <p className="text-xs text-green-100">
                Atualmente disponíveis
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-500 to-gray-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-100">Rascunhos</CardTitle>
              <Clock className="h-5 w-5 text-gray-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {jobs?.filter((j: any) => j.status === 'draft').length || 0}
              </div>
              <p className="text-xs text-gray-100">
                Aguardando publicação
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">Preenchidas</CardTitle>
              <CheckCircle className="h-5 w-5 text-blue-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {jobs?.filter((j: any) => j.status === 'filled').length || 0}
              </div>
              <p className="text-xs text-blue-100">
                Vagas concluídas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
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
                  placeholder="Buscar por título, empresa ou cidade..."
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
          <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-orange-600" />
              <div>
                <CardTitle>Todas as Vagas</CardTitle>
                <CardDescription>
                  Lista completa de vagas cadastradas na plataforma
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
                    <TableHead>Tipo</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Publicado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job: any) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{job.title}</div>
                        </div>
                      </TableCell>
                      <TableCell>{job.companies?.company_name || 'N/A'}</TableCell>
                      <TableCell>{getJobTypeBadge(job.job_type)}</TableCell>
                      <TableCell>
                        {job.remote ? (
                          <Badge variant="outline" className="bg-blue-50">Remoto</Badge>
                        ) : (
                          job.city || 'N/A'
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell>
                        {job.published_at ? new Date(job.published_at).toLocaleDateString('pt-BR') : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {job.status === 'draft' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handlePublish(job.id)}
                              disabled={updateStatusMutation.isLoading}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Publicar
                            </Button>
                          )}
                          {job.status === 'open' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkFilled(job.id)}
                                disabled={updateStatusMutation.isLoading}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Preencher
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleClose(job.id)}
                                disabled={updateStatusMutation.isLoading}
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                Fechar
                              </Button>
                            </>
                          )}
                          {(job.status === 'closed' || job.status === 'filled') && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handlePublish(job.id)}
                              disabled={updateStatusMutation.isLoading}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Reabrir
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedJob(job.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : searchTerm && (!filteredJobs || filteredJobs.length === 0) ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma vaga encontrada</h3>
                <p className="text-muted-foreground">
                  Tente ajustar seus critérios de busca
                </p>
              </div>
            ) : (
              <div className="text-center py-12">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma vaga cadastrada</h3>
                <p className="text-muted-foreground">
                  Vagas aparecerão aqui quando as empresas as publicarem
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
