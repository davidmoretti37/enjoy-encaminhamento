import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import {
  DollarSign,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
  ChevronDown,
  ChevronUp,
  Receipt,
  Calendar,
  Copy,
  QrCode,
  Image,
  Loader2,
  X,
} from "lucide-react";
import { CardEntrance } from "@/components/funnel";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useRef } from "react";
import { toast } from "sonner";

export default function FinanceiroTab() {
  const [showHistory, setShowHistory] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const { data: payments = [], isLoading } = trpc.company.getPayments.useQuery(
    undefined,
    { staleTime: 30000 }
  );

  const { data: agencyPaymentInfo } = trpc.company.getAgencyPaymentInfo.useQuery(
    undefined,
    { staleTime: 60000 }
  );

  const uploadReceiptMutation = trpc.company.uploadPaymentReceipt.useMutation({
    onSuccess: () => {
      toast.success("Comprovante enviado! Estamos verificando...");
      setPaymentModalOpen(false);
      setSelectedPayment(null);
      utils.company.getPayments.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao enviar comprovante");
    },
  });

  // Separate payments by status
  const overdue = payments.filter((p: any) => p.status === "overdue");
  const upcoming = payments.filter((p: any) => p.status === "pending" || p.status === "pending_review");
  const history = payments.filter((p: any) => p.status === "paid" || p.status === "verified");

  // Calculate stats - "A Vencer" only shows current month
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const thisMonthDue = upcoming
    .filter((p: any) => {
      if (!p.due_date) return false;
      const due = new Date(p.due_date);
      return due >= currentMonthStart && due <= currentMonthEnd;
    })
    .reduce((acc: number, p: any) => acc + (p.amount || 0), 0);
  const totalOverdue = overdue.reduce((acc: number, p: any) => acc + (p.amount || 0), 0);
  const totalPaid = history.reduce((acc: number, p: any) => acc + (p.amount || 0), 0);

  const handleOpenPayment = (payment: any) => {
    setSelectedPayment(payment);
    setPaymentModalOpen(true);
  };

  const handleCopyPixKey = () => {
    if (agencyPaymentInfo?.pix_key) {
      navigator.clipboard.writeText(agencyPaymentInfo.pix_key);
      toast.success("Chave PIX copiada!");
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPayment) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Maximo 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadReceiptMutation.mutate({
        paymentId: selectedPayment.id,
        fileName: file.name,
        fileData: base64,
        contentType: file.type,
      });
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const pixKeyTypeLabel: Record<string, string> = {
    cpf: "Chave CPF",
    cnpj: "Chave CNPJ",
    email: "Chave E-mail",
    phone: "Chave Telefone",
    random: "Chave aleatoria",
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-4 animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-1/3 mb-2" />
            <div className="h-4 bg-slate-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardEntrance>
          <StatCard
            title="A Vencer"
            value={formatCurrency(thisMonthDue)}
            subtitle="Este mes"
            icon={<Clock className="w-5 h-5 text-amber-400" />}
            color="amber"
          />
        </CardEntrance>
        <CardEntrance delay={0.1}>
          <StatCard
            title="Em Atraso"
            value={formatCurrency(totalOverdue)}
            subtitle={`${overdue.length} pagamento(s)`}
            icon={<AlertCircle className="w-5 h-5 text-red-400" />}
            color="red"
          />
        </CardEntrance>
        <CardEntrance delay={0.2}>
          <StatCard
            title="Total Pago"
            value={formatCurrency(totalPaid)}
            subtitle="Ultimos 6 meses"
            icon={<CheckCircle className="w-5 h-5 text-green-400" />}
            color="green"
          />
        </CardEntrance>
      </div>

      {/* Overdue payments */}
      {overdue.length > 0 && (
        <CardEntrance delay={0.3}>
          <div className="bg-red-500/10 rounded-xl border border-red-500/20 overflow-hidden">
            <div className="p-4 border-b border-red-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-[#0A2342] font-semibold">Pagamentos em Atraso</h3>
                  <p className="text-red-400 text-sm">
                    {overdue.length} pagamento(s) precisam de atencao
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {overdue.map((payment: any) => (
                <PaymentCard key={payment.id} payment={payment} isOverdue onPay={() => handleOpenPayment(payment)} />
              ))}
            </div>
          </div>
        </CardEntrance>
      )}

      {/* Upcoming payments */}
      {upcoming.length > 0 && (
        <CardEntrance delay={overdue.length > 0 ? 0.4 : 0.3}>
          <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-[#0A2342] font-semibold">Proximos Pagamentos</h3>
                  <p className="text-slate-600 text-sm">
                    {upcoming.length} pagamento(s) a vencer
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {upcoming.map((payment: any) => (
                <PaymentCard key={payment.id} payment={payment} onPay={() => handleOpenPayment(payment)} />
              ))}
            </div>
          </div>
        </CardEntrance>
      )}

      {/* Payment history */}
      {history.length > 0 && (
        <CardEntrance delay={0.5}>
          <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-[#0A2342] font-semibold">Historico de Pagamentos</h3>
                  <p className="text-slate-600 text-sm">
                    {history.length} pagamento(s) realizados
                  </p>
                </div>
              </div>
              {showHistory ? (
                <ChevronUp className="w-5 h-5 text-slate-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-600" />
              )}
            </button>

            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-slate-200"
              >
                <div className="p-4 space-y-3">
                  {history.slice(0, 10).map((payment: any) => (
                    <PaymentCard key={payment.id} payment={payment} isPaid />
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </CardEntrance>
      )}

      {/* Empty state */}
      {payments.length === 0 && (
        <CardEntrance>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center mb-4">
              <DollarSign className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-medium text-[#0A2342] mb-2">Nenhum pagamento</h3>
            <p className="text-slate-600 max-w-sm">
              Os pagamentos aparecerao aqui quando houver contratos ativos
            </p>
          </div>
        </CardEntrance>
      )}

      {/* Payment Modal */}
      {paymentModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPaymentModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#0A2342]">Pagamento</h3>
                <button onClick={() => setPaymentModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Amount */}
              <div className="text-center py-2">
                <p className="text-3xl font-bold text-[#0A2342]">
                  {formatCurrency(selectedPayment.amount)}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {selectedPayment.notes || "Mensalidade"}
                </p>
                {selectedPayment.due_date && (
                  <p className="text-xs text-slate-400 mt-1">
                    Vencimento: {format(new Date(selectedPayment.due_date), "dd/MM/yyyy")}
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-slate-200" />

              {/* PIX Info */}
              {agencyPaymentInfo?.pix_key ? (
                <div>
                  <h4 className="font-semibold text-[#0A2342] mb-3 flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    PIX
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono">
                      {agencyPaymentInfo.pix_key}
                    </div>
                    <button
                      onClick={handleCopyPixKey}
                      className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <Copy className="h-4 w-4 text-slate-600" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {pixKeyTypeLabel[agencyPaymentInfo.pix_key_type || ""] || "Chave PIX"}
                  </p>

                  {agencyPaymentInfo.payment_instructions && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                      <p className="text-sm text-blue-800">{agencyPaymentInfo.payment_instructions}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-slate-500">Informacoes de pagamento nao configuradas pela agencia.</p>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-slate-200" />

              {/* Receipt Upload */}
              <div>
                <h4 className="font-semibold text-[#0A2342] mb-3 flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Enviar Comprovante
                </h4>

                {/* Show existing receipt */}
                {selectedPayment.receipt_url && (
                  <div className="space-y-3 mb-3">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <Image className="h-5 w-5 text-slate-500" />
                      <span className="text-sm text-slate-600 flex-1">Comprovante enviado</span>
                      {selectedPayment.receipt_status === "pending-review" && (
                        <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">Em analise</span>
                      )}
                      {selectedPayment.receipt_status === "verified" && (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Verificado</span>
                      )}
                      {selectedPayment.receipt_status === "rejected" && (
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">Rejeitado</span>
                      )}
                    </div>
                    {/* Receipt image preview */}
                    <div className="border rounded-lg overflow-hidden bg-slate-50">
                      <img
                        src={selectedPayment.receipt_url}
                        alt="Comprovante de pagamento"
                        className="w-full max-h-64 object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* Upload area */}
                {(!selectedPayment.receipt_url || selectedPayment.receipt_status === "rejected") && (
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    {uploadReceiptMutation.isPending ? (
                      <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-slate-400 mb-2" />
                        <span className="text-sm text-slate-500">Clique para enviar comprovante</span>
                        <span className="text-xs text-slate-400">PNG, JPG ou PDF (max 10MB)</span>
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

                {selectedPayment.receipt_status === "rejected" && (
                  <p className="text-sm text-red-500 mt-2">Comprovante rejeitado. Envie um novo.</p>
                )}
                {selectedPayment.receipt_status === "pending-review" && (
                  <p className="text-sm text-yellow-600 mt-2">Comprovante em analise. Aguarde a verificacao.</p>
                )}
                {selectedPayment.receipt_status === "verified" && (
                  <p className="text-sm text-green-600 mt-2">Comprovante verificado com sucesso!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: "amber" | "red" | "green";
}

function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  const colorClasses = {
    amber: "from-amber-500/10 to-orange-500/10 border-amber-500/20",
    red: "from-red-500/10 to-rose-500/10 border-red-500/20",
    green: "from-green-500/10 to-emerald-500/10 border-green-500/20",
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl border p-4`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-white/60 flex items-center justify-center">
          {icon}
        </div>
        <span className="text-slate-600 text-sm font-medium">{title}</span>
      </div>
      <div className="text-2xl font-bold text-[#0A2342]">{value}</div>
      <p className="text-slate-600 text-sm mt-0.5">{subtitle}</p>
    </div>
  );
}

interface PaymentCardProps {
  payment: any;
  isOverdue?: boolean;
  isPaid?: boolean;
  onPay?: () => void;
}

function PaymentCard({ payment, isOverdue, isPaid, onPay }: PaymentCardProps) {
  const dueDate = payment.due_date ? new Date(payment.due_date) : null;
  const paidAt = payment.paid_at ? new Date(payment.paid_at) : null;

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${
      isOverdue
        ? "bg-red-500/10 border border-red-500/20"
        : isPaid
        ? "bg-green-500/10 border border-green-500/20"
        : "bg-white border-2 border-slate-200"
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          isOverdue
            ? "bg-red-500/20"
            : isPaid
            ? "bg-green-500/20"
            : "bg-amber-500/20"
        }`}>
          {isPaid ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : (
            <Receipt className={`w-5 h-5 ${isOverdue ? "text-red-400" : "text-amber-400"}`} />
          )}
        </div>
        <div>
          <p className="text-[#0A2342] font-medium">{payment.notes || "Mensalidade"}</p>
          <p className="text-slate-600 text-sm flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {isPaid && paidAt
              ? `Pago em ${format(paidAt, "dd/MM/yyyy")}`
              : dueDate
              ? `Vence em ${format(dueDate, "dd/MM/yyyy")}`
              : "Data nao definida"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className={`text-lg font-bold ${
          isOverdue ? "text-red-400" : isPaid ? "text-green-400" : "text-[#0A2342]"
        }`}>
          {formatCurrency(payment.amount)}
        </span>

        {!isPaid && onPay && (
          <button
            onClick={onPay}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#1B4D7A] to-[#FF6B35] text-white font-medium text-sm shadow-lg shadow-[#FF6B35]/25 hover:shadow-[#FF6B35]/40 transition-all"
          >
            <CreditCard className="w-4 h-4" />
            {payment.receipt_url ? "Ver" : "Pagar"}
          </button>
        )}
      </div>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}
