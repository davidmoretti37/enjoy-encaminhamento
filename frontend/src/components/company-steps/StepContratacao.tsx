import { useState } from "react";
import { useCompanyFunnel } from "@/contexts/CompanyFunnelContext";
import {
  FileText,
  User,
  CheckCircle,
  Clock,
  PenTool,
  Send,
  Building2,
  GraduationCap,
  Users,
  Calendar,
  DollarSign,
  Loader2,
  X,
  ExternalLink,
} from "lucide-react";
import { CardEntrance } from "@/components/funnel";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import SignaturePad from "@/components/SignaturePad";

export default function StepContratacao() {
  const { selectedJob, selectedJobId, hiringProcesses, refreshData } = useCompanyFunnel();

  // Filter hiring processes for selected job (pending_signatures OR pending_payment)
  const jobHiringProcesses = hiringProcesses.filter(
    (hp: any) =>
      hp.job?.id === selectedJobId &&
      (hp.status === "pending_signatures" || hp.status === "pending_payment")
  );

  if (!selectedJob) {
    return <EmptyState title="Nenhuma vaga selecionada" description="Selecione uma vaga" />;
  }

  if (jobHiringProcesses.length === 0) {
    return (
      <CardEntrance>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-[#0A2342] mb-2">Nenhum contrato pendente</h3>
          <p className="text-slate-500 max-w-sm">
            Após a entrevista, selecione candidatos para iniciar o processo de contratação
          </p>
        </div>
      </CardEntrance>
    );
  }

  const estagioCount = jobHiringProcesses.filter((hp: any) => hp.hiring_type === "estagio").length;
  const cltCount = jobHiringProcesses.filter((hp: any) => hp.hiring_type !== "estagio").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <CardEntrance>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#0A2342]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#0A2342]">
                Contratos Pendentes
              </h2>
              <p className="text-slate-500 text-sm">
                <span className="text-[#0A2342] font-medium">{jobHiringProcesses.length}</span>
                {" "}contrato{jobHiringProcesses.length !== 1 ? "s" : ""} pendente{jobHiringProcesses.length !== 1 ? "s" : ""}
                {estagioCount > 0 && cltCount > 0 && (
                  <span className="text-slate-400">
                    {" "}({estagioCount} estágio, {cltCount} CLT)
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </CardEntrance>

      {/* Hiring processes */}
      <div className="space-y-4">
        {jobHiringProcesses.map((process: any, index: number) => (
          <CardEntrance key={process.id} delay={index * 0.05}>
            {process.hiring_type === "estagio" ? (
              <EstagioContractCard hiringProcess={process} onRefresh={refreshData} />
            ) : (
              <CLTPaymentCard hiringProcess={process} onRefresh={refreshData} />
            )}
          </CardEntrance>
        ))}
      </div>
    </div>
  );
}

// ============================================
// ESTÁGIO CONTRACT CARD (4-party signing)
// ============================================

function EstagioContractCard({ hiringProcess, onRefresh }: { hiringProcess: any; onRefresh: () => void }) {
  const candidate = hiringProcess.candidate;
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerCpf, setSignerCpf] = useState("");
  const [signature, setSignature] = useState("");

  // Fetch contract documents from agency
  const docCategory = hiringProcess.hiring_type === "menor-aprendiz" ? "menor_aprendiz" : hiringProcess.hiring_type;
  const { data: contractDocs } = trpc.company.getContractDocuments.useQuery(
    { category: docCategory },
    { enabled: showSignDialog }
  );

  const signMutation = trpc.hiring.signAsCompany.useMutation({
    onSuccess: () => {
      toast.success("Assinatura registrada!");
      setShowSignDialog(false);
      setSignerName("");
      setSignerCpf("");
      setSignature("");
      onRefresh();
    },
    onError: (err) => toast.error(err.message || "Erro ao assinar"),
  });

  const resendMutation = trpc.hiring.resendSigningInvitation.useMutation({
    onSuccess: () => toast.success("Lembrete enviado!"),
    onError: (err) => toast.error(err.message || "Erro ao enviar lembrete"),
  });

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const handleSign = () => {
    if (!signature) {
      toast.error("Assine o documento");
      return;
    }
    if (!signerName.trim()) {
      toast.error("Preencha seu nome");
      return;
    }
    const cpfDigits = signerCpf.replace(/\D/g, "");
    if (cpfDigits.length !== 11) {
      toast.error("CPF deve ter 11 dígitos");
      return;
    }
    signMutation.mutate({
      hiringProcessId: hiringProcess.id,
      signerName: signerName.trim(),
      signerCpf: cpfDigits,
      signature,
    });
  };

  const signatures = [
    { label: "Empresa", icon: Building2, signed: hiringProcess.company_signed },
    { label: "Candidato", icon: User, signed: hiringProcess.candidate_signed },
    { label: "Responsável", icon: Users, signed: hiringProcess.parent_signed },
    { label: "Escola", icon: GraduationCap, signed: hiringProcess.school_signed },
  ];

  const signedCount = signatures.filter((s) => s.signed).length;
  const totalSignatures = signatures.length;
  const progressPercent = (signedCount / totalSignatures) * 100;

  const pendingInvitations = (hiringProcess.signing_invitations || []).filter(
    (inv: any) => !inv.signed_at
  );

  const handleResendAll = () => {
    pendingInvitations.forEach((inv: any) => {
      resendMutation.mutate({ invitationId: inv.id });
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 bg-slate-100">
        <div
          className="h-full bg-[#0A2342] transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Header */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#0A2342] flex items-center justify-center">
              {candidate?.photo_url ? (
                <img
                  src={candidate.photo_url}
                  alt={candidate.full_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-semibold text-lg">
                  {candidate?.full_name?.charAt(0) || "?"}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-[#0A2342] font-semibold">
                {candidate?.full_name || "Candidato"}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                  Estágio
                </span>
                {hiringProcess.start_date && (
                  <span className="text-slate-500 text-xs flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Início: {format(new Date(hiringProcess.start_date), "dd/MM/yyyy")}
                  </span>
                )}
                <span className="text-slate-400 text-xs">
                  {signedCount}/{totalSignatures} assinaturas
                </span>
              </div>
            </div>
          </div>

          {/* Sign button */}
          {!hiringProcess.company_signed && (
            <button
              onClick={() => setShowSignDialog(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0A2342] text-white font-medium text-sm hover:bg-[#0A2342]/90 transition-colors"
            >
              <PenTool className="w-4 h-4" />
              Assinar Contrato
            </button>
          )}
        </div>
      </div>

      {/* Signatures grid */}
      <div className="p-5">
        <div className="grid grid-cols-2 gap-2">
          {signatures.map((sig, index) => {
            const Icon = sig.icon;
            return (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  sig.signed
                    ? "bg-green-50 border-green-200"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  sig.signed ? "bg-green-100" : "bg-slate-100"
                }`}>
                  <Icon className={`w-4 h-4 ${sig.signed ? "text-green-600" : "text-slate-400"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0A2342]">{sig.label}</p>
                  <p className={`text-xs flex items-center gap-1 ${
                    sig.signed ? "text-green-600" : "text-slate-400"
                  }`}>
                    {sig.signed ? (
                      <><CheckCircle className="w-3 h-3" /> Assinado</>
                    ) : (
                      <><Clock className="w-3 h-3" /> Pendente</>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Remind button */}
      {signedCount > 0 && signedCount < totalSignatures && pendingInvitations.length > 0 && (
        <div className="px-5 pb-4">
          <button
            onClick={handleResendAll}
            disabled={resendMutation.isPending}
            className="text-sm text-slate-500 hover:text-[#0A2342] font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {resendMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Lembrar partes pendentes ({pendingInvitations.length})
          </button>
        </div>
      )}

      {/* Signing Dialog */}
      {showSignDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-[#0A2342]">Assinar Contrato de Estágio</h3>
              <button
                onClick={() => setShowSignDialog(false)}
                className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-sm text-slate-600">
                  Candidato: <strong>{candidate?.full_name}</strong>
                </p>
                <p className="text-sm text-slate-500">
                  Início: {hiringProcess.start_date && format(new Date(hiringProcess.start_date), "dd/MM/yyyy")}
                </p>
              </div>

              {/* Contract document(s) from agency */}
              {contractDocs && contractDocs.length > 0 && (
                <div className="space-y-3">
                  {contractDocs.map((doc: any) => (
                    <div key={doc.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-[#0A2342]">{doc.name || "Contrato"}</span>
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-slate-500 hover:text-[#0A2342]"
                        >
                          Abrir <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                        <iframe
                          src={`${doc.file_url}#toolbar=0&navpanes=0&scrollbar=1`}
                          className="w-full h-[500px] border-0"
                          title={doc.name || "Contrato"}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#0A2342] mb-1">
                  Nome do assinante
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342]/20 focus:border-[#0A2342]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0A2342] mb-1">
                  CPF do assinante
                </label>
                <input
                  type="text"
                  value={signerCpf}
                  onChange={(e) => setSignerCpf(formatCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342]/20 focus:border-[#0A2342]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0A2342] mb-1">
                  Assinatura
                </label>
                <SignaturePad onSave={setSignature} />
              </div>

              <button
                onClick={handleSign}
                disabled={signMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0A2342] text-white font-medium text-sm hover:bg-[#0A2342]/90 transition-colors disabled:opacity-60"
              >
                {signMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PenTool className="w-4 h-4" />
                )}
                {signMutation.isPending ? "Assinando..." : "Confirmar Assinatura"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// CLT PAYMENT CARD (no signatures, just payment)
// ============================================

function CLTPaymentCard({ hiringProcess, onRefresh }: { hiringProcess: any; onRefresh: () => void }) {
  const candidate = hiringProcess.candidate;
  const feeReais = (hiringProcess.calculated_fee / 100).toFixed(2).replace(".", ",");
  const isPendingPayment = hiringProcess.status === "pending_payment" || hiringProcess.status === "pending_signatures";

  const confirmMutation = trpc.hiring.confirmCLTPayment.useMutation({
    onSuccess: () => {
      toast.success("Pagamento confirmado! Contratação ativada.");
      onRefresh();
    },
    onError: (err) => toast.error(err.message || "Erro ao confirmar pagamento"),
  });

  // Calculate 30-day follow-up date
  const startDate = hiringProcess.start_date ? new Date(hiringProcess.start_date) : null;
  const followUpDate = startDate ? new Date(startDate) : null;
  if (followUpDate) followUpDate.setDate(followUpDate.getDate() + 30);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#0A2342] flex items-center justify-center">
              {candidate?.photo_url ? (
                <img
                  src={candidate.photo_url}
                  alt={candidate.full_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-semibold text-lg">
                  {candidate?.full_name?.charAt(0) || "?"}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-[#0A2342] font-semibold">
                {candidate?.full_name || "Candidato"}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                  CLT
                </span>
                {hiringProcess.start_date && (
                  <span className="text-slate-500 text-xs flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Início: {format(new Date(hiringProcess.start_date), "dd/MM/yyyy")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment info */}
      <div className="p-5">
        <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[#FF6B35]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#0A2342]">Taxa de encaminhamento</p>
              <p className="text-xs text-slate-500">Pagamento único — 50% do salário</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200">
            <span className="text-xl font-bold text-[#0A2342]">R$ {feeReais}</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              isPendingPayment
                ? "bg-amber-100 text-amber-700"
                : "bg-green-100 text-green-700"
            }`}>
              {isPendingPayment ? "Pendente" : "Pago"}
            </span>
          </div>

          {followUpDate && (
            <p className="mt-3 text-xs text-slate-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Acompanhamento em {format(followUpDate, "dd/MM/yyyy")}
            </p>
          )}
        </div>

        {/* Confirm payment button */}
        {isPendingPayment && (
          <button
            onClick={() => confirmMutation.mutate({ hiringProcessId: hiringProcess.id })}
            disabled={confirmMutation.isPending}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#FF6B35] text-white font-medium text-sm hover:bg-[#FF6B35]/90 transition-colors disabled:opacity-60"
          >
            {confirmMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {confirmMutation.isPending ? "Confirmando..." : "Confirmar Pagamento"}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// EMPTY STATE
// ============================================

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center mb-4">
        <FileText className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-medium text-[#0A2342] mb-2">{title}</h3>
      <p className="text-slate-500 max-w-sm">{description}</p>
    </div>
  );
}
