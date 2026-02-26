// @ts-nocheck
import { useAuth } from "@/_core/hooks/useAuth";
import ContentTransition from "@/components/ui/ContentTransition";
import { StatsCardsSkeleton, TableSkeleton } from "@/components/ui/skeletons";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import {
  DollarSign,
  CheckCircle,
  Eye,
  Clock,
  AlertCircle,
  Building,
  FileWarning,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export default function PaymentPage() {
  const { user, loading: authLoading } = useAuth();
  const { currentAgency, isAllAgenciesMode } = useAgencyContext();
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<any>(null);
  const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({});

  // Determine role capabilities
  const isAffiliate = user?.role === 'admin' || user?.role === 'super_admin';
  const isAgency = user?.role === 'agency';
  const isAdmin = isAffiliate;

  // Conditional tRPC queries based on role
  const affiliatePaymentsQuery = trpc.affiliate.getPayments.useQuery(
    { agencyId: currentAgency?.id ?? null },
    { enabled: isAffiliate }
  );
  const agencyPaymentsQuery = trpc.agency.getPayments.useQuery(undefined, { enabled: isAgency });

  // Per-company grouped data (agency only - admin groups client-side)
  const groupedPaymentsQuery = trpc.agency.getPaymentsGroupedByCompany.useQuery(undefined, {
    enabled: isAgency,
  });

  // For affiliate commission card
  const affiliateQuery = trpc.affiliate.getByUserId.useQuery(undefined, { enabled: isAffiliate });

  // Pending review receipts (admin + agency)
  const pendingReviewQuery = trpc.admin.getPaymentsPendingReview.useQuery(undefined, {
    enabled: isAdmin || isAgency,
  });

  // Select the right data based on role
  const payments = isAffiliate ? affiliatePaymentsQuery.data : agencyPaymentsQuery.data;
  const refetchPayments = isAffiliate ? affiliatePaymentsQuery.refetch : agencyPaymentsQuery.refetch;
  const paymentsLoading = affiliatePaymentsQuery.isLoading || agencyPaymentsQuery.isLoading;
  const affiliate = affiliateQuery.data;
  const pendingReviews = pendingReviewQuery.data || [];

  // Group payments by company (client-side for admin, server-side for agency)
  const companyGroups = useMemo(() => {
    if (isAgency) return groupedPaymentsQuery.data || [];

    // Group admin payments client-side
    if (!payments || payments.length === 0) return [];

    const grouped: Record<string, any> = {};
    for (const payment of payments) {
      const companyId = payment.companies?.id || 'unknown';
      const companyName = payment.companies?.company_name || 'N/A';

      if (!grouped[companyId]) {
        grouped[companyId] = {
          companyId,
          companyName,
          totalDue: 0,
          totalPaid: 0,
          overdueCount: 0,
          overdueAmount: 0,
          pendingCount: 0,
          pendingAmount: 0,
          nextPaymentDate: null,
          payments: [],
        };
      }

      const g = grouped[companyId];
      g.payments.push(payment);

      if (payment.status === 'paid') {
        g.totalPaid += payment.amount || 0;
      } else if (payment.status === 'overdue') {
        g.overdueCount++;
        g.overdueAmount += payment.amount || 0;
        g.totalDue += payment.amount || 0;
      } else if (payment.status === 'pending') {
        g.pendingCount++;
        g.pendingAmount += payment.amount || 0;
        g.totalDue += payment.amount || 0;

        if (payment.due_date && (!g.nextPaymentDate || payment.due_date < g.nextPaymentDate)) {
          g.nextPaymentDate = payment.due_date;
        }
      }
    }

    return Object.values(grouped).sort((a: any, b: any) => {
      if (a.overdueCount > 0 && b.overdueCount === 0) return -1;
      if (b.overdueCount > 0 && a.overdueCount === 0) return 1;
      if (a.nextPaymentDate && b.nextPaymentDate) return a.nextPaymentDate.localeCompare(b.nextPaymentDate);
      return 0;
    });
  }, [isAgency, payments, groupedPaymentsQuery.data]);

  // Mutations (admin only - for receipt review)
  const reviewReceiptMutation = trpc.admin.reviewPaymentReceipt.useMutation({
    onSuccess: (_, variables) => {
      toast.success(variables.action === 'approve' ? 'Comprovante aprovado!' : 'Comprovante rejeitado');
      pendingReviewQuery.refetch();
      refetchPayments();
      if (isAgency) groupedPaymentsQuery.refetch();
      setReceiptModalOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao revisar comprovante');
    },
  });

  if (!authLoading && (!user || !['admin', 'agency'].includes(user.role))) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Voce nao tem permissao para acessar esta pagina.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Handlers
  const handleReviewReceipt = (payment: any) => {
    setSelectedReceiptPayment(payment);
    setReceiptModalOpen(true);
  };

  const handleApproveReceipt = () => {
    if (selectedReceiptPayment) {
      reviewReceiptMutation.mutate({ paymentId: selectedReceiptPayment.id, action: 'approve' });
    }
  };

  const handleRejectReceipt = () => {
    if (selectedReceiptPayment) {
      reviewReceiptMutation.mutate({ paymentId: selectedReceiptPayment.id, action: 'reject', notes: 'Comprovante rejeitado pelo administrador' });
    }
  };

  const toggleCompanyExpanded = (companyId: string) => {
    setExpandedCompanies(prev => ({ ...prev, [companyId]: !prev[companyId] }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500 text-white">Pago</Badge>;
      case 'pending':
        return <Badge className="bg-orange-500 text-white">Pendente</Badge>;
      case 'overdue':
        return <Badge className="bg-red-500 text-white">Atrasado</Badge>;
      case 'failed':
        return <Badge className="bg-slate-500 text-white">Falhou</Badge>;
      case 'refunded':
        return <Badge className="bg-blue-500 text-white">Reembolsado</Badge>;
      default:
        return <Badge className="bg-slate-500 text-white">{status}</Badge>;
    }
  };

  const getReceiptStatusBadge = (receiptStatus: string | null) => {
    if (!receiptStatus) return null;
    switch (receiptStatus) {
      case 'pending-review':
        return <Badge className="bg-orange-500 text-white text-xs">Comprovante pendente</Badge>;
      case 'verified':
        return <Badge className="bg-green-500 text-white text-xs">Comprovante OK</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500 text-white text-xs">Comprovante rejeitado</Badge>;
      default:
        return null;
    }
  };

  const getPaymentTypeBadge = (type: string) => {
    const types: Record<string, string> = {
      'monthly-fee': 'Mensalidade',
      'setup-fee': 'Taxa de Setup',
      'insurance-fee': 'Seguro',
      'penalty': 'Multa',
      'refund': 'Reembolso'
    };
    return <Badge variant="outline">{types[type] || type}</Badge>;
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  };

  const getCompanyStatusColor = (group: any) => {
    if (group.overdueCount > 0) return "red";
    if (group.nextPaymentDate) {
      const nextDate = new Date(group.nextPaymentDate);
      const daysUntil = Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 7) return "yellow";
    }
    return "green";
  };

  // Calculate totals - pending only for current month
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const totalRevenue = payments?.filter((p: any) => p.status === 'paid').reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
  const pendingRevenue = payments?.filter((p: any) => {
    if (p.status !== 'pending') return false;
    if (!p.due_date) return false;
    const due = new Date(p.due_date);
    return due >= currentMonthStart && due <= currentMonthEnd;
  }).reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
  const pendingCount = payments?.filter((p: any) => {
    if (p.status !== 'pending') return false;
    if (!p.due_date) return false;
    const due = new Date(p.due_date);
    return due >= currentMonthStart && due <= currentMonthEnd;
  }).length || 0;
  const overdueRevenue = payments?.filter((p: any) => p.status === 'overdue').reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;

  // Calculate affiliate commission
  const affiliateCommission = !isAdmin && isAffiliate && affiliate ? (totalRevenue * affiliate.commission_rate) / 100 : 0;

  // Count overdue companies
  const overdueCompanies = companyGroups.filter((g: any) => g.overdueCount > 0);

  return (
    <DashboardLayout>
      <ContentTransition isLoading={paymentsLoading} skeleton={<><StatsCardsSkeleton count={3} /><TableSkeleton columns={5} rows={6} /></>}>
      <div className="space-y-6">
        {/* Centered Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-[#0A2342]">Pagamentos</h2>
          <p className="text-slate-600 mt-1">Acompanhe receitas e pagamentos</p>
        </div>

        {/* Overdue Alert Banner */}
        {overdueCompanies.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-800">
                  {overdueCompanies.length} empresa{overdueCompanies.length > 1 ? 's' : ''} com pagamentos atrasados
                </h3>
                <div className="mt-2 space-y-1">
                  {overdueCompanies.map((group: any) => {
                    const daysOverdue = group.payments
                      .filter((p: any) => p.status === 'overdue')
                      .map((p: any) => {
                        const due = new Date(p.due_date);
                        return Math.ceil((Date.now() - due.getTime()) / (1000 * 60 * 60 * 24));
                      });
                    const maxDays = Math.max(...daysOverdue);
                    return (
                      <div key={group.companyId} className="flex items-center justify-between text-sm">
                        <span className="text-red-700 font-medium">{group.companyName}</span>
                        <span className="text-red-600">
                          {group.overdueCount} pagamento{group.overdueCount > 1 ? 's' : ''} - {formatCurrency(group.overdueAmount)} - {maxDays} dia{maxDays > 1 ? 's' : ''} atrasado
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className={`grid gap-6 ${pendingReviews.length > 0 ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
          <Card className="border-emerald-200 bg-emerald-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700">Receita Recebida</CardTitle>
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-emerald-900">{formatCurrency(totalRevenue)}</div>
              <p className="text-xs text-emerald-600">
                {payments?.filter((p: any) => p.status === 'paid').length || 0} pagamentos
              </p>
            </CardContent>
          </Card>

          {/* Commission Card - Only for non-admin affiliates */}
          {!isAdmin && isAffiliate && affiliate && (
            <Card className="border-purple-200 bg-purple-50/50 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-700">Sua Comissao</CardTitle>
                <DollarSign className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold mb-1 text-purple-900">{formatCurrency(affiliateCommission)}</div>
                <p className="text-xs text-purple-600">{affiliate.commission_rate}% do total</p>
              </CardContent>
            </Card>
          )}

          <Card className="border-yellow-200 bg-yellow-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700">Receita Pendente</CardTitle>
              <Clock className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-yellow-900">{formatCurrency(pendingRevenue)}</div>
              <p className="text-xs text-yellow-600">{pendingCount} pagamento{pendingCount !== 1 ? 's' : ''} este mes</p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700">Pagamentos Atrasados</CardTitle>
              <AlertCircle className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-red-900">{formatCurrency(overdueRevenue)}</div>
              <p className="text-xs text-red-600">{payments?.filter((p: any) => p.status === 'overdue').length || 0} pagamentos</p>
            </CardContent>
          </Card>

          {/* Pending Receipts Card */}
          {(isAdmin || isAgency) && pendingReviews.length > 0 && (
            <Card className="border-orange-200 bg-orange-50/50 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-700">Comprovantes Pendentes</CardTitle>
                <FileWarning className="h-5 w-5 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold mb-1 text-orange-900">{pendingReviews.length}</div>
                <p className="text-xs text-orange-600">aguardando revisao</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Pending Receipt Reviews - Admin only */}
        {(isAdmin || isAgency) && pendingReviews.length > 0 && (
          <Card className="border-orange-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
                <FileWarning className="h-5 w-5" />
                Comprovantes para Revisao
              </CardTitle>
              <CardDescription>Comprovantes que a IA nao conseguiu verificar automaticamente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingReviews.map((payment: any) => {
                const aiResult = payment.ai_verification_result;
                return (
                  <div key={payment.id} className="border border-orange-200 rounded-lg p-4 bg-orange-50/50 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900">
                          {payment.companies?.company_name}
                        </p>
                        {payment.contracts?.contract_number && (
                          <>
                            <span className="text-gray-400">&bull;</span>
                            <span className="text-sm text-gray-600">{payment.contracts.contract_number}</span>
                          </>
                        )}
                      </div>
                      <p className="text-lg font-bold text-gray-800">
                        {formatCurrency(payment.amount)}
                      </p>
                      {aiResult && (
                        <p className="text-sm text-gray-500 mt-1">
                          IA encontrou: {aiResult.amount_found != null ? `R$ ${aiResult.amount_found?.toFixed(2)}` : 'N/A'}
                          {' \u2022 '}Confianca: {aiResult.confidence || 'N/A'}
                          {aiResult.details && ` \u2022 ${aiResult.details}`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {payment.receipt_url && (
                        <Button size="sm" variant="outline" onClick={() => handleReviewReceipt(payment)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      )}
                      <Button size="sm" variant="default" onClick={() => { setSelectedReceiptPayment(payment); handleApproveReceipt(); }} disabled={reviewReceiptMutation.isPending}>
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        Aprovar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => { setSelectedReceiptPayment(payment); handleRejectReceipt(); }} disabled={reviewReceiptMutation.isPending}>
                        <ThumbsDown className="h-4 w-4 mr-1" />
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Per-Company Breakdown - for both admin and agency */}
        <Card>
          <CardHeader>
            <CardTitle>Pagamentos por Empresa</CardTitle>
            <CardDescription>Acompanhamento de pagamentos agrupados por empresa</CardDescription>
          </CardHeader>
          <CardContent>
            {companyGroups.length > 0 ? (
              <div className="space-y-3">
                {companyGroups.map((group: any) => {
                  const statusColor = getCompanyStatusColor(group);
                  const isExpanded = expandedCompanies[group.companyId];
                  const borderColor = statusColor === "red" ? "border-red-200" : statusColor === "yellow" ? "border-yellow-200" : "border-emerald-200";
                  const bgColor = statusColor === "red" ? "bg-red-50/50" : statusColor === "yellow" ? "bg-yellow-50/50" : "bg-emerald-50/50";
                  const dotColor = statusColor === "red" ? "bg-red-500" : statusColor === "yellow" ? "bg-yellow-500" : "bg-emerald-500";

                  return (
                    <div key={group.companyId} className={`border ${borderColor} rounded-lg overflow-hidden`}>
                      <button
                        onClick={() => toggleCompanyExpanded(group.companyId)}
                        className={`w-full p-4 ${bgColor} flex items-center justify-between hover:opacity-90 transition-opacity text-left`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${dotColor}`} />
                          <div>
                            <p className="font-semibold text-gray-900">{group.companyName}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              {group.overdueCount > 0 && (
                                <span className="text-red-600 font-medium">
                                  {group.overdueCount} atrasado{group.overdueCount > 1 ? 's' : ''}
                                </span>
                              )}
                              {group.pendingCount > 0 && (
                                <span className="text-yellow-600">
                                  {group.pendingCount} pendente{group.pendingCount > 1 ? 's' : ''}
                                </span>
                              )}
                              {group.nextPaymentDate && (
                                <span>
                                  Prox: {new Date(group.nextPaymentDate).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              {formatCurrency(group.totalDue)}
                            </p>
                            <p className="text-xs text-gray-500">a receber</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-emerald-700">
                              {formatCurrency(group.totalPaid)}
                            </p>
                            <p className="text-xs text-gray-500">recebido</p>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Vencimento</TableHead>
                                <TableHead>Periodo</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Comprovante</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {group.payments.map((payment: any) => (
                                <TableRow key={payment.id}>
                                  <TableCell>{getPaymentTypeBadge(payment.payment_type)}</TableCell>
                                  <TableCell className="font-semibold">{formatCurrency(payment.amount || 0)}</TableCell>
                                  <TableCell>
                                    {payment.due_date ? new Date(payment.due_date).toLocaleDateString('pt-BR') : '-'}
                                  </TableCell>
                                  <TableCell>{payment.billing_period || '-'}</TableCell>
                                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                                  <TableCell>
                                    {payment.receipt_url ? (
                                      <button onClick={() => handleReviewReceipt(payment)} className="hover:opacity-80">
                                        {getReceiptStatusBadge(payment.receipt_status)}
                                      </button>
                                    ) : (
                                      <span className="text-xs text-gray-400">-</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Building className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-500 mb-1">Nenhuma empresa com pagamentos</h3>
                <p className="text-gray-400 text-sm">Pagamentos aparecerao aqui quando contratos forem ativados</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Receipt Review Modal */}
        <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Revisao de Comprovante</DialogTitle>
              <DialogDescription>
                {selectedReceiptPayment?.companies?.company_name} &bull; {formatCurrency(selectedReceiptPayment?.amount || 0)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Receipt Image */}
              {selectedReceiptPayment?.receipt_url && (
                <div className="border rounded-lg overflow-hidden bg-gray-50">
                  <img
                    src={selectedReceiptPayment.receipt_url}
                    alt="Comprovante de pagamento"
                    className="w-full max-h-96 object-contain"
                  />
                </div>
              )}

              {/* AI Analysis Result */}
              {selectedReceiptPayment?.ai_verification_result && (
                <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-1">
                  <p className="font-medium text-gray-700">Analise da IA:</p>
                  <p>Valor encontrado: {selectedReceiptPayment.ai_verification_result.amount_found != null ? `R$ ${selectedReceiptPayment.ai_verification_result.amount_found?.toFixed(2)}` : 'N/A'}</p>
                  <p>Valor esperado: {formatCurrency(selectedReceiptPayment?.amount || 0)}</p>
                  <p>Confianca: {selectedReceiptPayment.ai_verification_result.confidence || 'N/A'}</p>
                  {selectedReceiptPayment.ai_verification_result.details && (
                    <p>Detalhes: {selectedReceiptPayment.ai_verification_result.details}</p>
                  )}
                </div>
              )}
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setReceiptModalOpen(false)}>
                Fechar
              </Button>
              {(isAdmin || isAgency) && (
                <>
                  <Button variant="destructive" onClick={handleRejectReceipt} disabled={reviewReceiptMutation.isPending}>
                    <ThumbsDown className="h-4 w-4 mr-1" />
                    Rejeitar
                  </Button>
                  <Button onClick={handleApproveReceipt} disabled={reviewReceiptMutation.isPending}>
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    Aprovar
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </ContentTransition>
    </DashboardLayout>
  );
}
