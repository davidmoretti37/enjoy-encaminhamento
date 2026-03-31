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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  Pencil,
  Plus,
  Trash2,
  Upload,
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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [editForm, setEditForm] = useState({ amount: '', due_date: '', billing_period: '', payment_type: '', status: '', notes: '', job_id: '' });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createCompanyId, setCreateCompanyId] = useState<string>('');
  const [createForm, setCreateForm] = useState({ amount: '', due_date: '', billing_period: '', payment_type: 'monthly-fee', status: 'pending', notes: '', job_id: '' });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState<any>(null);
  const [activeVagaTabs, setActiveVagaTabs] = useState<Record<string, string>>({});

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

  // Per-company grouped data (server-side for both admin and agency)
  const agencyGroupedQuery = trpc.agency.getPaymentsGroupedByCompany.useQuery(undefined, {
    enabled: isAgency,
  });
  const affiliateGroupedQuery = trpc.affiliate.getPaymentsGroupedByCompany.useQuery(
    { agencyId: currentAgency?.id ?? null },
    { enabled: isAffiliate }
  );
  const groupedPaymentsQuery = isAgency ? agencyGroupedQuery : affiliateGroupedQuery;

  // For affiliate commission card
  const affiliateQuery = trpc.affiliate.getByUserId.useQuery(undefined, { enabled: isAffiliate });

  // Pending review receipts (admin + agency)
  const pendingReviewQuery = trpc.admin.getPaymentsPendingReview.useQuery(undefined, {
    enabled: isAdmin || isAgency,
  });

  // Jobs for the selected company (used in create payment modal)
  const companyJobsQuery = trpc.job.getByCompanyId.useQuery(
    { companyId: createCompanyId },
    { enabled: !!createCompanyId }
  );

  // Select the right data based on role
  const payments = isAffiliate ? affiliatePaymentsQuery.data : agencyPaymentsQuery.data;
  const refetchPayments = isAffiliate ? affiliatePaymentsQuery.refetch : agencyPaymentsQuery.refetch;
  const paymentsLoading = affiliatePaymentsQuery.isLoading || agencyPaymentsQuery.isLoading || groupedPaymentsQuery.isLoading;
  const affiliate = affiliateQuery.data;
  const pendingReviews = pendingReviewQuery.data || [];

  // Group payments by company (server-side for both admin and agency)
  const companyGroups = groupedPaymentsQuery.data || [];

  // Upload receipt mutation
  const uploadReceiptMutation = trpc.admin.uploadPaymentReceipt.useMutation({
    onSuccess: () => {
      toast.success('Comprovante enviado!');
      refetchPayments();
      groupedPaymentsQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao enviar comprovante');
    },
  });

  // Mutations (admin only - for receipt review)
  const reviewReceiptMutation = trpc.admin.reviewPaymentReceipt.useMutation({
    onSuccess: (_, variables) => {
      toast.success(variables.action === 'approve' ? 'Comprovante aprovado!' : 'Comprovante rejeitado');
      pendingReviewQuery.refetch();
      refetchPayments();
      groupedPaymentsQuery.refetch();
      setReceiptModalOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao revisar comprovante');
    },
  });

  const updatePaymentMutation = trpc.admin.updatePaymentDetails.useMutation({
    onSuccess: () => {
      toast.success('Pagamento atualizado!');
      refetchPayments();
      groupedPaymentsQuery.refetch();
      setEditModalOpen(false);
      setEditingPayment(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao atualizar pagamento');
    },
  });

  const createPaymentMutation = trpc.admin.createManualPayment.useMutation({
    onSuccess: () => {
      toast.success('Pagamento criado!');
      refetchPayments();
      groupedPaymentsQuery.refetch();
      setCreateModalOpen(false);
      setCreateForm({ amount: '', due_date: '', billing_period: '', payment_type: 'monthly-fee', status: 'pending', notes: '', job_id: '' });
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao criar pagamento');
    },
  });

  const deletePaymentMutation = trpc.admin.deletePayment.useMutation({
    onSuccess: () => {
      toast.success('Pagamento excluido!');
      refetchPayments();
      groupedPaymentsQuery.refetch();
      setDeleteModalOpen(false);
      setDeletingPayment(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao excluir pagamento');
    },
  });

  if (!authLoading && (!user || !['admin', 'agency'].includes(user.role as string))) {
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

  const handleEditPayment = (payment: any) => {
    setEditingPayment(payment);
    // Also set createCompanyId so the job query fetches this company's jobs
    const companyId = payment.companies?.id || payment.company_id || '';
    setCreateCompanyId(companyId);
    setEditForm({
      amount: payment.amount ? String(payment.amount / 100) : '',
      due_date: payment.due_date ? payment.due_date.split('T')[0] : '',
      billing_period: payment.billing_period || '',
      payment_type: payment.payment_type || '',
      status: payment.status || '',
      notes: payment.notes || '',
      job_id: payment.job?.id || payment.job_id || '',
    });
    setEditModalOpen(true);
  };

  const handleSavePayment = () => {
    if (!editingPayment) return;
    updatePaymentMutation.mutate({
      paymentId: editingPayment.id,
      amount: editForm.amount ? Math.round(parseFloat(editForm.amount) * 100) : undefined,
      due_date: editForm.due_date || undefined,
      billing_period: editForm.billing_period || undefined,
      payment_type: editForm.payment_type as any || undefined,
      status: editForm.status as any || undefined,
      notes: editForm.notes || undefined,
      job_id: editForm.job_id || null,
    });
  };

  const handleCreatePayment = (companyId: string) => {
    setCreateCompanyId(companyId);
    setCreateForm({ amount: '', due_date: '', billing_period: '', payment_type: 'monthly-fee', status: 'pending', notes: '', job_id: '' });
    setCreateModalOpen(true);
  };

  const handleSaveNewPayment = () => {
    if (!createForm.amount || !createForm.due_date) {
      toast.error('Preencha valor e data de vencimento');
      return;
    }
    createPaymentMutation.mutate({
      company_id: createCompanyId,
      job_id: createForm.job_id || undefined,
      amount: Math.round(parseFloat(createForm.amount) * 100),
      due_date: new Date(createForm.due_date).toISOString(),
      billing_period: createForm.billing_period || undefined,
      payment_type: createForm.payment_type as any,
      status: createForm.status as any,
      notes: createForm.notes || undefined,
    });
  };

  const handleDeletePayment = (payment: any) => {
    setDeletingPayment(payment);
    setDeleteModalOpen(true);
  };

  const confirmDeletePayment = () => {
    if (!deletingPayment) return;
    deletePaymentMutation.mutate({ paymentId: deletingPayment.id });
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

                      {isExpanded && (() => {
                        // Group payments by vaga (job) - prefer direct job relation, fallback to contract's job
                        const vagaMap: Record<string, { id: string; title: string; payments: any[] }> = {};
                        for (const p of group.payments) {
                          const jobId = p.job?.id || p.contracts?.job?.id || 'general';
                          const jobTitle = p.job?.title || p.contracts?.job?.title || 'Geral';
                          if (!vagaMap[jobId]) vagaMap[jobId] = { id: jobId, title: jobTitle, payments: [] };
                          vagaMap[jobId].payments.push(p);
                        }

                        // Build tabs from the company's actual jobs (not just from payment data)
                        const companyJobs: { id: string; title: string }[] = (group as any).jobs || [];
                        const allVagas: { id: string; title: string }[] = [];
                        for (const job of companyJobs) {
                          allVagas.push({ id: job.id, title: job.title });
                        }
                        // Add 'Geral' if there are unlinked payments
                        if (vagaMap['general']) {
                          allVagas.push({ id: 'general', title: 'Geral' });
                        }

                        const hasMultipleVagas = allVagas.length > 1;
                        const activeTab = activeVagaTabs[group.companyId] || 'all';
                        const filteredPayments = activeTab === 'all'
                          ? group.payments
                          : vagaMap[activeTab]?.payments || [];

                        return (
                          <div className="border-t">
                            {/* Vaga tabs + Add button */}
                            <div className="flex items-center justify-between px-4 pt-3 pb-1">
                              {hasMultipleVagas ? (
                                <div className="flex items-center gap-1 flex-wrap">
                                  <button
                                    onClick={() => setActiveVagaTabs(prev => ({ ...prev, [group.companyId]: 'all' }))}
                                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                                      activeTab === 'all'
                                        ? 'bg-[#0A2342] text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                  >
                                    Todos
                                  </button>
                                  {allVagas.map(v => (
                                    <button
                                      key={v.id}
                                      onClick={() => setActiveVagaTabs(prev => ({ ...prev, [group.companyId]: v.id }))}
                                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                                        activeTab === v.id
                                          ? 'bg-[#0A2342] text-white'
                                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                      }`}
                                    >
                                      {v.title}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <div />
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleCreatePayment(group.companyId); }}
                                className="shrink-0"
                              >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                Novo
                              </Button>
                            </div>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Tipo</TableHead>
                                  <TableHead>Valor</TableHead>
                                  <TableHead>Vencimento</TableHead>
                                  <TableHead>Periodo</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Comprovante</TableHead>
                                  <TableHead className="w-[80px]"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredPayments.map((payment: any) => (
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
                                        <label className="cursor-pointer inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
                                          <Upload className="h-3 w-3" />
                                          Enviar
                                          <input
                                            type="file"
                                            accept="image/*,.pdf"
                                            className="hidden"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (!file) return;
                                              const reader = new FileReader();
                                              reader.onload = () => {
                                                const base64 = (reader.result as string).split(',')[1];
                                                uploadReceiptMutation.mutate({
                                                  paymentId: payment.id,
                                                  companyId: payment.company_id,
                                                  fileName: file.name,
                                                  fileData: base64,
                                                  contentType: file.type,
                                                });
                                              };
                                              reader.readAsDataURL(file);
                                              e.target.value = '';
                                            }}
                                          />
                                        </label>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-0.5">
                                        <Button variant="ghost" size="sm" onClick={() => handleEditPayment(payment)}>
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleDeletePayment(payment)} className="text-red-500 hover:text-red-700">
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        );
                      })()}
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

        {/* Edit Payment Modal */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Editar Pagamento</DialogTitle>
              <DialogDescription>
                Altere os detalhes do pagamento
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {companyJobsQuery.data && companyJobsQuery.data.length > 0 && (
                <div className="grid gap-2">
                  <Label>Vaga</Label>
                  <Select
                    value={editForm.job_id}
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, job_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a vaga" />
                    </SelectTrigger>
                    <SelectContent>
                      {companyJobsQuery.data.map((job: any) => (
                        <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editForm.amount}
                    onChange={(e) => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="paid">Pago</SelectItem>
                      <SelectItem value="overdue">Atrasado</SelectItem>
                      <SelectItem value="refunded">Reembolsado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Data de Vencimento</Label>
                  <Input
                    type="date"
                    value={editForm.due_date}
                    onChange={(e) => setEditForm(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Periodo</Label>
                  <Input
                    value={editForm.billing_period}
                    onChange={(e) => setEditForm(prev => ({ ...prev, billing_period: e.target.value }))}
                    placeholder="2026-03"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Select
                  value={editForm.payment_type}
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, payment_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly-fee">Mensalidade</SelectItem>
                    <SelectItem value="insurance-fee">Seguro</SelectItem>
                    <SelectItem value="setup-fee">Taxa de Setup</SelectItem>
                    <SelectItem value="penalty">Multa</SelectItem>
                    <SelectItem value="refund">Reembolso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Observacoes</Label>
                <Textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Observacoes sobre o pagamento..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSavePayment} disabled={updatePaymentMutation.isPending}>
                {updatePaymentMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Payment Modal */}
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Novo Pagamento</DialogTitle>
              <DialogDescription>
                Crie um novo pagamento para esta empresa
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {companyJobsQuery.data && companyJobsQuery.data.length > 0 && (
                <div className="grid gap-2">
                  <Label>Vaga</Label>
                  <Select
                    value={createForm.job_id}
                    onValueChange={(value) => setCreateForm(prev => ({ ...prev, job_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a vaga" />
                    </SelectTrigger>
                    <SelectContent>
                      {companyJobsQuery.data.map((job: any) => (
                        <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Valor (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={createForm.amount}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select
                    value={createForm.status}
                    onValueChange={(value) => setCreateForm(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="paid">Pago</SelectItem>
                      <SelectItem value="overdue">Atrasado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Data de Vencimento *</Label>
                  <Input
                    type="date"
                    value={createForm.due_date}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Periodo</Label>
                  <Input
                    value={createForm.billing_period}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, billing_period: e.target.value }))}
                    placeholder="2026-03"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Select
                  value={createForm.payment_type}
                  onValueChange={(value) => setCreateForm(prev => ({ ...prev, payment_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly-fee">Mensalidade</SelectItem>
                    <SelectItem value="insurance-fee">Seguro</SelectItem>
                    <SelectItem value="setup-fee">Taxa de Setup</SelectItem>
                    <SelectItem value="penalty">Multa</SelectItem>
                    <SelectItem value="refund">Reembolso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Observacoes</Label>
                <Textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Observacoes sobre o pagamento..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveNewPayment} disabled={createPaymentMutation.isPending}>
                {createPaymentMutation.isPending ? 'Criando...' : 'Criar Pagamento'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Excluir Pagamento</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir este pagamento?
              </DialogDescription>
            </DialogHeader>
            {deletingPayment && (
              <div className="py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Valor:</span>
                  <span className="font-semibold">{formatCurrency(deletingPayment.amount || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Vencimento:</span>
                  <span>{deletingPayment.due_date ? new Date(deletingPayment.due_date).toLocaleDateString('pt-BR') : '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  {getStatusBadge(deletingPayment.status)}
                </div>
                <p className="text-sm text-red-600 mt-3">Esta acao nao pode ser desfeita.</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={confirmDeletePayment} disabled={deletePaymentMutation.isPending}>
                {deletePaymentMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </ContentTransition>
    </DashboardLayout>
  );
}
