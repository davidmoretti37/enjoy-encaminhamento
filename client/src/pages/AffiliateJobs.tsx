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
  Briefcase,
  CheckCircle,
  XCircle,
  Search,
  ArrowLeft,
  Clock,
  Building
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { useLocation } from "wouter";

export default function AffiliateJobs() {
  useAgentContext('vagas');
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: affiliate, isLoading: affiliateLoading } = trpc.affiliate.getByUserId.useQuery();
  const { data: jobs, isLoading: jobsLoading } = trpc.affiliate.getJobs.useQuery();

  const isLoading = authLoading || affiliateLoading || jobsLoading;

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
      job.company?.company_name?.toLowerCase().includes(searchLower) ||
      job.school?.school_name?.toLowerCase().includes(searchLower) ||
      job.city?.toLowerCase().includes(searchLower)
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
              <Briefcase className="h-10 w-10" />
              Vagas da Região
            </h1>
            <p className="text-slate-300 text-lg">
              Monitorar vagas publicadas na região: {affiliate.region}
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="border-slate-200 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total de Vagas</CardTitle>
              <Briefcase className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-slate-900">{jobs?.length || 0}</div>
              <p className="text-xs text-slate-500">
                Vagas publicadas
              </p>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700">Vagas Abertas</CardTitle>
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-emerald-900">
                {jobs?.filter((j: any) => j.status === 'open').length || 0}
              </div>
              <p className="text-xs text-emerald-600">
                Aceitando candidaturas
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Preenchidas</CardTitle>
              <CheckCircle className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-blue-900">
                {jobs?.filter((j: any) => j.status === 'filled').length || 0}
              </div>
              <p className="text-xs text-blue-600">
                Vagas completas
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700">Fechadas</CardTitle>
              <XCircle className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-red-900">
                {jobs?.filter((j: any) => j.status === 'closed').length || 0}
              </div>
              <p className="text-xs text-red-600">
                Não ativas
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
                  placeholder="Buscar por título, empresa, escola ou cidade..."
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
                <CardTitle>Vagas da Região</CardTitle>
                <CardDescription>
                  Lista de vagas publicadas pelas empresas na sua região
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
                    <TableHead>Escola</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Publicado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job: any) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.title}</TableCell>
                      <TableCell>{job.company?.company_name || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-slate-400" />
                          <span className="text-sm">{job.school?.school_name || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getJobTypeBadge(job.job_type)}</TableCell>
                      <TableCell>{job.city || 'N/A'}</TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell>
                        {new Date(job.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm ? 'Nenhuma vaga encontrada' : 'Nenhuma vaga publicada'}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? 'Tente ajustar os termos de busca'
                    : 'Vagas aparecerão aqui quando forem publicadas pelas empresas da sua região'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
