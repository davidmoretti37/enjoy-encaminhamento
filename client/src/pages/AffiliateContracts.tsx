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
  CheckCircle,
  XCircle,
  Search,
  ArrowLeft,
  Clock,
  Ban
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { useLocation } from "wouter";

export default function AffiliateContracts() {
  useAgentContext('contratos');
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: affiliate, isLoading: affiliateLoading } = trpc.affiliate.getByUserId.useQuery();
  const { data: contracts, isLoading: contractsLoading } = trpc.affiliate.getContracts.useQuery();

  const isLoading = authLoading || affiliateLoading || contractsLoading;

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
      contract.application?.candidate?.full_name?.toLowerCase().includes(searchLower) ||
      contract.application?.job?.company?.company_name?.toLowerCase().includes(searchLower)
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
              <FileText className="h-10 w-10" />
              Contratos da Região
            </h1>
            <p className="text-slate-300 text-lg">
              Monitorar contratos na região: {affiliate.region}
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-4">
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

          <Card className="border-emerald-200 bg-emerald-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700">Contratos Ativos</CardTitle>
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-emerald-900">
                {contracts?.filter((c: any) => c.status === 'active').length || 0}
              </div>
              <p className="text-xs text-emerald-600">Em andamento</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700">Pendente Assinatura</CardTitle>
              <Clock className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-yellow-900">
                {contracts?.filter((c: any) => c.status === 'pending-signature').length || 0}
              </div>
              <p className="text-xs text-yellow-600">Aguardando</p>
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
              <p className="text-xs text-blue-600">Finalizados</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-slate-600" />
              <CardTitle>Buscar Contratos</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, candidato ou empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contracts Table */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              <div>
                <CardTitle>Contratos da Região</CardTitle>
                <CardDescription>
                  Lista de contratos de trabalho na sua região
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
                    <TableHead>Vaga</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Salário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Início</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContracts.map((contract: any) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium">{contract.contract_number || 'N/A'}</TableCell>
                      <TableCell>{contract.application?.candidate?.full_name || 'N/A'}</TableCell>
                      <TableCell>{contract.application?.job?.title || 'N/A'}</TableCell>
                      <TableCell>{contract.application?.job?.company?.company_name || 'N/A'}</TableCell>
                      <TableCell>{formatCurrency(contract.salary_cents || 0)}</TableCell>
                      <TableCell>{getStatusBadge(contract.status)}</TableCell>
                      <TableCell>
                        {contract.start_date ? new Date(contract.start_date).toLocaleDateString('pt-BR') : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm ? 'Nenhum contrato encontrado' : 'Nenhum contrato cadastrado'}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? 'Tente ajustar os termos de busca'
                    : 'Contratos aparecerão aqui quando forem gerados para candidatos da sua região'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
