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
  DollarSign,
  CheckCircle,
  XCircle,
  Search,
  ArrowLeft,
  Clock,
  AlertCircle
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { useLocation } from "wouter";

export default function AffiliatePayments() {
  useAgentContext('pagamentos');
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: affiliate, isLoading: affiliateLoading } = trpc.affiliate.getByUserId.useQuery();
  const { data: payments, isLoading: paymentsLoading } = trpc.affiliate.getPayments.useQuery();

  const isLoading = authLoading || affiliateLoading || paymentsLoading;

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
      case 'paid':
        return <Badge className="bg-green-500">Pago</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pendente</Badge>;
      case 'overdue':
        return <Badge className="bg-red-500">Atrasado</Badge>;
      case 'failed':
        return <Badge className="bg-gray-500">Falhou</Badge>;
      case 'refunded':
        return <Badge className="bg-blue-500">Reembolsado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPaymentTypeBadge = (type: string) => {
    const types: Record<string, string> = {
      'monthly-fee': 'Mensalidade',
      'setup-fee': 'Taxa de Setup',
      'penalty': 'Multa',
      'refund': 'Reembolso'
    };
    return <Badge variant="outline">{types[type] || type}</Badge>;
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  };

  // Calculate totals
  const totalRevenue = payments?.filter((p: any) => p.status === 'paid').reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
  const pendingRevenue = payments?.filter((p: any) => p.status === 'pending').reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
  const overdueRevenue = payments?.filter((p: any) => p.status === 'overdue').reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;

  // Calculate affiliate commission
  const affiliateCommission = (totalRevenue * affiliate.commission_rate) / 100;

  // Filter payments based on search term
  const filteredPayments = payments?.filter((payment: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      payment.contract?.application?.job?.company?.company_name?.toLowerCase().includes(searchLower) ||
      payment.contract?.contract_number?.toLowerCase().includes(searchLower) ||
      payment.contract?.application?.candidate?.full_name?.toLowerCase().includes(searchLower)
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
              <DollarSign className="h-10 w-10" />
              Pagamentos da Região
            </h1>
            <p className="text-slate-300 text-lg">
              Monitorar pagamentos na região: {affiliate.region}
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="border-emerald-200 bg-emerald-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700">Receita Total</CardTitle>
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-emerald-900">
                {formatCurrency(totalRevenue)}
              </div>
              <p className="text-xs text-emerald-600">Pagamentos recebidos</p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">Sua Comissão</CardTitle>
              <DollarSign className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-purple-900">
                {formatCurrency(affiliateCommission)}
              </div>
              <p className="text-xs text-purple-600">{affiliate.commission_rate}% do total</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700">Pendentes</CardTitle>
              <Clock className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-yellow-900">
                {formatCurrency(pendingRevenue)}
              </div>
              <p className="text-xs text-yellow-600">
                {payments?.filter((p: any) => p.status === 'pending').length || 0} pagamentos
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700">Atrasados</CardTitle>
              <AlertCircle className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-red-900">
                {formatCurrency(overdueRevenue)}
              </div>
              <p className="text-xs text-red-600">
                {payments?.filter((p: any) => p.status === 'overdue').length || 0} pagamentos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-slate-600" />
              <CardTitle>Buscar Pagamentos</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por empresa, contrato ou candidato..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <CardTitle>Pagamentos da Região</CardTitle>
                <CardDescription>
                  Lista de pagamentos processados na sua região
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredPayments && filteredPayments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Candidato</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.contract?.application?.job?.company?.company_name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {payment.contract?.application?.candidate?.full_name || 'N/A'}
                      </TableCell>
                      <TableCell>{payment.contract?.contract_number || 'N/A'}</TableCell>
                      <TableCell>{getPaymentTypeBadge(payment.payment_type)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(payment.amount || 0)}</TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>
                        {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('pt-BR') : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm ? 'Nenhum pagamento encontrado' : 'Nenhum pagamento registrado'}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? 'Tente ajustar os termos de busca'
                    : 'Pagamentos aparecerão aqui quando forem processados para contratos da sua região'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
