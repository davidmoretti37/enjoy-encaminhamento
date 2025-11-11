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
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  ArrowLeft,
  Clock,
  Ban,
  PlayCircle
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { useLocation } from "wouter";

export default function ContractManagement() {
  useAgentContext('contratos');
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: contracts, isLoading, refetch } = trpc.admin.getAllContracts.useQuery();
  const updateStatusMutation = trpc.admin.updateContractStatus.useMutation({
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

  const handleActivate = async (contractId: string) => {
    await updateStatusMutation.mutateAsync({ id: contractId, status: 'active' });
  };

  const handleSuspend = async (contractId: string) => {
    await updateStatusMutation.mutateAsync({ id: contractId, status: 'suspended' });
  };

  const handleTerminate = async (contractId: string) => {
    await updateStatusMutation.mutateAsync({ id: contractId, status: 'terminated' });
  };

  const handleComplete = async (contractId: string) => {
    await updateStatusMutation.mutateAsync({ id: contractId, status: 'completed' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending-signature':
        return <Badge className="bg-yellow-500">Pendente Assinatura</Badge>;
      case 'active':
        return <Badge className="bg-green-500">Ativo</Badge>;
      case 'suspended':
        return <Badge className="bg-orange-500">Suspenso</Badge>;
      case 'terminated':
        return <Badge className="bg-red-500">Encerrado</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500">Concluído</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  };

  // Filter contracts based on search term
  const filteredContracts = contracts?.filter((contract: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      contract.contract_number?.toLowerCase().includes(searchLower) ||
      contract.candidates?.full_name?.toLowerCase().includes(searchLower) ||
      contract.companies?.company_name?.toLowerCase().includes(searchLower)
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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-600 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
          <div className="relative">
            <h1 className="text-4xl font-bold flex items-center gap-3 mb-2">
              <FileText className="h-10 w-10" />
              Gerenciamento de Contratos
            </h1>
            <p className="text-cyan-100 text-lg">
              Monitorar e gerenciar todos os contratos da plataforma
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-teal-100">Total de Contratos</CardTitle>
              <FileText className="h-5 w-5 text-teal-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{contracts?.length || 0}</div>
              <p className="text-xs text-teal-100">Contratos cadastrados</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-100">Contratos Ativos</CardTitle>
              <CheckCircle className="h-5 w-5 text-green-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {contracts?.filter((c: any) => c.status === 'active').length || 0}
              </div>
              <p className="text-xs text-green-100">Contratos em andamento</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-100">Pendentes</CardTitle>
              <Clock className="h-5 w-5 text-yellow-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {contracts?.filter((c: any) => c.status === 'pending-signature').length || 0}
              </div>
              <p className="text-xs text-yellow-100">Aguardando assinatura</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">Concluídos</CardTitle>
              <CheckCircle className="h-5 w-5 text-blue-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {contracts?.filter((c: any) => c.status === 'completed').length || 0}
              </div>
              <p className="text-xs text-blue-100">Contratos finalizados</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-slate-600" />
              <CardTitle>Buscar Contratos</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número do contrato, candidato ou empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contracts Table */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-teal-600" />
              <div>
                <CardTitle>Todos os Contratos</CardTitle>
                <CardDescription>Lista completa de contratos na plataforma</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredContracts && filteredContracts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Candidato</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Salário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContracts.map((contract: any) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium">{contract.contract_number}</TableCell>
                      <TableCell>{contract.candidates?.full_name || 'N/A'}</TableCell>
                      <TableCell>{contract.companies?.company_name || 'N/A'}</TableCell>
                      <TableCell>{formatCurrency(contract.monthly_salary)}</TableCell>
                      <TableCell>{getStatusBadge(contract.status)}</TableCell>
                      <TableCell>
                        {contract.start_date ? new Date(contract.start_date).toLocaleDateString('pt-BR') : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {contract.status === 'pending-signature' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleActivate(contract.id)}
                              disabled={updateStatusMutation.isLoading}
                            >
                              <PlayCircle className="h-4 w-4 mr-1" />
                              Ativar
                            </Button>
                          )}
                          {contract.status === 'active' && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleComplete(contract.id)}
                                disabled={updateStatusMutation.isLoading}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Concluir
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSuspend(contract.id)}
                                disabled={updateStatusMutation.isLoading}
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                Suspender
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleTerminate(contract.id)}
                                disabled={updateStatusMutation.isLoading}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Encerrar
                              </Button>
                            </>
                          )}
                          {contract.status === 'suspended' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleActivate(contract.id)}
                              disabled={updateStatusMutation.isLoading}
                            >
                              <PlayCircle className="h-4 w-4 mr-1" />
                              Reativar
                            </Button>
                          )}
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum contrato encontrado</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Tente ajustar seus critérios de busca' : 'Contratos aparecerão aqui quando forem criados'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
