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
  Building,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  Ban,
  ArrowLeft
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { useLocation } from "wouter";

export default function CompanyManagement() {
  useAgentContext('empresas');
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  const { data: companies, isLoading, refetch } = trpc.company.getAll.useQuery();
  const updateStatusMutation = trpc.company.updateStatus.useMutation({
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

  const handleApprove = async (companyId: string) => {
    await updateStatusMutation.mutateAsync({ id: companyId, status: 'active' });
  };

  const handleSuspend = async (companyId: string) => {
    await updateStatusMutation.mutateAsync({ id: companyId, status: 'suspended' });
  };

  const handleDeactivate = async (companyId: string) => {
    await updateStatusMutation.mutateAsync({ id: companyId, status: 'inactive' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Ativa</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pendente</Badge>;
      case 'suspended':
        return <Badge className="bg-red-500">Suspensa</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-500">Inativa</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Filter companies based on search term
  const filteredCompanies = companies?.filter((company: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      company.company_name?.toLowerCase().includes(searchLower) ||
      company.cnpj?.includes(searchTerm) ||
      company.email?.toLowerCase().includes(searchLower) ||
      company.city?.toLowerCase().includes(searchLower)
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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
          <div className="relative">
            <h1 className="text-4xl font-bold flex items-center gap-3 mb-2">
              <Building className="h-10 w-10" />
              Gerenciamento de Empresas
            </h1>
            <p className="text-purple-100 text-lg">
              Aprovar, gerenciar e monitorar empresas que buscam candidatos
            </p>
          </div>
        </div>

        {/* Summary Cards - Vibrant Gradients */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-100">Total de Empresas</CardTitle>
              <Building className="h-5 w-5 text-purple-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{companies?.length || 0}</div>
              <p className="text-xs text-purple-100">
                Empresas cadastradas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-100">Empresas Ativas</CardTitle>
              <CheckCircle className="h-5 w-5 text-green-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {companies?.filter((c: any) => c.status === 'active').length || 0}
              </div>
              <p className="text-xs text-green-100">
                Aprovadas e operando
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-100">Aguardando Aprovação</CardTitle>
              <XCircle className="h-5 w-5 text-yellow-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {companies?.filter((c: any) => c.status === 'pending').length || 0}
              </div>
              <p className="text-xs text-yellow-100">
                Pendentes de análise
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-100">Suspensas</CardTitle>
              <Ban className="h-5 w-5 text-red-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {companies?.filter((c: any) => c.status === 'suspended').length || 0}
              </div>
              <p className="text-xs text-red-100">
                Empresas suspensas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-slate-600" />
              <CardTitle>Buscar Empresas</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CNPJ, email ou cidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Companies Table */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-purple-600" />
              <div>
                <CardTitle>Todas as Empresas</CardTitle>
                <CardDescription>
                  Lista completa de empresas cadastradas na plataforma
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredCompanies && filteredCompanies.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome da Empresa</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((company: any) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{company.company_name}</div>
                          {company.trade_name && company.company_name !== company.trade_name && (
                            <div className="text-xs text-muted-foreground">{company.trade_name}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{company.email || 'N/A'}</TableCell>
                      <TableCell>{company.cnpj || 'N/A'}</TableCell>
                      <TableCell>{company.city || 'N/A'}</TableCell>
                      <TableCell>{getStatusBadge(company.status)}</TableCell>
                      <TableCell>
                        {new Date(company.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {company.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(company.id)}
                              disabled={updateStatusMutation.isLoading}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Aprovar
                            </Button>
                          )}
                          {company.status === 'active' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleSuspend(company.id)}
                              disabled={updateStatusMutation.isLoading}
                            >
                              <Ban className="h-4 w-4 mr-1" />
                              Suspender
                            </Button>
                          )}
                          {company.status === 'suspended' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(company.id)}
                              disabled={updateStatusMutation.isLoading}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Reativar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedCompany(company.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : searchTerm && (!filteredCompanies || filteredCompanies.length === 0) ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma empresa encontrada</h3>
                <p className="text-muted-foreground">
                  Tente ajustar seus critérios de busca
                </p>
              </div>
            ) : (
              <div className="text-center py-12">
                <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma empresa cadastrada</h3>
                <p className="text-muted-foreground">
                  Empresas aparecerão aqui quando se cadastrarem na plataforma
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
