import { useState, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import ClassicLoader from "@/components/ui/ClassicLoader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { trpc } from "@/lib/trpc";
import {
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Copy,
  Upload,
  QrCode,
  ChevronDown,
  ChevronUp,
  Image,
  Loader2
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CompanyPayments() {
  const { user, loading: authLoading } = useAuth();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const { data: stats, isLoading: statsLoading } = trpc.company.getPaymentStats.useQuery(
    undefined,
    { enabled: !!user && user.role === 'company' }
  );

  const { data: overduePayments, isLoading: overdueLoading } = trpc.company.getPayments.useQuery(
    { filter: 'overdue' },
    { enabled: !!user && user.role === 'company' }
  );

  const { data: upcomingPayments, isLoading: upcomingLoading } = trpc.company.getPayments.useQuery(
    { filter: 'upcoming' },
    { enabled: !!user && user.role === 'company' }
  );

  const { data: paymentHistory, isLoading: historyLoading } = trpc.company.getPayments.useQuery(
    { filter: 'history' },
    { enabled: !!user && user.role === 'company' }
  );

  const uploadReceiptMutation = trpc.company.uploadPaymentReceipt.useMutation({
    onSuccess: () => {
      toast.success('Comprovante enviado! Estamos verificando...');
      setPaymentModalOpen(false);
      utils.company.getPayments.invalidate();
      utils.company.getPaymentStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao enviar comprovante');
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClassicLoader />
      </div>
    );
  }

  if (!user || user.role !== 'company') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Você precisa ser uma empresa para acessar esta página.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button>Voltar para Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleOpenPayment = (payment: any) => {
    setSelectedPayment(payment);
    setPaymentModalOpen(true);
  };

  const handleCopyPixKey = () => {
    navigator.clipboard.writeText('12.345.678/0001-90');
    toast.success('Chave PIX copiada!');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPayment) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      uploadReceiptMutation.mutate({
        paymentId: selectedPayment.id,
        fileName: file.name,
        fileData: base64,
        contentType: file.type,
      });
    };
    reader.readAsDataURL(file);

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatAmount = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  };

  const getReceiptStatusBadge = (payment: any) => {
    if (!payment.receipt_status) return null;
    switch (payment.receipt_status) {
      case 'pending-review':
        return <Badge className="bg-yellow-500">Em análise</Badge>;
      case 'verified':
        return <Badge className="bg-green-500">Verificado</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">Rejeitado</Badge>;
      default:
        return null;
    }
  };

  const getPaymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'monthly-fee': 'Mensalidade',
      'insurance-fee': 'Seguro Estágio',
      'setup-fee': 'Taxa Inicial',
      'penalty': 'Multa',
      'refund': 'Reembolso',
    };
    return labels[type] || type;
  };

  const isLoading = statsLoading || overdueLoading || upcomingLoading;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header - Centered */}
        <div className="text-center py-4">
          <h1 className="text-3xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-gray-500 mt-1">Gerencie seus pagamentos</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">A Pagar Este Mês</CardTitle>
              <Clock className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900">
                {isLoading ? '...' : `R$ ${(stats?.dueThisMonth || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              </div>
            </CardContent>
          </Card>

          <Card className={`${(stats?.overdue || 0) > 0 ? 'border-red-200 bg-red-50/50' : 'border-green-200 bg-green-50/50'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${(stats?.overdue || 0) > 0 ? 'text-red-700' : 'text-green-700'}`}>
                Vencido
              </CardTitle>
              <AlertTriangle className={`h-5 w-5 ${(stats?.overdue || 0) > 0 ? 'text-red-600' : 'text-green-600'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${(stats?.overdue || 0) > 0 ? 'text-red-900' : 'text-green-900'}`}>
                {isLoading ? '...' : `R$ ${(stats?.overdue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700">Total Pago (6 meses)</CardTitle>
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-900">
                {isLoading ? '...' : `R$ ${(stats?.paidLast6Months || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overdue Payments */}
        {overduePayments && overduePayments.length > 0 && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                Vencido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {overduePayments.map((payment: any) => (
                <div key={payment.id} className="border border-red-200 rounded-lg p-4 bg-red-50 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900">
                        {payment.contract?.candidate?.full_name} • {payment.billing_period || format(new Date(payment.due_date), 'MMM/yyyy', { locale: ptBR })}
                      </p>
                      <Badge variant="outline" className="text-xs">{getPaymentTypeLabel(payment.payment_type)}</Badge>
                      {getReceiptStatusBadge(payment)}
                    </div>
                    <p className="text-lg font-bold text-red-700">
                      R$ {formatAmount(payment.amount)}
                    </p>
                    <p className="text-sm text-red-600">
                      Venceu em: {format(new Date(payment.due_date), 'dd/MM/yyyy', { locale: ptBR })} ({Math.abs(differenceInDays(new Date(payment.due_date), new Date()))} dias atrás)
                    </p>
                  </div>
                  <Button onClick={() => handleOpenPayment(payment)}>
                    {payment.receipt_url ? 'Ver Detalhes' : 'Pagar'}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Upcoming Payments */}
        {upcomingLoading ? (
          <div className="text-center py-4"><ClassicLoader /></div>
        ) : upcomingPayments && upcomingPayments.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Próximos Vencimentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingPayments.map((payment: any) => (
                <div key={payment.id} className="border rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900">
                        {payment.contract?.candidate?.full_name} • {payment.billing_period || format(new Date(payment.due_date), 'MMM/yyyy', { locale: ptBR })}
                      </p>
                      <Badge variant="outline" className="text-xs">{getPaymentTypeLabel(payment.payment_type)}</Badge>
                    </div>
                    <p className="text-lg font-semibold text-gray-700">
                      R$ {formatAmount(payment.amount)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Vence em: {format(new Date(payment.due_date), 'dd/MM/yyyy', { locale: ptBR })} (em {differenceInDays(new Date(payment.due_date), new Date())} dias)
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => handleOpenPayment(payment)}>
                    Ver Detalhes
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-24 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50 flex flex-col items-center justify-center gap-2 mb-6">
              <DollarSign className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-500 mb-1">Nenhum pagamento pendente</h3>
            <p className="text-gray-400 text-sm">Seus próximos pagamentos aparecerão aqui</p>
          </div>
        )}

        {/* Payment History - Collapsible */}
        {historyLoading ? null : paymentHistory && paymentHistory.length > 0 && (
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardTitle className="text-lg">Histórico ({paymentHistory.length})</CardTitle>
                  {historyOpen ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="space-y-2">
                    {paymentHistory.map((payment: any) => (
                      <div key={payment.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-gray-700">
                            {payment.contract?.candidate?.full_name} • {payment.billing_period || format(new Date(payment.due_date), 'MMM/yyyy', { locale: ptBR })}
                          </span>
                          <Badge variant="outline" className="text-xs">{getPaymentTypeLabel(payment.payment_type)}</Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-medium">
                            R$ {formatAmount(payment.amount)}
                          </span>
                          <span className="text-sm text-gray-500">
                            Pago em {payment.paid_at && format(new Date(payment.paid_at), 'dd/MM', { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Payment Modal */}
        <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Pagamento</DialogTitle>
              <DialogDescription>
                {selectedPayment?.contract?.candidate?.full_name} • {selectedPayment?.billing_period || (selectedPayment?.due_date && format(new Date(selectedPayment.due_date), 'MMM/yyyy', { locale: ptBR }))}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">
                  R$ {selectedPayment?.amount ? formatAmount(selectedPayment.amount) : '0,00'}
                </p>
                <Badge variant="outline" className="mt-1">{selectedPayment?.payment_type && getPaymentTypeLabel(selectedPayment.payment_type)}</Badge>
              </div>

              <Separator />

              {/* PIX */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  PIX
                </h4>
                <div className="flex items-center gap-2">
                  <Input value="12.345.678/0001-90" readOnly className="bg-gray-50" />
                  <Button variant="outline" onClick={handleCopyPixKey}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-1">Chave CNPJ</p>
              </div>

              <Separator />

              {/* Receipt Upload */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Enviar Comprovante
                </h4>

                {/* Show existing receipt if uploaded */}
                {selectedPayment?.receipt_url && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Image className="h-5 w-5 text-gray-500" />
                    <span className="text-sm text-gray-600 flex-1">Comprovante enviado</span>
                    {getReceiptStatusBadge(selectedPayment)}
                  </div>
                )}

                {/* Upload area - show if no receipt or rejected */}
                {(!selectedPayment?.receipt_url || selectedPayment?.receipt_status === 'rejected') && (
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    {uploadReceiptMutation.isPending ? (
                      <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">Clique para enviar comprovante</span>
                        <span className="text-xs text-gray-400">PNG, JPG ou PDF (max 10MB)</span>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={handleFileSelect}
                      disabled={uploadReceiptMutation.isPending}
                    />
                  </label>
                )}

                {selectedPayment?.receipt_status === 'rejected' && (
                  <p className="text-sm text-red-600">Comprovante rejeitado. Envie um novo comprovante.</p>
                )}

                {selectedPayment?.receipt_status === 'pending-review' && (
                  <p className="text-sm text-yellow-600">Comprovante em análise. Aguarde a verificação.</p>
                )}

                {selectedPayment?.receipt_status === 'verified' && (
                  <p className="text-sm text-green-600">Comprovante verificado com sucesso.</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
