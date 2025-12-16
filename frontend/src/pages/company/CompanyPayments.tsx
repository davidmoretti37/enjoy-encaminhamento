import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import ClassicLoader from "@/components/ui/ClassicLoader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import {
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Copy,
  FileText,
  QrCode
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CompanyPayments() {
  const { user, loading: authLoading } = useAuth();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

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

  const confirmPaymentMutation = trpc.company.confirmPaymentMade.useMutation({
    onSuccess: () => {
      toast.success('Pagamento informado! Nossa equipe irá confirmar.');
      setPaymentModalOpen(false);
      utils.company.getPayments.invalidate();
      utils.company.getPaymentStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao informar pagamento');
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

  const handleConfirmPayment = () => {
    if (selectedPayment) {
      confirmPaymentMutation.mutate({ paymentId: selectedPayment.id });
    }
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
                    <p className="font-medium text-gray-900">
                      {payment.contract?.candidate?.full_name} • {payment.period || format(new Date(payment.due_date), 'MMM/yyyy', { locale: ptBR })}
                    </p>
                    <p className="text-lg font-bold text-red-700">
                      R$ {payment.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-red-600">
                      Venceu em: {format(new Date(payment.due_date), 'dd/MM/yyyy', { locale: ptBR })} ({Math.abs(differenceInDays(new Date(payment.due_date), new Date()))} dias atrás)
                    </p>
                  </div>
                  <Button onClick={() => handleOpenPayment(payment)}>
                    Pagar
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
                    <p className="font-medium text-gray-900">
                      {payment.contract?.candidate?.full_name} • {payment.period || format(new Date(payment.due_date), 'MMM/yyyy', { locale: ptBR })}
                    </p>
                    <p className="text-lg font-semibold text-gray-700">
                      R$ {payment.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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

        {/* Payment History */}
        {historyLoading ? null : paymentHistory && paymentHistory.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {paymentHistory.slice(0, 10).map((payment: any) => (
                  <div key={payment.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-gray-700">
                        {payment.contract?.candidate?.full_name} • {payment.period || format(new Date(payment.due_date), 'MMM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-medium">
                        R$ {payment.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-sm text-gray-500">
                        Pago em {payment.paid_at && format(new Date(payment.paid_at), 'dd/MM', { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Modal */}
        <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Pagamento</DialogTitle>
              <DialogDescription>
                {selectedPayment?.contract?.candidate?.full_name} • {selectedPayment?.period || (selectedPayment?.due_date && format(new Date(selectedPayment.due_date), 'MMM/yyyy', { locale: ptBR }))}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">
                  R$ {selectedPayment?.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
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

              {/* Boleto */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Boleto
                </h4>
                <Button variant="outline" className="w-full">
                  Gerar Boleto
                </Button>
              </div>

              <Separator />

              {/* Confirm Payment */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Já pagou?</p>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleConfirmPayment}
                  disabled={confirmPaymentMutation.isPending}
                >
                  {confirmPaymentMutation.isPending ? 'Informando...' : 'Informar Pagamento'}
                </Button>
                <p className="text-xs text-gray-500 mt-1">
                  (Nossa equipe irá confirmar)
                </p>
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
