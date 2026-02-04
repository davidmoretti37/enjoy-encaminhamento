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
  Image,
  X
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { toast } from "sonner";

export default function PaymentPage() {
  const { user, loading: authLoading } = useAuth();
  const { currentAgency, isAllAgenciesMode } = useAgencyContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<any>(null);

  // Determine role capabilities
  const isAffiliate = user?.role === 'admin';
  const isAgency = user?.role === 'agency';
  const isAdmin = isAffiliate;

  // Conditional tRPC queries based on role
  const affiliatePaymentsQuery = trpc.affiliate.getPayments.useQuery(
    { agencyId: currentAgency?.id ?? null },
    { enabled: isAffiliate }
  );
  const agencyPaymentsQuery = trpc.agency.getPayments.useQuery(undefined, { enabled: isAgency });

  // For affiliate commission card
  const affiliateQuery = trpc.affiliate.getByUserId.useQuery(undefined, { enabled: isAffiliate });

  // Pending review receipts (admin only)
  const pendingReviewQuery = trpc.admin.getPaymentsPendingReview.useQuery(undefined, {
    enabled: isAdmin,
  });

  // Select the right data based on role
  const payments = isAffiliate ? affiliatePaymentsQuery.data : agencyPaymentsQuery.data;
  const refetchPayments = isAffiliate ? affiliatePaymentsQuery.refetch : agencyPaymentsQuery.refetch;
  const paymentsLoading = affiliatePaymentsQuery.isLoading || agencyPaymentsQuery.isLoading;
  const affiliate = affiliateQuery.data;
  const pendingReviews = pendingReviewQuery.data || [];

  // Mutations (admin only)
  const updateStatusMutation = trpc.admin.updatePaymentStatus.useMutation({
    onSuccess: () => refetchPayments()
  });

  const reviewReceiptMutation = trpc.admin.reviewPaymentReceipt.useMutation({
    onSuccess: (_, variables) => {
      toast.success(variables.action === 'approve' ? 'Comprovante aprovado!' : 'Comprovante rejeitado');
      pendingReviewQuery.refetch();
      refetchPayments();
      setReceiptModalOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao revisar comprovante');
    },
  });

  const isLoading = authLoading || paymentsLoading;

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

  // Handlers
  const handleMarkPaid = async (paymentId: string) => {
    await updateStatusMutation.mutateAsync({ id: paymentId, status: 'paid' });
  };

  const handleMarkOverdue = async (paymentId: string) => {
    await updateStatusMutation.mutateAsync({ id: paymentId, status: 'overdue' });
  };

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

  const getReceiptStatusBadge = (receiptStatus: string | null) => {
    if (!receiptStatus) return null;
    switch (receiptStatus) {
      case 'pending-review':
        return <Badge className="bg-yellow-500 text-xs">Comprovante pendente</Badge>;
      case 'verified':
        return <Badge className="bg-green-500 text-xs">Comprovante OK</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500 text-xs">Comprovante rejeitado</Badge>;
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

  // Calculate totals
  const totalRevenue = payments?.filter((p: any) => p.status === 'paid').reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
  const pendingRevenue = payments?.filter((p: any) => p.status === 'pending').reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
  const overdueRevenue = payments?.filter((p: any) => p.status === 'overdue').reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;

  // Calculate affiliate commission
  const affiliateCommission = !isAdmin && isAffiliate && affiliate ? (totalRevenue * affiliate.commission_rate) / 100 : 0;

  // Filter payments
  const filteredPayments = payments?.filter((payment: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const companyName = isAdmin ? payment.companies?.company_name : payment.contract?.application?.job?.company?.company_name;
    const contractNumber = isAdmin ? payment.contracts?.contract_number : payment.contract?.contract_number;
    const candidateName = payment.contract?.application?.candidate?.full_name;
    return (
      companyName?.toLowerCase().includes(searchLower) ||
      contractNumber?.toLowerCase().includes(searchLower) ||
      candidateName?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header - Centered */}
        <div className="text-center py-4">
          <h1 className="text-3xl font-bold text-gray-900">Pagamentos</h1>
          <p className="text-gray-500 mt-1">Acompanhe receitas e pagamentos</p>
        </div>

        {/* Summary Cards */}
        <div className={`grid gap-6 ${isAdmin ? (pendingReviews.length > 0 ? 'md:grid-cols-4' : 'md:grid-cols-3') : 'md:grid-cols-4'}`}>
          <Card className="border-emerald-200 bg-emerald-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700">{isAdmin ? 'Receita Recebida' : 'Receita Total'}</CardTitle>
              {isAdmin ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <DollarSign className="h-5 w-5 text-emerald-600" />}
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-emerald-900">{formatCurrency(totalRevenue)}</div>
              <p className="text-xs text-emerald-600">
                {isAdmin ? `${payments?.filter((p: any) => p.status === 'paid').length || 0} pagamentos` : 'Pagamentos recebidos'}
              </p>
            </CardContent>
          </Card>

          {/* Commission Card - Only for non-admin affiliates */}
          {!isAdmin && isAffiliate && affiliate && (
            <Card className="border-purple-200 bg-purple-50/50 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-700">Sua Comissão</CardTitle>
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
              <CardTitle className="text-sm font-medium text-yellow-700">{isAdmin ? 'Receita Pendente' : 'Pendentes'}</CardTitle>
              <Clock className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-yellow-900">{formatCurrency(pendingRevenue)}</div>
              <p className="text-xs text-yellow-600">{payments?.filter((p: any) => p.status === 'pending').length || 0} pagamentos</p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700">{isAdmin ? 'Pagamentos Atrasados' : 'Atrasados'}</CardTitle>
              <AlertCircle className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-red-900">{formatCurrency(overdueRevenue)}</div>
              <p className="text-xs text-red-600">{payments?.filter((p: any) => p.status === 'overdue').length || 0} pagamentos</p>
            </CardContent>
          </Card>

          {/* Pending Receipts Card - Admin only */}
          {isAdmin && pendingReviews.length > 0 && (
            <Card className="border-orange-200 bg-orange-50/50 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-700">Comprovantes Pendentes</CardTitle>
                <FileWarning className="h-5 w-5 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold mb-1 text-orange-900">{pendingReviews.length}</div>
                <p className="text-xs text-orange-600">aguardando revisão</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Pending Receipt Reviews - Admin only */}
        {isAdmin && pendingReviews.length > 0 && (
          <Card className="border-orange-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
                <FileWarning className="h-5 w-5" />
                Comprovantes para Revisão
              </CardTitle>
              <CardDescription>Comprovantes que a IA não conseguiu verificar automaticamente</CardDescription>
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
                        <span className="text-gray-400">•</span>
                        <span className="text-sm text-gray-600">{payment.contracts?.contract_number}</span>
                      </div>
                      <p className="text-lg font-bold text-gray-800">
                        {formatCurrency(payment.amount)}
                      </p>
                      {aiResult && (
                        <p className="text-sm text-gray-500 mt-1">
                          IA encontrou: {aiResult.amount_found != null ? `R$ ${aiResult.amount_found?.toFixed(2)}` : 'N/A'}
                          {' • '}Confiança: {aiResult.confidence || 'N/A'}
                          {aiResult.details && ` • ${aiResult.details}`}
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

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle>{isAdmin ? 'Todos os Pagamentos' : 'Pagamentos'}</CardTitle>
            <CardDescription>
              {isAdmin ? 'Lista completa de pagamentos na plataforma' : 'Lista de pagamentos processados'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredPayments && filteredPayments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    {!isAdmin && <TableHead>Candidato</TableHead>}
                    {isAllAgenciesMode && <TableHead>Agência</TableHead>}
                    <TableHead>Contrato</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>{isAdmin ? 'Vencimento' : 'Data'}</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead>Comprovante</TableHead>}
                    {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment: any) => {
                    const companyName = isAdmin ? payment.companies?.company_name : payment.contract?.application?.job?.company?.company_name;
                    const contractNumber = isAdmin ? payment.contracts?.contract_number : payment.contract?.contract_number;
                    const candidateName = payment.contract?.application?.candidate?.full_name;
                    const dateField = isAdmin ? payment.due_date : payment.payment_date;
                    return (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{companyName || 'N/A'}</TableCell>
                        {!isAdmin && <TableCell>{candidateName || 'N/A'}</TableCell>}
                        {isAllAgenciesMode && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-slate-400" />
                              <span className="text-sm">{payment.agency?.name || 'N/A'}</span>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>{contractNumber || 'N/A'}</TableCell>
                        <TableCell>{getPaymentTypeBadge(payment.payment_type)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(payment.amount || 0)}</TableCell>
                        <TableCell>
                          {dateField ? new Date(dateField).toLocaleDateString('pt-BR') : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        {isAdmin && (
                          <TableCell>
                            {payment.receipt_url ? (
                              <button onClick={() => handleReviewReceipt(payment)} className="hover:opacity-80">
                                {getReceiptStatusBadge(payment.receipt_status)}
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </TableCell>
                        )}
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {(payment.status === 'pending' || payment.status === 'overdue') && (
                                <>
                                  <Button size="sm" variant="default" onClick={() => handleMarkPaid(payment.id)} disabled={updateStatusMutation.isPending}>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Pago
                                  </Button>
                                  {payment.status === 'pending' && (
                                    <Button size="sm" variant="destructive" onClick={() => handleMarkOverdue(payment.id)} disabled={updateStatusMutation.isPending}>
                                      <AlertCircle className="h-4 w-4 mr-1" />
                                      Atrasado
                                    </Button>
                                  )}
                                </>
                              )}
                              {payment.status === 'failed' && (
                                <Button size="sm" variant="default" onClick={() => handleMarkPaid(payment.id)} disabled={updateStatusMutation.isPending}>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Pago
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-20 h-24 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50 flex flex-col items-center justify-center gap-2 mb-6">
                  <DollarSign className="h-8 w-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-500 mb-1">
                  {searchTerm ? 'Nenhum pagamento encontrado' : 'Nenhum pagamento registrado'}
                </h3>
                <p className="text-gray-400 text-sm">
                  {searchTerm ? 'Tente ajustar os termos de busca' : 'Pagamentos aparecerão aqui quando forem processados'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Receipt Review Modal */}
        <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Revisão de Comprovante</DialogTitle>
              <DialogDescription>
                {selectedReceiptPayment?.companies?.company_name} • {formatCurrency(selectedReceiptPayment?.amount || 0)}
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
                  <p className="font-medium text-gray-700">Análise da IA:</p>
                  <p>Valor encontrado: {selectedReceiptPayment.ai_verification_result.amount_found != null ? `R$ ${selectedReceiptPayment.ai_verification_result.amount_found?.toFixed(2)}` : 'N/A'}</p>
                  <p>Valor esperado: {formatCurrency(selectedReceiptPayment?.amount || 0)}</p>
                  <p>Confiança: {selectedReceiptPayment.ai_verification_result.confidence || 'N/A'}</p>
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
              <Button variant="destructive" onClick={handleRejectReceipt} disabled={reviewReceiptMutation.isPending}>
                <ThumbsDown className="h-4 w-4 mr-1" />
                Rejeitar
              </Button>
              <Button onClick={handleApproveReceipt} disabled={reviewReceiptMutation.isPending}>
                <ThumbsUp className="h-4 w-4 mr-1" />
                Aprovar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
