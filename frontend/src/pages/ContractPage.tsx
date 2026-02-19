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
import { trpc } from "@/lib/trpc";
import {
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  Clock,
  Ban,
  PlayCircle,
  Building
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { toast } from "sonner";

export default function ContractPage() {
  const { user, loading: authLoading } = useAuth();
  const { currentAgency, isAllAgenciesMode } = useAgencyContext();
  const [searchTerm, setSearchTerm] = useState("");

  // Determine role capabilities
  const isAffiliate = user?.role === 'admin' || user?.role === 'super_admin';
  const isAgency = user?.role === 'agency';
  const isAdmin = isAffiliate; // Affiliates have admin-like capabilities

  // Conditional tRPC queries based on role
  // Pass null explicitly for "All Agencies" mode (currentAgency is null)
  const affiliateContractsQuery = trpc.affiliate.getContracts.useQuery(
    { agencyId: currentAgency?.id ?? null },
    { enabled: isAffiliate }
  );
  const agencyContractsQuery = trpc.agency.getContracts.useQuery(undefined, { enabled: isAgency });

  // Select the right data based on role
  const contracts = isAffiliate ? affiliateContractsQuery.data : agencyContractsQuery.data;
  const refetchContracts = isAffiliate ? affiliateContractsQuery.refetch : agencyContractsQuery.refetch;
  const contractsLoading = affiliateContractsQuery.isLoading || agencyContractsQuery.isLoading;

  // Mutations (admin only)
  const updateStatusMutation = trpc.admin.updateContractStatus.useMutation({
    onSuccess: () => {
      refetchContracts();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar contrato");
    },
  });

  const isLoading = authLoading || contractsLoading;

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

  const formatCurrency = (value: number) => {
    // Handle both cents and full values
    const amount = value > 10000 ? value / 100 : value;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
  };

  // Filter contracts
  const filteredContracts = contracts?.filter((contract: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const candidateName = isAdmin ? contract.candidates?.full_name : contract.application?.candidate?.full_name;
    const companyName = isAdmin ? contract.companies?.company_name : contract.application?.job?.company?.company_name;
    return (
      contract.contract_number?.toLowerCase().includes(searchLower) ||
      candidateName?.toLowerCase().includes(searchLower) ||
      companyName?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-7 w-7 text-blue-600" />
            Contratos
          </h1>
        </div>

        {/* Summary Cards */}
        <div className={`grid gap-6 ${isAdmin ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
          {!isAdmin && (
            <Card className="border-slate-200 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total de Contratos</CardTitle>
                <FileText className="h-5 w-5 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold mb-1 text-slate-900">{contracts?.length || 0}</div>
                <p className="text-xs text-slate-500">Contratos cadastrados</p>
              </CardContent>
            </Card>
          )}

          <Card className="border-emerald-200 bg-emerald-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700">Contratos Ativos</CardTitle>
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-emerald-900">
                {contracts?.filter((c: any) => c.status === 'active').length || 0}
              </div>
              <p className="text-xs text-emerald-600">{isAdmin ? 'Contratos em andamento' : 'Em andamento'}</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700">{isAdmin ? 'Pendentes' : 'Pendente Assinatura'}</CardTitle>
              <Clock className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-yellow-900">
                {contracts?.filter((c: any) => c.status === 'pending-signature').length || 0}
              </div>
              <p className="text-xs text-yellow-600">{isAdmin ? 'Aguardando assinatura' : 'Aguardando'}</p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Concluídos</CardTitle>
              <CheckCircle className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-blue-900">
                {contracts?.filter((c: any) => c.status === 'completed').length || 0}
              </div>
              <p className="text-xs text-blue-600">{isAdmin ? 'Contratos finalizados' : 'Finalizados'}</p>
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
                placeholder="Buscar por número, candidato ou empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contracts Table */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              <div>
                <CardTitle>{isAdmin ? 'Todos os Contratos' : 'Contratos da Região'}</CardTitle>
                <CardDescription>
                  {isAdmin ? 'Lista completa de contratos na plataforma' : 'Lista de contratos de trabalho na sua região'}
                </CardDescription>
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
                    {!isAdmin && <TableHead>Vaga</TableHead>}
                    <TableHead>Empresa</TableHead>
                    {isAllAgenciesMode && <TableHead>Agência</TableHead>}
                    <TableHead>Salário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>{isAdmin ? 'Início' : 'Data Início'}</TableHead>
                    {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContracts.map((contract: any) => {
                    const candidateName = isAdmin ? contract.candidates?.full_name : contract.application?.candidate?.full_name;
                    const companyName = isAdmin ? contract.companies?.company_name : contract.application?.job?.company?.company_name;
                    const jobTitle = contract.application?.job?.title;
                    const salary = isAdmin ? contract.monthly_salary : contract.salary_cents;
                    return (
                      <TableRow key={contract.id}>
                        <TableCell className="font-medium">{contract.contract_number || 'N/A'}</TableCell>
                        <TableCell>{candidateName || 'N/A'}</TableCell>
                        {!isAdmin && <TableCell>{jobTitle || 'N/A'}</TableCell>}
                        <TableCell>{companyName || 'N/A'}</TableCell>
                        {isAllAgenciesMode && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-slate-400" />
                              <span className="text-sm">{contract.agency?.name || 'N/A'}</span>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>{formatCurrency(salary || 0)}</TableCell>
                        <TableCell>{getStatusBadge(contract.status)}</TableCell>
                        <TableCell>
                          {contract.start_date ? new Date(contract.start_date).toLocaleDateString('pt-BR') : '-'}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {contract.status === 'pending-signature' && (
                                <Button size="sm" variant="default" onClick={() => handleActivate(contract.id)} disabled={updateStatusMutation.isPending}>
                                  <PlayCircle className="h-4 w-4 mr-1" />
                                  Ativar
                                </Button>
                              )}
                              {contract.status === 'active' && (
                                <>
                                  <Button size="sm" variant="default" onClick={() => handleComplete(contract.id)} disabled={updateStatusMutation.isPending}>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Concluir
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleSuspend(contract.id)} disabled={updateStatusMutation.isPending}>
                                    <Ban className="h-4 w-4 mr-1" />
                                    Suspender
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleTerminate(contract.id)} disabled={updateStatusMutation.isPending}>
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Encerrar
                                  </Button>
                                </>
                              )}
                              {contract.status === 'suspended' && (
                                <Button size="sm" variant="default" onClick={() => handleActivate(contract.id)} disabled={updateStatusMutation.isPending}>
                                  <PlayCircle className="h-4 w-4 mr-1" />
                                  Reativar
                                </Button>
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
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm ? 'Nenhum contrato encontrado' : 'Nenhum contrato cadastrado'}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Tente ajustar os termos de busca' : 'Contratos aparecerão aqui quando forem criados'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
