import { useState } from "react";
import { useCompanyFunnel } from "@/contexts/CompanyFunnelContext";
import {
  FileText,
  User,
  CheckCircle,
  Clock,
  Send,
  Building2,
  GraduationCap,
  Users,
  Calendar,
  DollarSign,
  Loader2,
  Copy,
  Plus,
  ExternalLink,
  Mail,
} from "lucide-react";
import { CardEntrance } from "@/components/funnel";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DocumentSigningFlow from "@/components/DocumentSigningFlow";

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
  const [showSigningFlow, setShowSigningFlow] = useState(false);
  const [addingRole, setAddingRole] = useState<string | null>(null);
  const [newSignerName, setNewSignerName] = useState("");
  const [newSignerEmail, setNewSignerEmail] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const resendMutation = trpc.hiring.resendSigningInvitation.useMutation({
    onSuccess: () => toast.success("Lembrete enviado!"),
    onError: (err) => toast.error(err.message || "Erro ao enviar lembrete"),
  });

  const confirmAutentiqueMutation = trpc.hiring.confirmCompanyAutentiqueSign.useMutation({
    onSuccess: () => {
      toast.success("Assinatura confirmada!");
      onRefresh();
    },
    onError: (err) => toast.error(err.message || "Erro ao confirmar assinatura"),
  });

  const addMissingSignerMutation = trpc.hiring.addMissingSigner.useMutation({
    onSuccess: () => {
      toast.success("Convite criado e enviado!");
      setAddingRole(null);
      setNewSignerName("");
      setNewSignerEmail("");
      onRefresh();
    },
    onError: (err) => toast.error(err.message || "Erro ao criar convite"),
  });

  const handleAllDocsSigned = () => {
    confirmAutentiqueMutation.mutate({ hiringProcessId: hiringProcess.id });
  };

  const docCategory = hiringProcess.hiring_type === "menor-aprendiz" ? "menor_aprendiz" : hiringProcess.hiring_type;

  const signerConfigs = [
    { label: "Empresa", icon: Building2, signed: hiringProcess.company_signed, role: "company" },
    { label: "Candidato", icon: User, signed: hiringProcess.candidate_signed, role: "candidate" },
    { label: "Responsável", icon: Users, signed: hiringProcess.parent_signed, role: "parent_guardian" },
    { label: "Escola", icon: GraduationCap, signed: hiringProcess.school_signed, role: "educational_institution" },
  ];

  const signedCount = signerConfigs.filter((s) => s.signed).length;
  const totalSignatures = signerConfigs.length;
  const progressPercent = (signedCount / totalSignatures) * 100;

  const pendingInvitations = (hiringProcess.signing_invitations || []).filter(
    (inv: any) => !inv.signed_at
  );

  const handleResendAll = () => {
    pendingInvitations.forEach((inv: any) => {
      resendMutation.mutate({ invitationId: inv.id });
    });
  };

  const getInvitationForRole = (role: string) => {
    return (hiringProcess.signing_invitations || []).find(
      (inv: any) => inv.signer_role === role
    );
  };

  const getSigningUrl = (invitation: any) => {
    if (!invitation) return null;
    if (invitation.autentique_sign_url) return invitation.autentique_sign_url;
    if (invitation.token) return `${window.location.origin}/assinar/${invitation.token}`;
    return null;
  };

  const handleCopyLink = (url: string, invId: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(invId);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedId(null), 2000);
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

          {/* Toggle signing flow */}
          {!hiringProcess.company_signed && (
            <button
              onClick={() => setShowSigningFlow(!showSigningFlow)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0A2342] text-white font-medium text-sm hover:bg-[#0A2342]/90 transition-colors"
            >
              <FileText className="w-4 h-4" />
              {showSigningFlow ? "Ocultar Documentos" : "Assinar Documentos"}
            </button>
          )}
        </div>
      </div>

      {/* Signatures grid */}
      <div className="p-5">
        <div className="grid grid-cols-2 gap-2">
          {signerConfigs.map((sig, index) => {
            const Icon = sig.icon;
            const invitation = getInvitationForRole(sig.role);
            const signingUrl = getSigningUrl(invitation);
            const isShareable = sig.role === "parent_guardian" || sig.role === "educational_institution";
            const canAddSigner = isShareable && !invitation && !sig.signed;

            return (
              <div
                key={index}
                className={`flex flex-col p-3 rounded-lg border ${
                  sig.signed
                    ? "bg-green-50 border-green-200"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                {/* Top row: icon, label, status */}
                <div className="flex items-center gap-3">
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
                      ) : invitation?.email_sent_at ? (
                        invitation?.viewed_at ? (
                          <><Mail className="w-3 h-3" /> Visualizado</>
                        ) : (
                          <><Mail className="w-3 h-3" /> Email enviado</>
                        )
                      ) : invitation ? (
                        <><Clock className="w-3 h-3" /> Convite criado</>
                      ) : (
                        <><Clock className="w-3 h-3" /> Pendente</>
                      )}
                    </p>
                  </div>
                </div>

                {/* Sharing actions for Responsável / Escola */}
                {isShareable && !sig.signed && (
                  <div className="mt-2 pt-2 border-t border-slate-200/50">
                    {invitation && signingUrl ? (
                      <div className="space-y-1.5">
                        {invitation.signer_email && (
                          <p className="text-xs text-slate-500 truncate">
                            {invitation.signer_email}
                          </p>
                        )}
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleCopyLink(signingUrl, invitation.id)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                          >
                            {copiedId === invitation.id ? (
                              <><CheckCircle className="w-3 h-3 text-green-500" /> Copiado</>
                            ) : (
                              <><Copy className="w-3 h-3" /> Copiar link</>
                            )}
                          </button>
                          {invitation.autentique_sign_url && (
                            <button
                              onClick={() => window.open(signingUrl, "_blank")}
                              className="flex items-center justify-center px-2 py-1.5 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                              title="Abrir no Autentique"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ) : canAddSigner ? (
                      addingRole === sig.role ? (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            placeholder="Nome"
                            value={newSignerName}
                            onChange={(e) => setNewSignerName(e.target.value)}
                            className="w-full px-2 py-1 rounded border border-slate-200 text-xs text-[#0A2342] placeholder-slate-400"
                          />
                          <input
                            type="email"
                            placeholder="Email"
                            value={newSignerEmail}
                            onChange={(e) => setNewSignerEmail(e.target.value)}
                            className="w-full px-2 py-1 rounded border border-slate-200 text-xs text-[#0A2342] placeholder-slate-400"
                          />
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => {
                                if (!newSignerName.trim() || !newSignerEmail.trim()) {
                                  toast.error("Preencha nome e email");
                                  return;
                                }
                                addMissingSignerMutation.mutate({
                                  hiringProcessId: hiringProcess.id,
                                  signerRole: sig.role as "parent_guardian" | "educational_institution",
                                  signerName: newSignerName.trim(),
                                  signerEmail: newSignerEmail.trim(),
                                });
                              }}
                              disabled={addMissingSignerMutation.isPending}
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-[#0A2342] text-white text-xs font-medium hover:bg-[#0A2342]/90 disabled:opacity-50 transition-colors"
                            >
                              {addMissingSignerMutation.isPending ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                              Enviar
                            </button>
                            <button
                              onClick={() => {
                                setAddingRole(null);
                                setNewSignerName("");
                                setNewSignerEmail("");
                              }}
                              className="px-2 py-1.5 rounded-md border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setAddingRole(sig.role);
                            setNewSignerName("");
                            setNewSignerEmail("");
                          }}
                          className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-md border border-dashed border-slate-300 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:border-slate-400 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Adicionar {sig.role === "parent_guardian" ? "responsável" : "escola"}
                        </button>
                      )
                    ) : null}
                  </div>
                )}
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

      {/* Autentique Document Signing Flow */}
      {showSigningFlow && !hiringProcess.company_signed && (
        <div className="px-5 pb-5 border-t border-slate-100 pt-4">
          <DocumentSigningFlow
            category={docCategory}
            hiringProcessId={hiringProcess.id}
            onAllSigned={handleAllDocsSigned}
          />
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
